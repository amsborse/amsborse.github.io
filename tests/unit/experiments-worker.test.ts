// @vitest-environment node
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import { DESIGNS as REGISTRY } from "../../src/designs/registry";
import { seededRng } from "../../src/experiments/random";
import worker, {
  cleanBatch,
  collectStats,
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
    events: events.map((e) => ({ ts: 1, design, path: "/", ...e })),
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
