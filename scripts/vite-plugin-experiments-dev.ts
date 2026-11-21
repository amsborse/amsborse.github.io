/**
 * Dev-server stand-in for the experiment Worker, at /__experiments. Active only under `vite`
 * (`npm run dev`), never in a build, and it stores nothing on disk.
 *
 *   GET  /__experiments/weights.json  forced to editorial by default, so local work keeps the
 *                                     usual design; EXPERIMENTS_DEV=auto serves an even split
 *   POST /__experiments/events        kept in memory (last 500) and answered 204
 *   GET  /__experiments/events        the events received so far, for checking the tracker
 *   GET  /__experiments/results       SAMPLE numbers from a seeded simulation, marked sample
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import type { WeightsDoc } from "../src/experiments/assignment";
import { equalWeights, updateWeights, type WeightLogEntry } from "../src/experiments/bandit";
import { seededRng } from "../src/experiments/random";
import { buildResults, type ResultsDoc } from "../src/experiments/results";
import { buildGuardrails, type DesignStats } from "../src/experiments/score";

const DESIGNS = ["editorial", "blueprint", "broadsheet"] as const;
const DAY = 24 * 3_600_000;

function devWeights(): WeightsDoc {
  const auto = process.env.EXPERIMENTS_DEV === "auto";
  return {
    version: auto ? "dev-even" : "dev-forced",
    updatedAt: new Date(0).toISOString(),
    mode: auto ? "auto" : "forced",
    ...(auto ? {} : { forced: "editorial" }),
    weights: equalWeights(DESIGNS),
  };
}

/** Illustrative numbers only: a seeded run of the real bandit, labelled as a sample on the page. */
function sampleResults(): ResultsDoc {
  const rng = seededRng(42);
  const vitals = (lcp: number, n: number) =>
    buildGuardrails({
      lcp: Array.from({ length: n }, () => lcp + rng() * 400),
      cls: Array.from({ length: n }, () => rng() * 0.04),
      errors: Math.round(n * 0.004),
      pageviews: n * 2,
    });
  const rates = { editorial: 0.31, blueprint: 0.36, broadsheet: 0.3 } as Record<string, number>;
  const counts = Object.fromEntries(DESIGNS.map((d) => [d, [0, 0]])) as Record<
    string,
    [number, number]
  >;
  let doc: WeightsDoc = { ...devWeights(), mode: "auto", forced: undefined, version: "sample-0" };
  const history: WeightLogEntry[] = [];
  const statsNow = (): DesignStats[] =>
    DESIGNS.map((d) => ({
      design: d,
      sessions: counts[d][0],
      engaged: counts[d][1],
      switchedAway: Math.round(counts[d][0] * 0.03),
      guardrails:
        d === "broadsheet" && counts[d][0] < 120
          ? vitals(1500, 12)
          : vitals(d === "blueprint" ? 1350 : 1300, 80),
    }));
  const start = Date.UTC(2026, 9, 1);
  for (let day = 1; day <= 24; day++) {
    for (let i = 0; i < 45; i++) {
      // Broadsheet joined the pool late in this sample, so it is still short of data.
      const d =
        day < 20 ? (rng() < 0.5 ? "editorial" : "blueprint") : DESIGNS[Math.floor(rng() * 3)];
      counts[d][0] += 1;
      if (rng() < rates[d]) counts[d][1] += 1;
    }
    const r = updateWeights({
      designs: DESIGNS,
      baseline: "editorial",
      stats: statsNow(),
      previous: doc,
      mode: { kind: "auto" },
      now: new Date(start + day * DAY),
      rng,
    });
    doc = r.doc;
    history.unshift(r.log);
  }
  return {
    ...buildResults({
      stats: statsNow(),
      baseline: "editorial",
      weights: doc,
      history: history.slice(0, 12),
      now: new Date(start + 24 * DAY),
      windowDays: 90,
      rng,
    }),
    sample: true,
  };
}

function send(res: ServerResponse, status: number, body?: unknown) {
  res.statusCode = status;
  res.setHeader("Cache-Control", "no-store");
  if (body === undefined) return res.end();
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export function experimentsDevPlugin(): Plugin {
  const received: unknown[] = [];
  let results: ResultsDoc | null = null;
  return {
    name: "experiments-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__experiments", async (req, res, next) => {
        const path = (req.url ?? "/").split("?")[0];
        try {
          if (path === "/weights.json" && req.method === "GET") return send(res, 200, devWeights());
          if (path === "/events" && req.method === "POST") {
            const batch = JSON.parse(await readBody(req));
            received.push(batch);
            if (received.length > 500) received.splice(0, received.length - 500);
            return send(res, 204);
          }
          if (path === "/events" && req.method === "GET") return send(res, 200, received);
          if (path === "/results" && req.method === "GET")
            return send(res, 200, (results ??= sampleResults()));
          return next();
        } catch (error) {
          console.error("[experiments-dev] request failed", error);
          return send(res, 400, { error: String(error) });
        }
      });
    },
  };
}
