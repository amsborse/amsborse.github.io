import { ENGAGED, GUARDRAILS } from "./config";
import { sampleBeta, type Rng } from "./random";

/**
 * One automatic-assignment session, reduced to what the score needs. The Worker builds these
 * from raw events with one SQL query; the tests build them directly.
 */
export type SessionSummary = {
  /** The design the visitor was assigned automatically. Only these sessions count. */
  design: string;
  visibleMs: number;
  maxScroll: number;
  /** Clicks on projects, writing, contact or outbound links. */
  keyClicks: number;
  /** The visitor switched away from the assigned design in the picker. */
  switchedAway: boolean;
};

/**
 * The primary score: a session is engaged at 30 s of visible time, or 50% scroll, or a click on a
 * project, writing, contact or outbound link. Switching away from the assigned design always
 * counts as not engaged, since the visitor told us they preferred another one.
 */
export function isEngaged(s: SessionSummary): boolean {
  if (s.switchedAway) return false;
  return (
    s.visibleMs >= ENGAGED.visibleMs || s.maxScroll >= ENGAGED.scrollPercent || s.keyClicks > 0
  );
}

/** Per-design guardrails. null means not enough samples to say. */
export type Guardrails = {
  lcpP75: number | null;
  lcpSamples: number;
  clsP75: number | null;
  clsSamples: number;
  /** JS errors per page view. */
  errorRate: number | null;
  pageviews: number;
};

export type DesignStats = {
  design: string;
  sessions: number;
  engaged: number;
  switchedAway: number;
  guardrails: Guardrails;
};

export function emptyGuardrails(): Guardrails {
  return {
    lcpP75: null,
    lcpSamples: 0,
    clsP75: null,
    clsSamples: 0,
    errorRate: null,
    pageviews: 0,
  };
}

/** Counts sessions and engaged sessions per design. Designs with no sessions still appear. */
export function tally(
  sessions: readonly SessionSummary[],
  designs: readonly string[],
  guardrails: Record<string, Guardrails> = {}
): DesignStats[] {
  return designs.map((design) => {
    const mine = sessions.filter((s) => s.design === design);
    return {
      design,
      sessions: mine.length,
      engaged: mine.filter(isEngaged).length,
      switchedAway: mine.filter((s) => s.switchedAway).length,
      guardrails: guardrails[design] ?? emptyGuardrails(),
    };
  });
}

/** The 75th percentile (nearest rank), or null below the minimum sample size. */
export function p75(
  values: readonly number[],
  minSamples: number = GUARDRAILS.minSamples
): number | null {
  if (values.length < minSamples || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(0.75 * sorted.length) - 1)];
}

export function buildGuardrails(input: {
  lcp: readonly number[];
  cls: readonly number[];
  errors: number;
  pageviews: number;
}): Guardrails {
  return {
    lcpP75: p75(input.lcp),
    lcpSamples: input.lcp.length,
    clsP75: p75(input.cls),
    clsSamples: input.cls.length,
    errorRate: input.pageviews >= GUARDRAILS.minSamples ? input.errors / input.pageviews : null,
    pageviews: input.pageviews,
  };
}

export type GuardrailVerdict = "ok" | "regressed" | "unknown";

/**
 * Compares a design with the editorial baseline. Regressed when any measured guardrail is
 * clearly worse; unknown when either side lacks samples for every guardrail it would need.
 */
export function guardrailVerdict(
  design: Guardrails,
  baseline: Guardrails
): { verdict: GuardrailVerdict; reasons: string[] } {
  const reasons: string[] = [];
  let unknown = false;
  if (design.lcpP75 === null || baseline.lcpP75 === null) unknown = true;
  else if (
    design.lcpP75 > baseline.lcpP75 * GUARDRAILS.lcpRatio &&
    design.lcpP75 > baseline.lcpP75 + GUARDRAILS.lcpSlackMs
  ) {
    reasons.push(`LCP p75 ${Math.round(design.lcpP75)} ms vs ${Math.round(baseline.lcpP75)} ms`);
  }
  if (design.clsP75 === null || baseline.clsP75 === null) unknown = true;
  else if (design.clsP75 > baseline.clsP75 + GUARDRAILS.clsDelta) {
    reasons.push(`CLS p75 ${design.clsP75.toFixed(3)} vs ${baseline.clsP75.toFixed(3)}`);
  }
  if (design.errorRate === null || baseline.errorRate === null) unknown = true;
  else if (design.errorRate > baseline.errorRate + GUARDRAILS.errorRateDelta) {
    reasons.push(
      `errors ${(design.errorRate * 100).toFixed(1)}% vs ${(baseline.errorRate * 100).toFixed(1)}% of page views`
    );
  }
  if (reasons.length > 0) return { verdict: "regressed", reasons };
  return { verdict: unknown ? "unknown" : "ok", reasons };
}

/** 95% credible interval of the engaged rate under a Beta(1 + engaged, 1 + not engaged) posterior. */
export function credibleInterval(
  engaged: number,
  sessions: number,
  rng: Rng,
  draws = 4000
): { mean: number; low: number; high: number } {
  const a = 1 + engaged;
  const b = 1 + Math.max(0, sessions - engaged);
  const samples = Array.from({ length: draws }, () => sampleBeta(a, b, rng)).sort((x, y) => x - y);
  return {
    mean: a / (a + b),
    low: samples[Math.floor(0.025 * (draws - 1))],
    high: samples[Math.ceil(0.975 * (draws - 1))],
  };
}
