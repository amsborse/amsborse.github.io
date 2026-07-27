import type { Finding, ReviewMode, Severity, Viewport } from "../types.ts";

export type PlaywrightProjectName =
  "chromium-desktop" | "chromium-mobile" | "webkit-desktop" | "firefox-desktop" | "reduced-motion";

export interface PlaywrightProjectDef {
  name: PlaywrightProjectName;
  browser: "chromium" | "webkit" | "firefox";
  viewport: Viewport;
  reducedMotion?: boolean;
  deviceScaleFactor?: number;
}

export type SurfaceKind =
  | "storybook"
  | "component-preview"
  | "showcase-route"
  | "test-harness"
  | "route-section"
  | "full-route";

export interface ReviewSurface {
  kind: SurfaceKind;
  route: string;
  selector: string;
  component?: string;
  changedFile?: string;
  reason: string;
}

export interface ElementGeometry {
  selector: string;
  tag: string;
  boundingRect: { x: number; y: number; width: number; height: number };
  clientRect: { width: number; height: number };
  scroll: { width: number; height: number };
  margin: string;
  padding: string;
  borderWidth: string;
  position: string;
  transform: string;
  overflow: string;
  zIndex: string;
  visibility: string;
  opacity: string;
  pointerEvents: string;
  text?: { width: number; height: number; fontSize: string; lineHeight: string };
}

export interface VisualIssueEvidence {
  category: string;
  severity: Severity;
  confidence: number;
  component?: string;
  route?: string;
  viewport?: string;
  state?: string;
  selector?: string;
  sourceFile?: string;
  boundingRects?: ElementGeometry["boundingRect"][];
  markedScreenshot?: string;
  traceOrTiming?: string;
  explanation: string;
  recommendedFix?: string;
  deterministic: boolean;
}

export interface StateManifestEntry {
  name: string;
  required: boolean;
  reason?: string;
}

export interface StateManifest {
  component: string;
  sourceFiles: string[];
  states: StateManifestEntry[];
}

export interface InteractionTimingReport {
  interactionId: string;
  inputTimestamp: number;
  firstDomMutationMs?: number;
  firstStyleChangeMs?: number;
  animationStartMs?: number;
  stableFinalStateMs?: number;
  inputToFeedbackMs?: number;
  inputToAnimationMs?: number;
  totalTransitionMs?: number;
  warnings: string[];
}

export interface AnimationSmoothnessReport {
  interactionId: string;
  frameIntervalsMs: number[];
  framesAbove24ms: number;
  framesAbove50ms: number;
  longestFrameIntervalMs: number;
  longTasksAbove50ms: number;
  layoutShiftCount: number;
  animationStartDelayMs?: number;
  finalStateJump: boolean;
  note: string;
}

export interface BaselineRecord {
  id: string;
  component: string;
  route: string;
  selector: string;
  state: string;
  viewport: string;
  screenshotHash: string;
  screenshotPath?: string;
  sourceCommit: string;
  approvalStatus: "approved" | "pending" | "revoked";
  approvedAt?: string;
  memoryDecisionIds: string[];
  maskSelectors?: string[];
}

export interface BaselineDiffResult {
  baselineId: string;
  classification:
    | "expected-task-change"
    | "unexpected-regression"
    | "environment-instability"
    | "baseline-no-longer-applicable"
    | "requires-human-review"
    | "match";
  diffRatio?: number;
  details: string;
}

export interface VisualQualityReport {
  projectsExecuted: PlaywrightProjectName[];
  routesOpened: string[];
  routesSkipped: string[];
  surfaces: ReviewSurface[];
  componentsInspected: string[];
  statesInspected: string[];
  geometryFindings: Finding[];
  decorativeLineFindings: Finding[];
  typographyFindings: Finding[];
  zIndexFindings: Finding[];
  animationTiming: InteractionTimingReport[];
  animationSmoothness: AnimationSmoothnessReport[];
  longTasks: number;
  layoutShifts: number;
  crossBrowserDifferences: string[];
  baselineComparisons: BaselineDiffResult[];
  flakyEvidence: string[];
  traces: string[];
  retriesUsed: number;
  tokenFindings: Finding[];
  a11yFindings: Finding[];
  pagesFindings: Finding[];
}

