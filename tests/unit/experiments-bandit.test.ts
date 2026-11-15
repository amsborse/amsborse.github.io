import { describe, expect, it } from "vitest";
import { pickDesign, type WeightsDoc } from "../../src/experiments/assignment";
import { equalWeights, parseMode, updateWeights } from "../../src/experiments/bandit";
import { BANDIT } from "../../src/experiments/config";
import { seededRng } from "../../src/experiments/random";
import { buildGuardrails, type DesignStats, type Guardrails } from "../../src/experiments/score";

const DESIGNS = ["editorial", "blueprint", "broadsheet"] as const;
const DAY = 24 * 3_600_000;

const healthy = (): Guardrails =>
  buildGuardrails({
    lcp: Array(40).fill(1200),
    cls: Array(40).fill(0.01),
    errors: 0,
    pageviews: 40,
  });

function stats(
  rows: Record<string, [number, number]>,
  guard: Record<string, Guardrails> = {}
): DesignStats[] {
  return DESIGNS.map((d) => ({
    design: d,
    sessions: rows[d][0],
    engaged: rows[d][1],
    switchedAway: 0,
    guardrails: guard[d] ?? healthy(),
  }));
}

const start: WeightsDoc = {
  version: "v0",
  updatedAt: new Date(0).toISOString(),
  mode: "auto",
  weights: equalWeights(DESIGNS),
};

const sum = (w: Record<string, number>) => Object.values(w).reduce((a, b) => a + b, 0);

describe("updateWeights", () => {
  it("is deterministic for a seed", () => {
    const input = {
      designs: DESIGNS,
      baseline: "editorial",
      stats: stats({ editorial: [400, 120], blueprint: [400, 160], broadsheet: [400, 125] }),
      previous: start,
      mode: { kind: "auto" } as const,
      now: new Date(10 * DAY),
    };
    const a = updateWeights({ ...input, rng: seededRng(7) });
    const b = updateWeights({ ...input, rng: seededRng(7) });
    expect(a.doc.weights).toEqual(b.doc.weights);
    expect(a.log.changed).toBe(true);
    expect(a.doc.weights.blueprint).toBeGreaterThan(start.weights.blueprint);
    // Never more than one step per update.
    for (const d of DESIGNS) {
      expect(Math.abs(a.doc.weights[d] - start.weights[d])).toBeLessThanOrEqual(
        BANDIT.maxStep + 1e-4
      );
    }
    expect(sum(a.doc.weights)).toBeCloseTo(1, 3);
    expect(a.log.samples.blueprint).toEqual({ sessions: 400, engaged: 160 });
    expect(a.log.reason).toMatch(/blueprint/);
  });

  it("holds until every design has the minimum engaged visits", () => {
    const r = updateWeights({
      designs: DESIGNS,
      baseline: "editorial",
      stats: stats({ editorial: [900, 300], blueprint: [900, 400], broadsheet: [200, 60] }),
      previous: start,
      mode: { kind: "auto" },
      now: new Date(10 * DAY),
      rng: seededRng(1),
    });
    expect(r.log.changed).toBe(false);
    expect(r.doc.weights).toEqual(start.weights);
    expect(r.log.reason).toMatch(/broadsheet 60/);
  });

  it("moves at most once per interval", () => {
    const recent = { ...start, updatedAt: new Date(10 * DAY - 3_600_000).toISOString() };
    const r = updateWeights({
      designs: DESIGNS,
      baseline: "editorial",
      stats: stats({ editorial: [400, 120], blueprint: [400, 200], broadsheet: [400, 120] }),
      previous: recent,
      mode: { kind: "auto" },
      now: new Date(10 * DAY),
      rng: seededRng(1),
    });
    expect(r.log.changed).toBe(false);
    expect(r.doc.version).toBe("v0");
  });

  it("caps a design whose guardrails regress at the floor, but never the baseline", () => {
    const slow = buildGuardrails({
      lcp: Array(40).fill(3000),
      cls: Array(40).fill(0.01),
      errors: 0,
      pageviews: 40,
    });
    const r = updateWeights({
      designs: DESIGNS,
      baseline: "editorial",
      stats: stats(
        { editorial: [400, 100], blueprint: [400, 220], broadsheet: [400, 100] },
        { blueprint: slow }
      ),
      previous: start,
      mode: { kind: "auto" },
      now: new Date(10 * DAY),
      rng: seededRng(3),
    });
    expect(r.doc.weights.blueprint).toBe(BANDIT.floor);
    expect(r.log.guardrails.blueprint).toBe("regressed");
    expect(r.log.reason).toMatch(/LCP/);
    expect(r.doc.weights.editorial).toBeGreaterThan(0);
  });

  it("keeps a design with unknown guardrails at or below an equal share", () => {
    const none = buildGuardrails({ lcp: [], cls: [], errors: 0, pageviews: 0 });
    const r = updateWeights({
      designs: DESIGNS,
      baseline: "editorial",
      stats: stats(
        { editorial: [400, 100], blueprint: [400, 250], broadsheet: [400, 100] },
        { blueprint: none }
      ),
      previous: start,
      mode: { kind: "auto" },
      now: new Date(10 * DAY),
      rng: seededRng(3),
    });
    expect(r.doc.weights.blueprint).toBeLessThanOrEqual(0.3334);
    expect(r.log.guardrails.blueprint).toBe("unknown");
  });

  it("obeys the kill switch", () => {
    const base = {
      designs: DESIGNS,
      baseline: "editorial",
      stats: stats({ editorial: [400, 100], blueprint: [400, 250], broadsheet: [400, 100] }),
      previous: start,
      now: new Date(10 * DAY),
      rng: seededRng(3),
    };
    const frozen = updateWeights({ ...base, mode: { kind: "freeze" } });
    expect(frozen.doc.mode).toBe("frozen");
    expect(frozen.doc.weights).toEqual(start.weights);
    const forced = updateWeights({ ...base, mode: { kind: "force", design: "broadsheet" } });
    expect(forced.doc.mode).toBe("forced");
    expect(forced.doc.forced).toBe("broadsheet");
    expect(pickDesign(forced.doc, DESIGNS, seededRng(1))).toBe("broadsheet");
  });

  it("reads the kill switch and holds on nonsense", () => {
    expect(parseMode(undefined, DESIGNS)).toEqual({ kind: "auto" });
    expect(parseMode("force:blueprint", DESIGNS)).toEqual({ kind: "force", design: "blueprint" });
    const errors: unknown[] = [];
    const original = console.error;
    console.error = (...a: unknown[]) => errors.push(a);
    try {
      expect(parseMode("force:nope", DESIGNS)).toEqual({ kind: "freeze" });
    } finally {
      console.error = original;
    }
    expect(errors).toHaveLength(1);
  });
});

