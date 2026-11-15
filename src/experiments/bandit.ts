import type { WeightsDoc } from "./assignment";
import { BANDIT } from "./config";
import { sampleBeta, type Rng } from "./random";
import { guardrailVerdict, type DesignStats, type GuardrailVerdict } from "./score";

export type BanditConfig = typeof BANDIT;

/** The kill switch, from the Worker's EXPERIMENT_MODE variable. */
export type ExperimentMode =
  { kind: "auto" } | { kind: "freeze" } | { kind: "force"; design: string };

export function parseMode(raw: string | undefined, designs: readonly string[]): ExperimentMode {
  const value = (raw ?? "auto").trim();
  if (value === "" || value === "auto") return { kind: "auto" };
  if (value === "freeze") return { kind: "freeze" };
  const forced = /^force:(.+)$/.exec(value)?.[1];
  if (forced && designs.includes(forced)) return { kind: "force", design: forced };
  // An unreadable kill switch must not silently mean "auto": freeze until it is fixed.
  console.error(`[experiments] EXPERIMENT_MODE "${value}" is not understood; holding weights`);
  return { kind: "freeze" };
}

/** One line of the change history. Stored for every run, changed or not. */
export type WeightLogEntry = {
  at: string;
  changed: boolean;
  reason: string;
  from: Record<string, number>;
  to: Record<string, number>;
  /** Sessions and engaged sessions per design that the decision was based on. */
  samples: Record<string, { sessions: number; engaged: number }>;
  probabilityBest: Record<string, number> | null;
  guardrails: Record<string, GuardrailVerdict>;
};

export type BanditInput = {
  designs: readonly string[];
  baseline: string;
  stats: readonly DesignStats[];
  previous: WeightsDoc | null;
  mode: ExperimentMode;
  now: Date;
  rng: Rng;
  config?: BanditConfig;
};

export function equalWeights(designs: readonly string[]): Record<string, number> {
  return Object.fromEntries(designs.map((d) => [d, round(1 / designs.length)]));
}

function round(x: number): number {
  return Math.round(x * 10000) / 10000;
}

/** Thompson sampling estimate of each design's chance of having the best engaged rate. */
export function probabilityBest(
  stats: readonly DesignStats[],
  rng: Rng,
  draws: number
): Record<string, number> {
  const wins = new Map(stats.map((s) => [s.design, 0]));
  for (let i = 0; i < draws; i++) {
    let best = "";
    let bestValue = -1;
    for (const s of stats) {
      const v = sampleBeta(1 + s.engaged, 1 + Math.max(0, s.sessions - s.engaged), rng);
      if (v > bestValue) {
        bestValue = v;
        best = s.design;
      }
    }
    wins.set(best, (wins.get(best) ?? 0) + 1);
  }
  return Object.fromEntries([...wins].map(([d, w]) => [d, w / draws]));
}

/**
 * Moves `target` into the box [lo, hi] per design while keeping the sum at one: values outside
 * their bounds are clamped and the remainder is spread evenly over the designs that can still
 * move. Bounds are assumed feasible (sum of lo <= 1 <= sum of hi).
 */
export function project(
  target: Record<string, number>,
  lo: Record<string, number>,
  hi: Record<string, number>
): Record<string, number> {
  const ids = Object.keys(target);
  const out = { ...target };
  for (let iter = 0; iter < 100; iter++) {
    for (const id of ids) out[id] = Math.min(hi[id], Math.max(lo[id], out[id]));
    const diff = 1 - ids.reduce((s, id) => s + out[id], 0);
    if (Math.abs(diff) < 1e-9) break;
    const free = ids.filter((id) =>
      diff > 0 ? out[id] < hi[id] - 1e-12 : out[id] > lo[id] + 1e-12
    );
    if (free.length === 0) break;
    for (const id of free) out[id] += diff / free.length;
  }
  return out;
}

/**
 * The daily weight update. Pure and seeded: the same input always gives the same weights.
 *
 * Rules, in order: the kill switch wins; at most one move per minimum interval; no move until
 * every design has the minimum number of engaged visits; then each design's weight heads toward
 * its probability of being best, at most `maxStep` per update, never below the floor. A design
 * whose guardrails regress against the baseline is capped at the floor, and one whose guardrails
 * are still unknown cannot rise above an equal share. The baseline is never capped and no design
 * is ever removed.
 */
