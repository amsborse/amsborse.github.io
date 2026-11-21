/**
 * Design experiment settings shared by the site, the Cloudflare Worker and the tests.
 * The privacy contract and the setup steps live in docs/experiments.md. Nothing here may touch
 * browser or Vite globals: the Worker imports this file too (the endpoint is in endpoint.ts).
 */

/** localStorage keys. The picker's own key ("portfolio-design") lives in theme/design.ts. */
export const ASSIGNMENT_STORAGE_KEY = "portfolio-design-assignment";
export const VISITOR_STORAGE_KEY = "portfolio-exp-visitor";
export const LAST_VISIT_STORAGE_KEY = "portfolio-exp-last-visit";
/** sessionStorage key for the tab's session. */
export const SESSION_STORAGE_KEY = "portfolio-exp-session";

/** How long the first visit waits for weights before falling back to the default design. */
export const WEIGHTS_TIMEOUT_MS = 1500;

/** A session ends after this much inactivity (no event of any kind). */
export const SESSION_IDLE_MS = 30 * 60 * 1000;
/** A return visit counts when the previous session started within this window. */
export const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The primary score: an "engaged visit" is a session on the assigned design that reaches ANY of
 * these, without switching away from the assigned design in the picker.
 */
export const ENGAGED = {
  visibleMs: 30_000,
  scrollPercent: 50,
  /** Click kinds that count as meaningful. */
  clicks: ["project", "writing", "contact", "outbound"] as const,
};

/** A quick bounce: the session left within this much visible time without scrolling or clicking. */
export const BOUNCE = { visibleMs: 10_000, maxScrollPercent: 25 };

/** Batching: flush when this many events are queued, or on this interval, or when the tab hides. */
export const BATCH = { maxEvents: 20, intervalMs: 30_000, maxBodyBytes: 16_000 };

/** Bandit settings. The reasoning behind each number is in docs/experiments.md. */
export const BANDIT = {
  /** Every design keeps at least this share of new visitors. */
  floor: 0.1,
  /** Engaged visits every design needs before any weight moves away from where it is. */
  minEngagedPerDesign: 100,
  /** The largest change to one design's weight in a single update. */
  maxStep: 0.15,
  /** Weights update at most this often. */
  minIntervalMs: 20 * 60 * 60 * 1000,
  /** Monte Carlo draws used to estimate each design's chance of being best. */
  draws: 20_000,
  /**
   * Confidence gate. Weights follow the chance of being best only as the leader's chance rises
   * from gateLow (no move, drift back to even) to gateHigh (full probability matching), so equal
   * designs do not wander on noise while a clearly better one still wins traffic.
   */
  gateLow: 0.8,
  gateHigh: 0.95,
};

/** Guardrails, judged against editorial once both sides have enough samples. */
export const GUARDRAILS = {
  minSamples: 30,
  /** p75 LCP may be at most this much worse than editorial's, in ratio and in ms. */
  lcpRatio: 1.2,
  lcpSlackMs: 250,
  /** p75 CLS may be at most this much above editorial's. */
  clsDelta: 0.05,
  /** JS errors per page view may be at most this much above editorial's. */
  errorRateDelta: 0.02,
};

/** Results view: below this many visits a rate is "not enough data". */
export const MIN_VISITS_TO_REPORT = 30;
