import type { WeightsDoc } from "./assignment";
import type { WeightLogEntry } from "./bandit";
import { BANDIT, MIN_VISITS_TO_REPORT } from "./config";
import type { Rng } from "./random";
import {
  credibleInterval,
  guardrailVerdict,
  type DesignStats,
  type GuardrailVerdict,
  type Guardrails,
} from "./score";

/** What the Worker serves at /results and the /experiments page shows. */
export type ResultsDoc = {
  generatedAt: string;
  /** Raw events older than this many days are deleted; the numbers cover this window. */
  windowDays: number;
  /** Set only by the dev-server stand-in: illustrative numbers, never real visitors. */
  sample?: boolean;
  weights: WeightsDoc;
  designs: DesignResult[];
  history: WeightLogEntry[];
  settings: {
    floor: number;
    minEngagedPerDesign: number;
    maxStep: number;
    minVisitsToReport: number;
  };
};

export type DesignResult = {
  design: string;
  /** Sessions on an automatic assignment to this design. */
  sessions: number;
  /** null below MIN_VISITS_TO_REPORT sessions, so a handful of visits cannot be singled out. */
  engaged: number | null;
  /** null below MIN_VISITS_TO_REPORT sessions, like engaged. */
  switchedAway: number | null;
  /** null below MIN_VISITS_TO_REPORT sessions: the page shows "not enough data". */
  rate: { mean: number; low: number; high: number } | null;
  weight: number;
  guardrails: Guardrails;
  verdict: GuardrailVerdict;
  verdictReasons: string[];
  /** Whether this design has the engaged visits it needs before its weight may move. */
  readyToMove: boolean;
};

/** Counts below the reporting threshold are withheld: only sessions (a plain visit total) stays. */
const enough = (sessions: number) => sessions >= MIN_VISITS_TO_REPORT;

/** The weight log with each design's engaged count withheld while it had too few visits. */
export function redactHistory(history: readonly WeightLogEntry[]): WeightLogEntry[] {
  return history.map((e) => ({
    ...e,
    samples: Object.fromEntries(
      Object.entries(e.samples).map(([d, s]) => [
        d,
        { sessions: s.sessions, engaged: enough(s.sessions) ? s.engaged : null },
      ])
    ),
  }));
}

export function buildResults(input: {
  stats: readonly DesignStats[];
  baseline: string;
  weights: WeightsDoc;
  history: WeightLogEntry[];
  now: Date;
  windowDays: number;
  rng: Rng;
}): ResultsDoc {
  const base = input.stats.find((s) => s.design === input.baseline);
  return {
    generatedAt: input.now.toISOString(),
    windowDays: input.windowDays,
    weights: input.weights,
    history: redactHistory(input.history),
    settings: {
      floor: BANDIT.floor,
      minEngagedPerDesign: BANDIT.minEngagedPerDesign,
      maxStep: BANDIT.maxStep,
      minVisitsToReport: MIN_VISITS_TO_REPORT,
    },
    designs: input.stats.map((s) => {
      const v =
        s.design === input.baseline
          ? { verdict: "ok" as const, reasons: ["the baseline every design is compared with"] }
          : base
            ? guardrailVerdict(s.guardrails, base.guardrails)
            : { verdict: "unknown" as const, reasons: [] };
      return {
        design: s.design,
        sessions: s.sessions,
        engaged: enough(s.sessions) ? s.engaged : null,
        switchedAway: enough(s.sessions) ? s.switchedAway : null,
        rate: enough(s.sessions) ? credibleInterval(s.engaged, s.sessions, input.rng) : null,
        weight: input.weights.weights[s.design] ?? 0,
        guardrails: s.guardrails,
        verdict: v.verdict,
        verdictReasons: v.reasons,
        readyToMove: s.engaged >= BANDIT.minEngagedPerDesign,
      };
    }),
  };
}