/** Runs the whole loop: visitors assigned by the current weights, one bandit update per day. */
function simulate(trueRates: Record<string, number>, seed: number, days = 60, visitsPerDay = 120) {
  const rng = seededRng(seed);
  let doc: WeightsDoc = start;
  const counts = Object.fromEntries(DESIGNS.map((d) => [d, [0, 0]])) as Record<
    string,
    [number, number]
  >;
  const history: Record<string, number>[] = [];
  for (let day = 1; day <= days; day++) {
    for (let i = 0; i < visitsPerDay; i++) {
      const d = pickDesign(doc, DESIGNS, rng);
      counts[d][0] += 1;
      if (rng() < trueRates[d]) counts[d][1] += 1;
    }
    doc = updateWeights({
      designs: DESIGNS,
      baseline: "editorial",
      stats: stats(counts),
      previous: doc,
      mode: { kind: "auto" },
      now: new Date(day * DAY),
      rng,
    }).doc;
    history.push(doc.weights);
  }
  return { doc, history };
}

// Each run replays 60 daily updates with the production 20,000 draws, so allow more than the
// default 5 s when the whole suite runs in parallel.
describe("bandit simulation", { timeout: 60_000 }, () => {
  it("shifts traffic toward a design that is truly better and keeps the floor", () => {
    for (const seed of [1, 2, 3]) {
      const { doc, history } = simulate({ editorial: 0.3, blueprint: 0.3, broadsheet: 0.4 }, seed);
      expect(doc.weights.broadsheet).toBeGreaterThan(0.6);
      for (const w of history) {
        for (const d of DESIGNS) expect(w[d]).toBeGreaterThanOrEqual(BANDIT.floor - 1e-9);
        expect(sum(w)).toBeCloseTo(1, 3);
      }
    }
  });

  it("stays near an even split when the designs are the same", () => {
    for (const seed of [11, 12, 13, 14]) {
      const { history } = simulate({ editorial: 0.3, blueprint: 0.3, broadsheet: 0.3 }, seed);
      const last = history.slice(-20);
      const avgMax = last.reduce((s, w) => s + Math.max(...Object.values(w)), 0) / last.length;
      expect(avgMax).toBeLessThan(0.6);
      for (const w of history)
        for (const d of DESIGNS) expect(w[d]).toBeGreaterThanOrEqual(BANDIT.floor - 1e-9);
    }
  });
});
