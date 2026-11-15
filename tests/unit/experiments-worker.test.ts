// @vitest-environment node
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import { DESIGNS as REGISTRY } from "../../src/designs/registry";
import { seededRng } from "../../src/experiments/random";
import worker, {
  cleanBatch,
  collectStats,
  MAX_EVENTS_PER_SESSION,
  currentWeights,
  runUpdate,
  type D1Database,
  type D1PreparedStatement,
  type Env,
} from "../../worker/src/index";

/** A real SQLite database behind the small part of the D1 API the Worker uses. */
function fakeD1(): D1Database {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync("worker/schema.sql", "utf8"));
  const statement = (sql: string, params: unknown[] = []): D1PreparedStatement => ({
    bind: (...values) => statement(sql, values),
    all: async <T>() => ({ results: db.prepare(sql).all(...(params as never[])) as T[] }),
    first: async <T>() => (db.prepare(sql).get(...(params as never[])) as T | undefined) ?? null,
    run: async () => db.prepare(sql).run(...(params as never[])),
  });
  return {
    prepare: (sql) => statement(sql),
    batch: async (statements) => {
      db.exec("BEGIN");
      try {
        for (const s of statements) await s.run();
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      return [];
    },
  };
}

const ORIGIN = "https://amsborse.github.io";
const DESIGN_IDS = "editorial,blueprint,broadsheet";
let env: Env;

beforeEach(() => {
  env = {
    DB: fakeD1(),
    DESIGNS: DESIGN_IDS,
    BASELINE: "editorial",
    EXPERIMENT_MODE: "auto",
    ALLOWED_ORIGINS: ORIGIN,
    RETENTION_DAYS: "90",
  };
});

let counter = 0;
const id = () => (++counter).toString(16).padStart(32, "0");

function batch(
  design: string,
  events: Array<Record<string, unknown>>,
  source = "auto",
  sid = id()
) {
  return {
    v: 1,
    vid: id(),
    sid,
    assigned: source === "auto" ? design : null,
    source,
    events: events.map((e) => ({ ts: Date.now(), design, path: "/", ...e })),
  };
}

