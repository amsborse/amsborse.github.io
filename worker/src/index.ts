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
import { BATCH, ENGAGED } from "../../src/experiments/config";
import type { EventBatch, EventType } from "../../src/experiments/events";
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
}

const EVENT_TYPES: ReadonlySet<EventType> = new Set<EventType>([
  "pageview",
  "engaged_time",
  "scroll",
  "click",
  "return_visit",
  "design_switch",
  "bounce",
  "lcp",
  "cls",
  "js_error",
  "weights_error",
]);
const SOURCES = new Set(["url", "picker", "auto", "fallback", "default"]);
const MAX_EVENTS_PER_BATCH = 50;
const ID = /^[0-9a-f-]{16,64}$/i;

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
      ...headers,
    },
  });
}

/** Validates one batch and keeps only the fields we store. Throws with a reason. */
export function cleanBatch(raw: unknown, designs: readonly string[]): EventBatch {
  const b = raw as Partial<EventBatch> | null;
  if (!b || b.v !== 1) throw new Error("unknown batch version");
  if (typeof b.vid !== "string" || !ID.test(b.vid)) throw new Error("bad visitor id");
  if (typeof b.sid !== "string" || !ID.test(b.sid)) throw new Error("bad session id");
  if (typeof b.source !== "string" || !SOURCES.has(b.source)) throw new Error("bad source");
  if (b.assigned !== null && !designs.includes(String(b.assigned)))
    throw new Error("bad assigned design");
  if (!Array.isArray(b.events) || b.events.length === 0) throw new Error("no events");
  if (b.events.length > MAX_EVENTS_PER_BATCH) throw new Error("too many events");
  const events = b.events
    .filter((e) => e && EVENT_TYPES.has(e.t) && designs.includes(e.design) && Number.isFinite(e.ts))
    .map((e) => ({
      t: e.t,
      ts: Math.round(e.ts),
      design: e.design,
      path: typeof e.path === "string" ? e.path.split(/[?#]/)[0].slice(0, 200) : undefined,
      value: typeof e.value === "number" && Number.isFinite(e.value) ? e.value : undefined,
      label: typeof e.label === "string" ? e.label.slice(0, 120) : undefined,
    }));
  if (events.length === 0) throw new Error("no valid events");
  return { v: 1, vid: b.vid, sid: b.sid, assigned: b.assigned ?? null, source: b.source, events };
}

async function receiveEvents(
  request: Request,
  env: Env,
  cors: Record<string, string>
): Promise<Response> {
  // Only the site's own pages may send. sendBeacon always sets Origin on a cross-origin POST.
  if (!cors["Access-Control-Allow-Origin"]) return new Response("forbidden", { status: 403 });
  const length = Number(request.headers.get("Content-Length") ?? 0);
  if (length > BATCH.maxBodyBytes) return new Response("too large", { status: 413, headers: cors });
  const text = await request.text();
  if (text.length > BATCH.maxBodyBytes)
    return new Response("too large", { status: 413, headers: cors });
  let batch: EventBatch;
  try {
    batch = cleanBatch(JSON.parse(text), designsOf(env));
  } catch (error) {
    return new Response(`bad batch: ${(error as Error).message}`, { status: 400, headers: cors });
  }
  const received = Date.now();
  const insert = env.DB.prepare(
    "INSERT INTO events (received_at, vid, sid, assigned, source, t, ts, design, path, value, label) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
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
  return new Response(null, { status: 204, headers: cors });
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
    try {
      if (url.pathname === "/events" && request.method === "POST")
        return await receiveEvents(request, env, cors);
      if (url.pathname === "/weights.json" && request.method === "GET") {
        return json(await currentWeights(env), 200, cors, 300);
      }
      if (url.pathname === "/results" && request.method === "GET") {
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
      }
      return new Response("not found", { status: 404, headers: cors });
    } catch (error) {
      console.error("[experiments] request failed", error);
      return new Response("server error", { status: 500, headers: cors });
    }
  },

  async scheduled(_event: unknown, env: Env): Promise<void> {
    await runUpdate(env, new Date());
  },
};
