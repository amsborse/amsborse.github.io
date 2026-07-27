export type ReviewMode = "fast" | "thorough" | "deterministic";

export type FinalStatus =
  "Passed" | "Passed with warnings" | "Failed" | "Budget exhausted" | "Needs user visual approval";

export type Severity = "critical" | "high" | "medium" | "low";

export type FindingCategory =
  | "overlap"
  | "clipping"
  | "overflow"
  | "spacing"
  | "alignment"
  | "typography"
  | "contrast"
  | "responsiveness"
  | "accessibility"
  | "interaction"
  | "animation"
  | "asset-path"
  | "runtime"
  | "network"
  | "layout"
  | "focus"
  | "touch-target"
  | "generic";

export interface Viewport {
  name: string;
  width: number;
  height: number;
}

export interface BudgetConfig {
  maxChangedSourceFiles: number;
  maxAffectedRoutes: number;
  maxScreenshots: number;
  maxBrowserInteractions: number;
  maxAiCriticCalls: number;
  maxRepairIterations: number;
  maxTestExecutionMs: number;
  dependencyDepth: number;
  reverseDependencyDepth: number;
}

export interface AutoreviewConfig {
  baseBranch: string;
  app: {
    devCommand: string;
    buildCommand: string;
    previewCommand: string;
    url: string;
    basePath: string;
    port: number;
  };
  scope: {
    dependencyDepth: number;
    reverseDependencyDepth: number;
    maxFiles: number;
    maxRoutes: number;
  };
  browser: {
    maxScreenshots: number;
    maxInteractions: number;
    viewports: Viewport[];
  };
  review: {
    mode: ReviewMode;
    maxCriticCalls: number;
    maxRepairIterations: number;
    maxTestExecutionMs: number;
    deterministicOnly: boolean;
  };
  githubPages: {
    enabled: boolean;
    validateBasePath: boolean;
    validateStaticAssets: boolean;
    usesHashRouter: boolean;
  };
  budgets: {
    fast: BudgetConfig;
    thorough: BudgetConfig;
  };
  ai?: {
    enabled: boolean;
    provider?: string;
    model?: string;
  };
}

export interface FileSnapshot {
  path: string;
  hash: string | null;
  status: "modified" | "staged" | "untracked" | "clean";
}

export interface TaskSession {
  id: string;
  task: string;
  startedAt: string;
  commit: string;
  baseBranch: string;
  stagedFiles: string[];
  unstagedFiles: string[];
  untrackedFiles: string[];
  fileHashes: Record<string, string | null>;
  finishedAt?: string;
}

export interface ScopeResult {
  task: string;
  sessionPresent: boolean;
  isolationWarning?: string;
  changedFiles: string[];
  affectedComponents: string[];
  affectedRoutes: string[];
  affectedTests: string[];
  affectedInteractions: string[];
  supportingFiles: string[];
  excludedFiles: string[];
  inclusionReasons: Record<string, string>;
  expandedScope: string[];
  expansionReasons: Record<string, string>;
  budgetsApplied: BudgetConfig;
  mode: ReviewMode;
}

export interface Finding {
  id: string;
  severity: Severity;
  confidence: number;
  category: FindingCategory;
  component?: string;
  selector?: string;
  file?: string;
  route?: string;
  explanation: string;
  recommendedFix?: string;
  source: "deterministic" | "ai-critic" | "test" | "runtime" | "interaction" | "animation";
  repaired?: boolean;
}

export interface InteractionSpec {
  id: string;
  sourceFiles: string[];
  route: string;
  trigger: {
    type: "click" | "hover" | "keyboard" | "submit" | "focus";
    selector: string;
    key?: string;
  };
  expected: Array<{
    type: "visible" | "hidden" | "url" | "text" | "enabled" | "disabled";
    selector?: string;
    value?: string;
  }>;
}

export interface ScreenshotRecord {
  id: string;
  path: string;
  changedSourceFile?: string;
  component?: string;
  route: string;
  selector?: string;
  viewport: Viewport;
  reason: string;
  task?: string;
  state?: string;
  interaction?: string;
}

export interface CheckResult {
  name: string;
  passed: boolean;
  skipped?: boolean;
  skipReason?: string;
  details?: string;
  durationMs?: number;
  findings?: Finding[];
}

export interface GateResult {
  name: string;
  passed: boolean;
  details: string;
  skipped?: boolean;
}

export interface RepairAction {
  findingId: string;
  file?: string;
  description: string;
  confidence: number;
  applied: boolean;
  result?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: string[];
}

export interface ReviewReport {
  wording: "Verification completed for the current task scope.";
  task: string;
  mode: ReviewMode;
  checksProfile?: string;
  finalStatus?: FinalStatus;
  session: TaskSession | null;
  isolationWarning?: string;
  startedAt?: string;
  completedAt: string;
  baseBranch?: string;
  gitState?: string;
  implementationSummary?: Array<{
    title: string;
    files: string[];
    components: string[];
    routes: string[];
    changes: string[];
    reason?: string;
  }>;
  fileChangeTable?: Array<{
    file: string;
    changeType: "Added" | "Modified" | "Deleted" | "Renamed" | "Generated";
    purpose: string;
  }>;
  changedFiles: string[];
  componentsReviewed: string[];
  routesReviewed: string[];
  routesNotOpened: string[];
  inclusionReasons: Record<string, string>;
  excludedFiles: string[];
  excludedRoutes: string[];
  testsExecuted: string[];
  checksSkipped: Array<{ name: string; reason: string }>;
  interactionsExecuted: string[];
  viewportsTested?: string[];
  browsersUsed?: string[];
  statesTested?: string[];
  screenshots: ScreenshotRecord[];
  issuesFound: Finding[];
  repairsApplied: RepairAction[];
  remainingIssues: Finding[];
  riskBasedExpansion: string[];
  recommendedOptionalChecks?: string[];
  cache: CacheStats;
  screenshotUsage: { used: number; budget: number };
  aiCallsUsed: { used: number; budget: number };
  estimatedTokenUsage: number;
  testDurationMs?: number;
  gates: GateResult[];
  gatesPassed: boolean;
  budgetExhausted: boolean;
  checkResults: CheckResult[];
  memory?: {
    rulesLoaded: string[];
    historicalDecisionsApplied: string[];
    newFeedbackCaptured: string[];
    rulesCreated: string[];
    rulesUpdated: string[];
    rejectedPatternsAdded: string[];
    conflictsDetected: string[];
    rulesRequiringConfirmation: string[];
    memoryTokensUsed: number;
    applicableByComponent: Record<string, string[]>;
  };
  visualQuality?: {
    projectsExecuted: string[];
    routesOpened: string[];
    routesSkipped: string[];
    componentsInspected: string[];
    statesInspected: string[];
    geometryFindingCount: number;
    decorativeLineFindingCount: number;
    typographyFindingCount: number;
    animationTiming: Array<{ interactionId: string; warnings: string[] }>;
    longTasks: number;
    layoutShifts: number;
    crossBrowserDifferences: string[];
    baselineComparisons: Array<{ baselineId: string; classification: string; details: string }>;
    flakyEvidence: string[];
    retriesUsed: number;
    traces: string[];
  };
}