const post = (body: unknown, origin = ORIGIN) =>
  worker.fetch(
    new Request("https://w.example/events", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "text/plain" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    env
  );

describe("worker /events", () => {
  it("stores a valid batch from the site and nothing about the request", async () => {
    const res = await post(batch("blueprint", [{ t: "pageview", path: "/writing?utm=x#top" }]));
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
    const rows = await env.DB.prepare("SELECT * FROM events").all<Record<string, unknown>>();
    expect(rows.results).toHaveLength(1);
    expect(rows.results[0].path).toBe("/writing");
    expect(Object.keys(rows.results[0]).sort()).toEqual(
      [
        "assigned",
        "design",
        "id",
        "label",
        "path",
        "received_at",
        "sid",
        "source",
        "t",
        "ts",
        "value",
        "vid",
      ].sort()
    );
  });

  it("refuses other origins, unknown designs and oversized bodies", async () => {
    expect(
      (await post(batch("blueprint", [{ t: "pageview" }]), "https://evil.example")).status
    ).toBe(403);
    expect((await post(batch("nope", [{ t: "pageview" }]))).status).toBe(400);
    expect((await post("x".repeat(20_000))).status).toBe(413);
    expect(() =>
      cleanBatch({ v: 1, vid: "bad", sid: id(), source: "auto", assigned: null, events: [] }, [
        "editorial",
      ])
    ).toThrow(/visitor/);
  });
});

const count = async () =>
  Number((await env.DB.prepare("SELECT COUNT(*) AS n FROM events").first<{ n: number }>())?.n);

describe("worker /events hardening", () => {
  it("drops events that break their type's rules and stores the rest", async () => {
    const now = Date.now();
    const res = await post(
      batch("blueprint", [
        { t: "pageview" },
        { t: "scroll", value: 33 }, // not a scroll mark
        { t: "scroll", value: 75 },
        { t: "engaged_time", value: -5 },
        { t: "engaged_time", value: "1000" },
        { t: "lcp", value: 999_999 },
        { t: "cls", value: Number.NaN },
        { t: "click", label: "free text from a modified client" },
        { t: "click", label: "project" },
        { t: "pageview", label: "smuggled" }, // pageview carries no label
        { t: "pageview", value: 1 }, // nor a value
        { t: "design_switch", value: 1, label: "nope" },
        { t: "return_visit", value: 9_999 },
        { t: "pageview", ts: now - 30 * 24 * 3_600_000 }, // a month off the server clock
        { t: "pageview", path: "/a b<script>" },
        { t: "pageview", path: "https://evil.example/" },
        { t: "__proto__" },
        { t: "toString" },
      ])
    );
    expect(res.status).toBe(204);
    const rows = await env.DB.prepare("SELECT t, value, label FROM events ORDER BY id").all<{
      t: string;
      value: number | null;
      label: string | null;
    }>();
    expect(rows.results).toEqual([
      { t: "pageview", value: null, label: null },
      { t: "scroll", value: 75, label: null },
      { t: "click", value: null, label: "project" },
    ]);
  });

  it("refuses malformed bodies and ids with a reason, storing nothing", async () => {
    const good = batch("blueprint", [{ t: "pageview" }]);
    const cases: Array<[unknown, RegExp]> = [
      ["{not json", /not JSON/],
      ["null", /not a batch/],
      ["[]", /not a batch/],
      [{ ...good, v: 2 }, /version/],
      [{ ...good, vid: "../../etc" }, /visitor/],
      [{ ...good, sid: "a".repeat(65) }, /session/],
      [{ ...good, sid: 42 }, /session/],
      [{ ...good, source: "spoofed" }, /source/],
      [{ ...good, assigned: { toString: "x" } }, /assigned/],
      [{ ...good, events: "lots" }, /no events/],
      [{ ...good, events: Array(51).fill(good.events[0]) }, /too many/],
      [{ ...good, events: [{ t: "pageview", design: "nope", ts: Date.now() }] }, /no valid/],
    ];
    for (const [body, reason] of cases) {
      const res = await post(body);
      expect(res.status, String(reason)).toBe(400);
      expect(await res.text()).toMatch(reason);
    }
    expect(await count()).toBe(0);
  });

  it("refuses a body over the limit even without a Content-Length", async () => {
    const big = new TextEncoder().encode("x".repeat(20_000));
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        for (let i = 0; i < big.length; i += 1000) c.enqueue(big.slice(i, i + 1000));
        c.close();
      },
    });
    const request = new Request("https://w.example/events", {
      method: "POST",
      headers: { Origin: ORIGIN, "Content-Type": "text/plain" },
      body: stream,
      duplex: "half",
    } as RequestInit);
    expect(request.headers.get("Content-Length")).toBeNull();
    const res = await worker.fetch(request, env);
    expect(res.status).toBe(413);
    expect(await count()).toBe(0);
  });

  it("refuses other content types and requests without an allowed Origin", async () => {
    const body = JSON.stringify(batch("blueprint", [{ t: "pageview" }]));
    const form = await worker.fetch(
      new Request("https://w.example/events", {
        method: "POST",
        headers: { Origin: ORIGIN, "Content-Type": "application/x-www-form-urlencoded" },
        body,
      }),
      env
    );
    expect(form.status).toBe(415);
    const noOrigin = await worker.fetch(
      new Request("https://w.example/events", { method: "POST", body }),
      env
    );
    expect(noOrigin.status).toBe(403);
    expect(noOrigin.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(await count()).toBe(0);
  });

  it("counts a resent batch once", async () => {
    const body = batch("blueprint", [
      { t: "pageview" },
      { t: "scroll", value: 25 },
      { t: "scroll", value: 50 },
    ]);
    for (let i = 0; i < 3; i += 1) expect((await post(body)).status).toBe(204);
    expect(await count()).toBe(3);
  });

  it("caps how much one session can store", async () => {
    const sid = id();
    const base = Date.now();
    let status = 204;
    let sent = 0;
    while (status === 204 && sent <= MAX_EVENTS_PER_SESSION) {
      const events = Array.from({ length: 50 }, (_, i) => ({ t: "pageview", ts: base + sent + i }));
      status = (await post(batch("blueprint", events, "auto", sid))).status;
      if (status === 204) sent += 50;
    }
    expect(status).toBe(429);
    expect(await count()).toBe(MAX_EVENTS_PER_SESSION);
  });

  it("answers 429 when the rate limiter says so, before touching the database", async () => {
    const keys: string[] = [];
    env.EVENTS_LIMITER = {
      limit: async ({ key }) => {
        keys.push(key);
        return { success: false };
      },
    };
    const res = await post(batch("blueprint", [{ t: "pageview" }]));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    // The key never carries the visitor: no IP, no visitor or session id.
    expect(keys).toEqual(["events"]);
    expect(await count()).toBe(0);
  });

  it("scrubs free text in error labels on the server too", async () => {
    await post(
      batch("blueprint", [
        {
          t: "js_error",
          label: "TypeError: me@example.com at https://amsborse.github.io/x?token=abc 1234567",
        },
      ])
    );
    const row = await env.DB.prepare("SELECT label FROM events").first<{ label: string }>();
    expect(row?.label).not.toMatch(/example\.com|https?:|1234567/);
    expect(row?.label).toMatch(/<email>.*<url>.*#/);
  });

  it("answers only known paths and methods", async () => {
    const call = (method: string, path: string) =>
      worker.fetch(new Request(`https://w.example${path}`, { method }), env);
    const put = await call("PUT", "/events");
    expect(put.status).toBe(405);
    expect(put.headers.get("Allow")).toBe("POST");
    expect((await call("GET", "/events")).status).toBe(405);
    expect((await call("DELETE", "/results")).status).toBe(405);
    expect((await call("POST", "/weights.json")).headers.get("Allow")).toBe("GET");
    expect((await call("GET", "/events/1")).status).toBe(404);
    expect((await call("GET", "/")).status).toBe(404);
    expect((await call("GET", "/weights.json")).headers.get("X-Content-Type-Options")).toBe(
      "nosniff"
    );
  });
});