export interface VisualThresholds {
  textToEdgePx: number;
  interactiveToEdgePx: number;
  cardContentToBorderPx: number;
  primaryFeedbackMs: number;
  animationStartMs: number;
  microInteractionMs: number;
  componentTransitionMs: number;
  hardFeedbackMs: number;
  layoutShiftBudget: number;
  minFontPx: number;
  intentionalOverlaySelectors: string[];
  decorativeExclusions: string[];
}

export const DEFAULT_VISUAL_THRESHOLDS: VisualThresholds = {
  textToEdgePx: 8,
  interactiveToEdgePx: 6,
  cardContentToBorderPx: 8, // Tailwind spacing approx; overridden by tokens when present
  primaryFeedbackMs: 100,
  animationStartMs: 150,
  microInteractionMs: 350,
  componentTransitionMs: 600,
  hardFeedbackMs: 250,
  layoutShiftBudget: 0.1,
  minFontPx: 12,
  intentionalOverlaySelectors: [
    "[data-overlay-intentional]",
    "[data-testid='intentional-overlay']",
    ".modal-backdrop",
  ],
  decorativeExclusions: [
    "[data-viz]",
    "[data-diagram]",
    "canvas",
    ".three-canvas",
    "[data-testid='god-sphere']",
  ],
};

export function projectsForMode(
  mode: ReviewMode,
  override?: PlaywrightProjectName[]
): PlaywrightProjectName[] {
  if (override?.length) return override;
  if (mode === "thorough") {
    return [
      "chromium-desktop",
      "chromium-mobile",
      "webkit-desktop",
      "firefox-desktop",
      "reduced-motion",
    ];
  }
  // Fast default: Chromium desktop only unless caller expands for responsive.
  return ["chromium-desktop"];
}

export function projectDefinitions(): PlaywrightProjectDef[] {
  return [
    {
      name: "chromium-desktop",
      browser: "chromium",
      viewport: { name: "desktop", width: 1440, height: 900 },
      deviceScaleFactor: 1,
    },
    {
      name: "chromium-mobile",
      browser: "chromium",
      viewport: { name: "mobile", width: 390, height: 844 },
      deviceScaleFactor: 2,
    },
    {
      name: "webkit-desktop",
      browser: "webkit",
      viewport: { name: "desktop", width: 1440, height: 900 },
    },
    {
      name: "firefox-desktop",
      browser: "firefox",
      viewport: { name: "desktop", width: 1440, height: 900 },
    },
    {
      name: "reduced-motion",
      browser: "chromium",
      viewport: { name: "desktop", width: 1440, height: 900 },
      reducedMotion: true,
    },
  ];
}

export function evidenceToFinding(
  e: VisualIssueEvidence,
  idPrefix: string,
  index: number
): Finding {
  return {
    id: `${idPrefix}-${index}`,
    severity: e.severity,
    confidence: e.confidence,
    category: (e.category as Finding["category"]) || "layout",
    component: e.component,
    selector: e.selector,
    file: e.sourceFile,
    route: e.route,
    explanation: [
      e.explanation,
      e.viewport ? `viewport=${e.viewport}` : "",
      e.state ? `state=${e.state}` : "",
      e.markedScreenshot ? `screenshot=${e.markedScreenshot}` : "",
      e.traceOrTiming ? `timing=${e.traceOrTiming}` : "",
      e.deterministic ? "source=deterministic" : "source=critic-derived",
    ]
      .filter(Boolean)
      .join(" | "),
    recommendedFix: e.recommendedFix,
    source: e.deterministic ? "deterministic" : "ai-critic",
  };
}
