/**
 * Where the experiment Worker lives. Empty means experiments are off: nobody is randomised,
 * nothing is sent and every visitor sees the default design. In development the Vite plugin in
 * scripts/vite-plugin-experiments-dev.ts serves a local stand-in at /__experiments.
 */
export const EXPERIMENTS_ENDPOINT: string = (
  (import.meta.env.VITE_EXPERIMENTS_URL as string | undefined) ??
  (import.meta.env.DEV ? "/__experiments" : "")
).replace(/\/$/, "");