describe("worker /results privacy", () => {
  it("withholds engaged and switched-away counts below the reporting threshold", async () => {
    for (let i = 0; i < 3; i += 1)
      await post(batch("blueprint", [{ t: "engaged_time", value: 40_000 }]));
    await runUpdate(env, new Date(), seededRng(1));
    const res = await worker.fetch(new Request("https://w.example/results"), env);
    const doc = (await res.json()) as {
      designs: Array<{ design: string; sessions: number; engaged: unknown; switchedAway: unknown }>;
      history: Array<{ reason: string; samples: Record<string, { engaged: unknown }> }>;
    };
    const blueprint = doc.designs.find((d) => d.design === "blueprint")!;
    expect(blueprint.sessions).toBe(3);
    expect(blueprint.engaged).toBeNull();
    expect(blueprint.switchedAway).toBeNull();
    expect(doc.history[0].samples.blueprint.engaged).toBeNull();
    // The log's reason names the designs still short, without their counts.
    expect(doc.history[0].reason).toMatch(/short: editorial, blueprint, broadsheet/);
    // No row-level data: nothing that looks like an id or a raw event.
    expect(JSON.stringify(doc)).not.toMatch(/"(vid|sid|ts|path|label)"/);
  });
});

describe("worker /weights.json", () => {
  it("serves an even split before the first update and applies the kill switch at once", async () => {
    const even = await currentWeights(env);
    expect(even.version).toBe("initial");
    expect(Object.values(even.weights).every((w) => Math.abs(w - 1 / 3) < 0.001)).toBe(true);

    env.EXPERIMENT_MODE = "force:broadsheet";
    const res = await worker.fetch(new Request("https://w.example/weights.json"), env);
    const doc = (await res.json()) as { mode: string; forced: string; version: string };
    expect(doc.mode).toBe("forced");
    expect(doc.forced).toBe("broadsheet");
    expect(doc.version).toMatch(/force:broadsheet$/);

    env.EXPERIMENT_MODE = "freeze";
    expect((await currentWeights(env)).mode).toBe("frozen");
  });
});

describe("worker stats and daily update", () => {
  it("counts engaged sessions on automatic assignments only", async () => {
    await post(batch("blueprint", [{ t: "engaged_time", value: 31_000 }]));
    await post(batch("blueprint", [{ t: "scroll", value: 50 }]));
    await post(batch("blueprint", [{ t: "click", label: "project" }]));
    await post(batch("blueprint", [{ t: "scroll", value: 25 }]));
    // Switching away in the picker: the session counts, but not as engaged.
    const sid = id();
    await post(batch("blueprint", [{ t: "engaged_time", value: 60_000 }], "auto", sid));
    await post(
      {
        ...batch(
          "broadsheet",
          [{ t: "design_switch", value: 1, label: "broadsheet" }],
          "picker",
          sid
        ),
        assigned: "blueprint",
      },
      ORIGIN
    );
    // A ?design= visit never counts toward the score.
    await post(batch("editorial", [{ t: "engaged_time", value: 60_000 }], "url"));

    const stats = await collectStats(env);
    const blueprint = stats.find((s) => s.design === "blueprint")!;
    expect(blueprint.sessions).toBe(5);
    expect(blueprint.engaged).toBe(3);
    expect(blueprint.switchedAway).toBe(1);
    expect(stats.find((s) => s.design === "editorial")!.sessions).toBe(0);
  });

  it("logs every run, holds without data, and deletes events past the window", async () => {
    await post(batch("editorial", [{ t: "pageview" }]));
    await env.DB.prepare("UPDATE events SET received_at = 0").run();
    const log = await runUpdate(env, new Date(), seededRng(1));
    expect(log.changed).toBe(false);
    expect(log.reason).toMatch(/waiting for 100 engaged visits/);
    const left = await env.DB.prepare("SELECT COUNT(*) AS n FROM events").first<{ n: number }>();
    expect(left?.n).toBe(0);

    const res = await worker.fetch(new Request("https://w.example/results"), env);
    const results = (await res.json()) as {
      history: unknown[];
      designs: Array<{ design: string; rate: unknown; sessions: number }>;
    };
    expect(results.history).toHaveLength(1);
    // Too few visits: no rate at all, never a 0.
    expect(results.designs.every((d) => d.rate === null)).toBe(true);
  });
});

describe("worker configuration", () => {
  it("lists the same designs as the site registry", () => {
    const toml = readFileSync("worker/wrangler.toml", "utf8");
    const designs = /^DESIGNS\s*=\s*"([^"]+)"/m.exec(toml)?.[1];
    expect(designs).toBe(REGISTRY.map((d) => d.id).join(","));
    expect(designs).toBe(DESIGN_IDS);
    expect(toml).toMatch(/\[observability\]\s*\nenabled = false/);
  });
});