export function updateWeights(input: BanditInput): { doc: WeightsDoc; log: WeightLogEntry } {
  const { designs, baseline, stats, previous, mode, now, rng } = input;
  const config = input.config ?? BANDIT;
  const from = previous ? { ...previous.weights } : equalWeights(designs);
  for (const d of designs) if (!(d in from)) from[d] = config.floor;
  const samples = Object.fromEntries(
    designs.map((d) => {
      const s = stats.find((x) => x.design === d);
      return [d, { sessions: s?.sessions ?? 0, engaged: s?.engaged ?? 0 }];
    })
  );
  const base = stats.find((s) => s.design === baseline);
  const guardrails: Record<string, GuardrailVerdict> = {};
  const guardrailReasons: string[] = [];
  for (const d of designs) {
    if (d === baseline) {
      guardrails[d] = "ok";
      continue;
    }
    const s = stats.find((x) => x.design === d);
    if (!s || !base) {
      guardrails[d] = "unknown";
      continue;
    }
    const v = guardrailVerdict(s.guardrails, base.guardrails);
    guardrails[d] = v.verdict;
    if (v.verdict === "regressed") guardrailReasons.push(`${d}: ${v.reasons.join(", ")}`);
  }

  const entry = (
    changed: boolean,
    reason: string,
    to: Record<string, number>,
    pBest: Record<string, number> | null = null
  ): WeightLogEntry => ({
    at: now.toISOString(),
    changed,
    reason,
    from,
    to,
    samples,
    probabilityBest: pBest,
    guardrails,
  });

  const docWith = (
    weights: Record<string, number>,
    docMode: WeightsDoc["mode"],
    forced?: string,
    bumpVersion = true
  ): WeightsDoc => ({
    version: bumpVersion || !previous ? now.toISOString() : previous.version,
    updatedAt: bumpVersion || !previous ? now.toISOString() : previous.updatedAt,
    mode: docMode,
    ...(forced ? { forced } : {}),
    weights,
  });

  if (mode.kind === "force") {
    const changed = previous?.mode !== "forced" || previous.forced !== mode.design;
    return {
      doc: docWith(from, "forced", mode.design, changed),
      log: entry(changed, `kill switch: everyone gets ${mode.design}`, from),
    };
  }
  if (mode.kind === "freeze") {
    const changed = previous?.mode !== "frozen";
    return {
      doc: docWith(from, "frozen", undefined, changed),
      log: entry(changed, "kill switch: weights frozen", from),
    };
  }

  const resumed = previous !== null && previous.mode !== "auto";
  const hold = (reason: string, pBest: Record<string, number> | null = null) => ({
    doc: docWith(from, "auto", undefined, resumed),
    log: entry(resumed, resumed ? `${reason}; automatic mode resumed` : reason, from, pBest),
  });

  const lastMove = previous ? Date.parse(previous.updatedAt) : NaN;
  if (Number.isFinite(lastMove) && now.getTime() - lastMove < config.minIntervalMs && !resumed) {
    return hold(`last change was under ${Math.round(config.minIntervalMs / 3_600_000)} h ago`);
  }

  const short = designs.filter((d) => samples[d].engaged < config.minEngagedPerDesign);
  // Guardrail caps apply even before there is enough data to move on the score.
  const lo: Record<string, number> = {};
  const hi: Record<string, number> = {};
  const equal = 1 / designs.length;
  for (const d of designs) {
    lo[d] = config.floor;
    hi[d] =
      guardrails[d] === "regressed"
        ? config.floor
        : guardrails[d] === "unknown"
          ? Math.max(equal, config.floor)
          : 1;
  }

  let target: Record<string, number>;
  let pBest: Record<string, number> | null = null;
  let reason: string;
  if (short.length > 0) {
    target = { ...from };
    reason = `waiting for ${config.minEngagedPerDesign} engaged visits per design (short: ${short
      .map((d) => `${d} ${samples[d].engaged}`)
      .join(", ")})`;
  } else {
    pBest = probabilityBest(
      designs.map(
        (d) =>
          stats.find((s) => s.design === d) ?? {
            design: d,
            sessions: 0,
            engaged: 0,
            switchedAway: 0,
            guardrails: base!.guardrails,
          }
      ),
      rng,
      config.draws
    );
    const leader = designs.reduce((a, b) => (pBest![a] >= pBest![b] ? a : b));
    // Confidence gate: probability matching alone wanders when designs are equal, because the
    // chance of being best never settles. Weights head toward it only as the leader's chance
    // climbs from `gateLow` to `gateHigh`; below that they drift back toward an even split.
    const gate = Math.min(
      1,
      Math.max(0, (pBest[leader] - config.gateLow) / (config.gateHigh - config.gateLow))
    );
    target = Object.fromEntries(designs.map((d) => [d, equal + (pBest![d] - equal) * gate]));
    reason = `Thompson sampling: ${leader} has a ${Math.round(pBest[leader] * 100)}% chance of the best engaged rate (${Math.round(gate * 100)}% of the way to matching it)`;
  }

  // Step limit around the previous weights; caps for regressed designs apply in full at once.
  const stepLo: Record<string, number> = {};
  const stepHi: Record<string, number> = {};
  for (const d of designs) {
    stepLo[d] = Math.min(hi[d], Math.max(lo[d], from[d] - config.maxStep));
    stepHi[d] = Math.max(stepLo[d], Math.min(hi[d], from[d] + config.maxStep));
  }
  const sum = (r: Record<string, number>) => designs.reduce((s, d) => s + r[d], 0);
  // If the caps leave the step box unable to reach a total of one, let uncapped designs move further.
  if (sum(stepHi) < 1) for (const d of designs) if (hi[d] === 1) stepHi[d] = 1;
  if (sum(stepLo) > 1) for (const d of designs) stepLo[d] = lo[d];

  const next = project(project(target, lo, hi), stepLo, stepHi);
  const to = Object.fromEntries(designs.map((d) => [d, round(next[d])]));
  const changed = designs.some((d) => Math.abs(to[d] - from[d]) >= 0.0005) || resumed;
  if (guardrailReasons.length > 0)
    reason += `; capped at the floor for guardrails: ${guardrailReasons.join("; ")}`;
  return {
    doc: changed ? docWith(to, "auto") : docWith(from, "auto", undefined, false),
    log: entry(changed, changed ? reason : `${reason}; no change`, changed ? to : from, pBest),
  };
}
