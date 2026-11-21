/**
 * Design experiment backend: a Cloudflare Worker with a D1 database (both free tier).
 *
 *   POST /events        a batch of anonymous events from the site (sendBeacon, text/plain)
 *   GET  /weights.json  the current traffic split, with the kill switch applied immediately
 *   GET  /results       per-design numbers and the weight history for the /experiments page
 *   cron (daily)        one bandit update, then deletes raw events older than the window
 *
 * Privacy: no cookies, nothing about the visitor is read from the request (not the IP, not the
 * user agent, not the headers beyond Origin and Content-Length), and Workers observability is
 * off in wrangler.toml. docs/experiments.md lists exactly what is stored.
 */
import type { WeightsDoc } from "../../src/experiments/assignment";
import {
  equalWeights,
  parseMode,
  updateWeights,
  type WeightLogEntry,
} from "../../src/experiments/bandit";
import { BATCH, BOUNCE, ENGAGED } from "../../src/experiments/config";
import {
  ERROR_TYPES,
  WEIGHTS_FAILURES,
  type EventBatch,
  type EventType,
  type ExperimentEvent,
} from "../../src/experiments/events";
import { cryptoRng, type Rng } from "../../src/experiments/random";
import { buildResults } from "../../src/experiments/results";
import {
  buildGuardrails,
  tally,
  type Guardrails,
  type SessionSummary,
} from "../../src/experiments/score";

/* Minimal D1 types, so the Worker needs no extra type package. */
export interface D1Result<T> {
  results: T[];
}
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}
export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown>;
}

export interface Env {
  DB: D1Database;
  /** Comma-separated design ids; a unit test keeps it equal to src/designs/registry.ts. */
  DESIGNS: string;
  /** The design every other one is compared with. */
  BASELINE: string;
  /** Kill switch: "auto", "freeze" or "force:<design>". */
  EXPERIMENT_MODE?: string;
  /** Comma-separated origins allowed to send events and read the results. */
  ALLOWED_ORIGINS: string;
  /** Days of raw events to keep. */
  RETENTION_DAYS?: string;
  /** Workers Rate Limiting binding (free plan, approximate, per Cloudflare location). */
  EVENTS_LIMITER?: RateLimiter;
}

export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/**
 * What each event may carry. Anything outside these rules is dropped (one bad event) or refused
 * (a bad batch), so a modified client cannot store free text or out-of-range numbers.
 *   value: [min, max] when the event carries a number, null when it must not.
 *   label: the allowed labels, "designs" for a design id, or null. No free text is stored.
 */
type Rule = {
  value: readonly [number, number] | null;
  label: readonly string[] | "designs" | null;
};
const DAY_MS = 24 * 3_600_000;
const RULES: Record<EventType, Rule> = {
  pageview: { value: null, label: null },
  engaged_time: { value: [0, DAY_MS], label: null },
  scroll: { value: [25, 100], label: null },
  click: { value: null, label: ["project", "writing", "contact", "outbound"] },
  return_visit: { value: [0, 7 * 24], label: null },
  design_switch: { value: [0, 1], label: "designs" },
  bounce: { value: [0, BOUNCE.visibleMs], label: null },
  lcp: { value: [0, 120_000], label: null },
  cls: { value: [0, 10], label: null },
  js_error: { value: null, label: ERROR_TYPES },
  weights_error: { value: null, label: WEIGHTS_FAILURES },
};
const SOURCES = new Set(["url", "picker", "auto", "fallback", "default"]);
const MAX_EVENTS_PER_BATCH = 50;
/** A tab session that sends more than this is not a person reading; later events are refused. */
export const MAX_EVENTS_PER_SESSION = 500;
/** Browser clocks drift; events claiming to be further than this from the server's clock are dropped. */
const MAX_CLOCK_SKEW_MS = 2 * DAY_MS;
const ID = /^[0-9a-f-]{16,64}$/i;
/** Site paths only: letters, digits and a few separators. Anything else is not stored. */
const PATH = /^\/[A-Za-z0-9/_.~-]{0,199}$/;
const SCROLL_MARKS = new Set([25, 50, 75, 100]);

const designsOf = (env: Env) =>
  env.DESIGNS.split(",")
    .map((d) => d.trim())
    .filter(Boolean);
