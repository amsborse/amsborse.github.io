/**
 * Quality tiers for the SUTRA hero scene (#462). A scene starts at the best tier its screen
 * allows, measures its own GPU time with timestamp queries, and steps down one tier at a time
 * while a frame costs more than the budget. It never steps back up: a cheaper tier always
 * measures faster, which would only argue for climbing again.
 */
export type Tier = "full" | "half" | "minimal";

export interface TierSettings {
  /** Device pixel ratio cap for the canvas and the scene's full-resolution passes. */
  dpr: number;
  /** Bloom, haze, shafts and streaks start at 1/4 (2) or 1/8 (3) of the scene's resolution. */
  effects: 2 | 3;
  /** Share of the incoming signals simulated and drawn. */
  particles: number;
  shafts: boolean;
  streaks: boolean;
  /** Glass bends the light behind it; without it the band is tinted but straight. */
  refraction: boolean;
}

export const TIERS: Record<Tier, TierSettings> = {
  full: { dpr: 1.5, effects: 2, particles: 1, shafts: true, streaks: true, refraction: true },
  half: { dpr: 1.25, effects: 3, particles: 0.6, shafts: true, streaks: false, refraction: true },
  minimal: {
    dpr: 1,
    effects: 3,
    particles: 0.3,
    shafts: false,
    streaks: false,
    refraction: false,
  },
};

/** GPU milliseconds a frame may take. The full tier is sized to fit it on an integrated GPU. */
export const BUDGET_MS = 4;

/** The tier to use after measuring frames at `tier`: one step down if the median is over budget. */
export function nextTier(tier: Tier, frameMs: readonly number[]): Tier {
  const sorted = [...frameMs].sort((a, b) => a - b);
  const median = sorted[sorted.length >> 1] ?? 0;
  if (median <= BUDGET_MS) return tier;
  return tier === "full" ? "half" : "minimal";
}
