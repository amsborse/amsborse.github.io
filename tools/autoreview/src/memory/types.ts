export type MemoryCategory =
  | "repository-preference"
  | "component-preference"
  | "route-preference"
  | "interaction-preference"
  | "animation-preference"
  | "responsive-preference"
  | "accessibility-preference"
  | "rejected-pattern"
  | "approved-pattern"
  | "explicit-constraint"
  | "historical-decision"
  | "temporary-task-feedback";

export type RuleLevel =
  "observation" | "task-rule" | "component-rule" | "route-rule" | "repository-rule";

export type FeedbackClassification = "approved" | "rejected" | "mixed" | "correction" | "neutral";

export type FeedbackStatus = "active" | "superseded" | "conflicting" | "archived";

export interface PreferencesFile {
  visualStyle: { preferred: string[]; avoid: string[] };
  interaction: { preferred: string[]; avoid: string[] };
  responsive: { avoid: string[]; preferred?: string[] };
  accessibility?: { preferred: string[]; avoid: string[] };
  animation?: { preferred: string[]; avoid: string[] };
  /** Empty until evidence exists — do not invent defaults */
  _meta?: {
    note: string;
    updatedAt?: string;
  };
}

export interface MemoryRule {
  id: string;
  rule: string;
  reason: string;
  confidence: number;
  level: RuleLevel;
  category: MemoryCategory;
  component?: string;
  route?: string;
  tags: string[];
  status: FeedbackStatus;
  sourceFeedbackId?: string;
  sourceDecisionId?: string;
  supersedes: string[];
  supersededBy?: string;
  conflictsWith?: string[];
  createdAt: string;
  updatedAt: string;
  observationCount?: number;
  viewport?: string;
}

export interface ComponentMemory {
  component: string;
  rules: MemoryRule[];
}

export interface DecisionRecord {
  id: string;
  createdAt: string;
  task: string;
  component?: string;
  route?: string;
  classification: FeedbackClassification;
  summary: string;
  approvedSolution?: string;
  rejectedSolution?: string;
  rejectionReason?: string;
  beforeScreenshot?: string;
  afterScreenshot?: string;
  difference?: string;
  ruleIds: string[];
  feedbackId: string;
  conflictingRuleIds?: string[];
}

export interface FeedbackRecord {
  id: string;
  createdAt: string;
  task: string;
  source: string;
  rawFeedback: string;
  scope: {
    repositoryWide: boolean;
    components: string[];
    routes: string[];
    files: string[];
    viewports: string[];
    interactions?: string[];
  };
  problem?: {
    category: string;
    description: string;
    rootCause?: string;
  };
  acceptedResolution?: {
    description: string;
    filesChanged: string[];
    verified?: boolean;
    userApproved?: boolean;
  };
  lesson?: {
    rule: string;
    avoid: string;
    prefer: string;
  };
  confidence: number;
  status: FeedbackStatus;
  supersedes: string[];
  tags: string[];
  classification?: FeedbackClassification;
  level?: RuleLevel;
  decisionId?: string;
}

export interface FeedbackExtraction {
  classification: FeedbackClassification;
  objectiveIssues: string[];
  subjectivePreferences: string[];
  explicitConstraints: string[];
  rejectedPatterns: string[];
  acceptedPatterns: string[];
  componentRules: string[];
  repositoryRules: string[];
  temporaryRules: string[];
  confidence: number;
  needsUserConfirmation: boolean;
  detectedViewports?: string[];
  detectedComponents?: string[];
}

export interface MemoryIndex {
  components: Record<string, string[]>;
  routes: Record<string, string[]>;
  tags: Record<string, string[]>;
  files: Record<string, string[]>;
  interactions: Record<string, string[]>;
  superseded: Record<string, string>;
  decisions: string[];
  feedback: string[];
  updatedAt: string;
}

export interface MemoryQuery {
  components?: string[];
  routes?: string[];
  files?: string[];
  tags?: string[];
  interactions?: string[];
  viewports?: string[];
  task?: string;
  concepts?: string[];
}

export interface RetrievedMemory {
  rules: MemoryRule[];
  rejectedPatterns: Array<{
    id: string;
    name: string;
    avoid: string;
    prefer: string;
    confidence: number;
    sourceDecisionId?: string;
  }>;
  decisions: DecisionRecord[];
  applicableByComponent: Record<string, string[]>;
  tokensUsed: number;
  excluded: string[];
}

export interface MemoryReportSection {
  rulesLoaded: string[];
  historicalDecisionsApplied: string[];
  newFeedbackCaptured: string[];
  rulesCreated: string[];
  rulesUpdated: string[];
  rejectedPatternsAdded: string[];
  conflictsDetected: string[];
  rulesRequiringConfirmation: string[];
  memoryTokensUsed: number;
}

export interface MemoryLimits {
  maxRawFeedbackChars: number;
  maxScreenshotManifestBytes: number;
  maxRulesLoaded: number;
  maxRejectedPatterns: number;
  maxHistoricalDecisions: number;
  maxMemoryContextTokens: number;
  maxDecisionsBeforeCompactWarning: number;
}

export const DEFAULT_MEMORY_LIMITS: MemoryLimits = {
  maxRawFeedbackChars: 8_000,
  maxScreenshotManifestBytes: 64_000,
  maxRulesLoaded: 10,
  maxRejectedPatterns: 5,
  maxHistoricalDecisions: 3,
  maxMemoryContextTokens: 4_000,
  maxDecisionsBeforeCompactWarning: 200,
};