const retentionDays = (env: Env) => Math.max(1, Number(env.RETENTION_DAYS ?? 90) || 90);

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin");
  const allowed = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
  if (!origin || !allowed.includes(origin)) return {};
  return { "Access-Control-Allow-Origin": origin, Vary: "Origin" };
}

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Resource-Policy": "cross-origin",
};

function json(
  body: unknown,
  status: number,
  headers: Record<string, string>,
  maxAge = 0
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": maxAge > 0 ? `public, max-age=${maxAge}` : "no-store",
      ...SECURITY_HEADERS,
      ...headers,
    },
  });
}

function text(body: string, status: number, headers: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      ...SECURITY_HEADERS,
      ...headers,
    },
  });
}

/** One event cleaned to the stored fields, or null when it breaks its type's rules. */
function cleanEvent(raw: unknown, designs: readonly string[], now: number): ExperimentEvent | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const e = raw as Record<string, unknown>;
  const rule = typeof e.t === "string" ? RULES[e.t as EventType] : undefined;
  if (!rule || !Object.hasOwn(RULES, e.t as string)) return null;
  if (typeof e.design !== "string" || !designs.includes(e.design)) return null;
  if (typeof e.ts !== "number" || !Number.isFinite(e.ts)) return null;
  if (Math.abs(e.ts - now) > MAX_CLOCK_SKEW_MS) return null;

  let path: string | undefined;
  if (e.path !== undefined) {
    if (typeof e.path !== "string") return null;
    path = e.path.split(/[?#]/)[0];
    if (!PATH.test(path)) return null;
  }

  let value: number | undefined;
  if (rule.value) {
    if (typeof e.value !== "number" || !Number.isFinite(e.value)) return null;
    if (e.value < rule.value[0] || e.value > rule.value[1]) return null;
    if (e.t === "scroll" && !SCROLL_MARKS.has(e.value)) return null;
    value = e.value;
  } else if (e.value !== undefined) return null;

  let label: string | undefined;
  if (rule.label === "designs") {
    if (typeof e.label !== "string" || !designs.includes(e.label)) return null;
    label = e.label;
  } else if (rule.label) {
    if (typeof e.label !== "string" || !rule.label.includes(e.label)) return null;
    label = e.label;
  } else if (e.label !== undefined) return null;

  return { t: e.t as EventType, ts: Math.round(e.ts), design: e.design, path, value, label };
}

/** Validates one batch and keeps only the fields we store. Throws with a reason. */
export function cleanBatch(
  raw: unknown,
  designs: readonly string[],
  now: number = Date.now()
): EventBatch {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("not a batch");
  const b = raw as Partial<EventBatch>;
  if (b.v !== 1) throw new Error("unknown batch version");
  if (typeof b.vid !== "string" || !ID.test(b.vid)) throw new Error("bad visitor id");
  if (typeof b.sid !== "string" || !ID.test(b.sid)) throw new Error("bad session id");
  if (typeof b.source !== "string" || !SOURCES.has(b.source)) throw new Error("bad source");
  if (b.assigned !== null && (typeof b.assigned !== "string" || !designs.includes(b.assigned)))
    throw new Error("bad assigned design");
  if (!Array.isArray(b.events) || b.events.length === 0) throw new Error("no events");
  if (b.events.length > MAX_EVENTS_PER_BATCH) throw new Error("too many events");
  const events = b.events
    .map((e) => cleanEvent(e, designs, now))
    .filter((e): e is ExperimentEvent => e !== null);
  if (events.length === 0) throw new Error("no valid events");
  return { v: 1, vid: b.vid, sid: b.sid, assigned: b.assigned, source: b.source, events };
}

/** Allowed request types for /events: what sendBeacon sends for a string, and plain JSON. */
const isAllowedContentType = (type: string | null) =>
  type === null || /^(text\/plain|application\/json)(\s*;.*)?$/i.test(type);

async function receiveEvents(
  request: Request,
  env: Env,
  cors: Record<string, string>
): Promise<Response> {
  // Only the site's own pages may send. sendBeacon always sets Origin on a cross-origin POST.
  // This keeps other websites' pages out; it is not authentication (any script can set Origin),
  // which is why everything below validates, limits and deduplicates as if the sender were hostile.
  if (!cors["Access-Control-Allow-Origin"]) return text("forbidden", 403);
  if (!isAllowedContentType(request.headers.get("Content-Type")))
    return text("unsupported content type", 415, cors);
  const length = Number(request.headers.get("Content-Length") ?? 0);
  if (length > BATCH.maxBodyBytes) return text("too large", 413, cors);
  // Abuse brake before any database work. Keys hold no visitor data: one shared key caps the
  // total write rate (protecting the free D1 quota), not any one person.
  if (env.EVENTS_LIMITER && !(await env.EVENTS_LIMITER.limit({ key: "events" })).success)
    return text("slow down", 429, { ...cors, "Retry-After": "60" });
  const body = await readCapped(request, BATCH.maxBodyBytes);
  if (body === null) return text("too large", 413, cors);
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return text("bad batch: not JSON", 400, cors);
  }
  let batch: EventBatch;
  const received = Date.now();
  try {
    batch = cleanBatch(parsed, designsOf(env), received);
  } catch (error) {
    return text(`bad batch: ${(error as Error).message}`, 400, cors);
  }
  const stored = await env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE sid = ?")
    .bind(batch.sid)
    .first<{ n: number }>();
  if (Number(stored?.n ?? 0) + batch.events.length > MAX_EVENTS_PER_SESSION)
    return text("session limit reached", 429, cors);
  // OR IGNORE plus the unique index makes a resent batch (a retried beacon) a no-op.
  const insert = env.DB.prepare(
    "INSERT OR IGNORE INTO events (received_at, vid, sid, assigned, source, t, ts, design, path, value, label) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  await env.DB.batch(
    batch.events.map((e) =>
      insert.bind(
        received,
        batch.vid,
        batch.sid,
        batch.assigned,
        batch.source,
        e.t,
        e.ts,
        e.design,
        e.path ?? null,
        e.value ?? null,
        e.label ?? null
      )
    )
  );
  return new Response(null, { status: 204, headers: { ...SECURITY_HEADERS, ...cors } });
}

/** Reads at most `max` bytes of the body, or null when it is larger (whatever Content-Length said). */
async function readCapped(request: Request, max: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

async function storedWeights(env: Env): Promise<WeightsDoc | null> {
  const row = await env.DB.prepare("SELECT doc FROM weights WHERE id = 1").first<{ doc: string }>();
  return row ? (JSON.parse(row.doc) as WeightsDoc) : null;
}

/** The stored weights with the kill switch applied, so a change to EXPERIMENT_MODE is immediate. */
export async function currentWeights(env: Env): Promise<WeightsDoc> {
  const designs = designsOf(env);
  const stored = (await storedWeights(env)) ?? {
    version: "initial",
    updatedAt: new Date(0).toISOString(),
    mode: "auto" as const,
    weights: equalWeights(designs),
  };
  const weights = Object.fromEntries(designs.map((d) => [d, stored.weights[d] ?? 0]));
  const mode = parseMode(env.EXPERIMENT_MODE, designs);
  if (mode.kind === "force") {
    return {
      ...stored,
      weights,
      mode: "forced",
      forced: mode.design,
      version: `${stored.version}+force:${mode.design}`,
    };
  }
  if (mode.kind === "freeze") return { ...stored, weights, mode: "frozen", forced: undefined };
  return { ...stored, weights, mode: "auto", forced: undefined };
}

const SESSIONS_SQL = `
  SELECT assigned AS design,
         SUM(CASE WHEN t = 'engaged_time' THEN value ELSE 0 END) AS visibleMs,
         MAX(CASE WHEN t = 'scroll' THEN value ELSE 0 END) AS maxScroll,
         SUM(CASE WHEN t = 'click' AND label IN (${ENGAGED.clicks.map((c) => `'${c}'`).join(", ")}) THEN 1 ELSE 0 END) AS keyClicks,
         MAX(CASE WHEN t = 'design_switch' AND value = 1 THEN 1 ELSE 0 END) AS switchedAway
  FROM events
  WHERE assigned IS NOT NULL
  GROUP BY sid, assigned
  HAVING MAX(CASE WHEN source = 'auto' THEN 1 ELSE 0 END) = 1`;

/** Engaged and total sessions per design (automatic assignments only) plus the guardrails. */
export async function collectStats(env: Env) {
  const designs = designsOf(env);
  const sessions = await env.DB.prepare(SESSIONS_SQL).all<{
    design: string;
    visibleMs: number | null;
    maxScroll: number | null;
    keyClicks: number | null;
    switchedAway: number | null;
  }>();
  const summaries: SessionSummary[] = sessions.results.map((r) => ({
    design: r.design,
    visibleMs: Number(r.visibleMs ?? 0),
    maxScroll: Number(r.maxScroll ?? 0),
    keyClicks: Number(r.keyClicks ?? 0),
    switchedAway: Number(r.switchedAway ?? 0) === 1,
  }));
  const vitals = await env.DB.prepare(
    "SELECT design, t, value FROM events WHERE t IN ('lcp', 'cls') AND value IS NOT NULL"
  ).all<{ design: string; t: string; value: number }>();
  const counts = await env.DB.prepare(
    "SELECT design, SUM(CASE WHEN t = 'pageview' THEN 1 ELSE 0 END) AS pageviews, SUM(CASE WHEN t = 'js_error' THEN 1 ELSE 0 END) AS errors FROM events GROUP BY design"
  ).all<{ design: string; pageviews: number; errors: number }>();
  const guardrails: Record<string, Guardrails> = {};
  for (const d of designs) {
    const c = counts.results.find((r) => r.design === d);
    guardrails[d] = buildGuardrails({
      lcp: vitals.results.filter((r) => r.design === d && r.t === "lcp").map((r) => r.value),
      cls: vitals.results.filter((r) => r.design === d && r.t === "cls").map((r) => r.value),
      errors: Number(c?.errors ?? 0),
      pageviews: Number(c?.pageviews ?? 0),
    });
  }
  return tally(summaries, designs, guardrails);
}

async function history(env: Env, limit = 60): Promise<WeightLogEntry[]> {
  const rows = await env.DB.prepare("SELECT entry FROM weight_log ORDER BY id DESC LIMIT ?")
    .bind(limit)
    .all<{ entry: string }>();
  return rows.results.map((r) => JSON.parse(r.entry) as WeightLogEntry);
}

/** The daily job: one bandit update, logged whether or not the weights moved, then cleanup. */
export async function runUpdate(
  env: Env,
  now: Date,
  rng: Rng = cryptoRng()
): Promise<WeightLogEntry> {
  const designs = designsOf(env);
  const stats = await collectStats(env);
  const { doc, log } = updateWeights({
    designs,
    baseline: env.BASELINE,
    stats,
    previous: await storedWeights(env),
    mode: parseMode(env.EXPERIMENT_MODE, designs),
    now,
    rng,
  });
  const cutoff = now.getTime() - retentionDays(env) * 24 * 3_600_000;
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO weights (id, doc) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET doc = excluded.doc"
    ).bind(JSON.stringify(doc)),
    env.DB.prepare("INSERT INTO weight_log (at, entry) VALUES (?, ?)").bind(
      log.at,
      JSON.stringify(log)
    ),
    env.DB.prepare("DELETE FROM events WHERE received_at < ?").bind(cutoff),
  ]);
  console.log(`[experiments] ${log.changed ? "weights changed" : "weights held"}: ${log.reason}`);
  return log;
}

/** The only paths the Worker answers, and the one method each accepts (plus CORS preflight). */
const ROUTES: Record<string, string> = {
  "/events": "POST",
  "/weights.json": "GET",
  "/results": "GET",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          "Access-Control-Allow-Methods": "GET, POST",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
    const allowed = ROUTES[url.pathname];
    if (!allowed) return text("not found", 404, cors);
    if (request.method !== allowed)
      return text("method not allowed", 405, { ...cors, Allow: allowed });
    try {
      if (url.pathname === "/events") return await receiveEvents(request, env, cors);
      if (url.pathname === "/weights.json") {
        return json(await currentWeights(env), 200, cors, 300);
      }
      const results = buildResults({
        stats: await collectStats(env),
        baseline: env.BASELINE,
        weights: await currentWeights(env),
        history: await history(env),
        now: new Date(),
        windowDays: retentionDays(env),
        rng: cryptoRng(),
      });
      return json(results, 200, cors, 60);
    } catch (error) {
      console.error("[experiments] request failed", error);
      return text("server error", 500, cors);
    }
  },

  async scheduled(_event: unknown, env: Env): Promise<void> {
    await runUpdate(env, new Date());
  },
};
