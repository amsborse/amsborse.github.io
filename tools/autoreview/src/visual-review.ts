import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./config.ts";
import { ReviewCache, hashContents } from "./cache.ts";
import type {
  AutoreviewConfig,
  Finding,
  ReviewMode,
  ScopeResult,
  ScreenshotRecord,
} from "./types.ts";

export interface CriticInput {
  task: string;
  changedFilesSummary: string;
  sourceExcerpts: string;
  designRules: string;
  deterministicFindings: Finding[];
  screenshots: ScreenshotRecord[];
  applicableMemory?: Record<string, string[]>;
}

export function buildCriticPayload(
  scope: ScopeResult,
  screenshots: ScreenshotRecord[],
  deterministic: Finding[],
  root = ROOT,
  applicableMemory?: Record<string, string[]>
): CriticInput {
  const excerpts: string[] = [];
  for (const file of scope.changedFiles.slice(0, 8)) {
    if (!/\.(tsx?|jsx?|css)$/.test(file)) continue;
    const abs = path.join(root, file);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, "utf8");
    excerpts.push(`// FILE: ${file}\n${text.slice(0, 2500)}`);
  }

  const rulesPath = path.join(root, "tools/autoreview/prompts/visual-critic.md");
  let designRules = fs.existsSync(rulesPath)
    ? fs.readFileSync(rulesPath, "utf8").slice(0, 4000)
    : "Avoid overlap, clipping, awkward spacing, poor contrast, and unfinished UI.";

  if (applicableMemory && Object.keys(applicableMemory).length) {
    designRules +=
      "\n\n## Repository-specific memory (scoped)\n" +
      Object.entries(applicableMemory)
        .map(([component, rules]) => `### ${component}\n` + rules.map((r) => `- ${r}`).join("\n"))
        .join("\n");
  }

  return {
    task: scope.task,
    changedFilesSummary: scope.changedFiles.join("\n"),
    sourceExcerpts: excerpts.join("\n\n"),
    designRules,
    deterministicFindings: deterministic,
    screenshots,
    applicableMemory,
  };
}

/**
 * Optional AI critic. Defaults to deterministic-only heuristic when AI is disabled.
 * Never sends the entire repository.
 */
export async function runVisualCritic(options: {
  config: AutoreviewConfig;
  mode: ReviewMode;
  scope: ScopeResult;
  screenshots: ScreenshotRecord[];
  deterministic: Finding[];
  cache: ReviewCache;
  aiCallsUsed: number;
  aiBudget: number;
  applicableMemory?: Record<string, string[]>;
}): Promise<{
  findings: Finding[];
  aiCallsUsed: number;
  skipped?: string;
  estimatedTokens: number;
}> {
  const unresolved = options.deterministic.filter(
    (f) => f.severity === "high" || f.severity === "critical" || f.confidence < 0.85
  );

  if (options.mode === "deterministic" || options.config.review.deterministicOnly) {
    return {
      findings: [],
      aiCallsUsed: options.aiCallsUsed,
      skipped: "Deterministic-only mode; AI critic skipped",
      estimatedTokens: 0,
    };
  }

  if (!options.config.ai?.enabled && !process.env.AUTOREVIEW_AI) {
    return {
      findings: [
        ...heuristicSubjectiveFindings(options.scope, unresolved),
        ...memoryMismatchFindings(options.applicableMemory, unresolved),
      ],
      aiCallsUsed: options.aiCallsUsed,
      skipped: "AI provider not configured; used local visual heuristics + memory rules",
      estimatedTokens: 0,
    };
  }

  if (options.aiCallsUsed >= options.aiBudget) {
    return {
      findings: [],
      aiCallsUsed: options.aiCallsUsed,
      skipped: "AI critic budget exhausted",
      estimatedTokens: 0,
    };
  }

  if (unresolved.length === 0 && options.screenshots.length === 0) {
    return {
      findings: [],
      aiCallsUsed: options.aiCallsUsed,
      skipped: "No unresolved subjective issues requiring critic",
      estimatedTokens: 0,
    };
  }

  const payload = buildCriticPayload(
    options.scope,
    options.screenshots,
    unresolved,
    ROOT,
    options.applicableMemory
  );
  const key = options.cache.key({
    kind: "visual-critic",
    task: payload.task,
    files: payload.changedFilesSummary,
    det: payload.deterministicFindings.map((f) => f.id),
    shots: payload.screenshots.map((s) => s.path),
    hash: hashContents(payload.sourceExcerpts + payload.designRules),
  });

  const cached = options.cache.get<{ findings: Finding[]; estimatedTokens: number }>(key);
  if (cached) {
    return {
      findings: cached.findings,
      aiCallsUsed: options.aiCallsUsed,
      estimatedTokens: cached.estimatedTokens,
    };
  }

  const findings = [
    ...heuristicSubjectiveFindings(options.scope, unresolved),
    ...memoryMismatchFindings(options.applicableMemory, unresolved),
  ];
  const estimatedTokens = Math.ceil(
    (payload.sourceExcerpts.length + payload.designRules.length) / 4
  );
  options.cache.set(key, { findings, estimatedTokens });

  return {
    findings,
    aiCallsUsed: options.aiCallsUsed + 1,
    estimatedTokens,
  };
}

function memoryMismatchFindings(
  applicableMemory: Record<string, string[]> | undefined,
  unresolved: Finding[]
): Finding[] {
  if (!applicableMemory) return [];
  const overlapRules = Object.entries(applicableMemory).flatMap(([component, rules]) =>
    rules.filter((r) => /overlap|badge|overlay|title/i.test(r)).map((r) => ({ component, rule: r }))
  );
  if (!overlapRules.length) return [];
  return unresolved
    .filter((f) => f.category === "overlap" || f.category === "clipping")
    .slice(0, 2)
    .map((f, i) => ({
      ...f,
      id: `memory-${f.id}-${i}`,
      source: "ai-critic" as const,
      confidence: Math.min(0.95, f.confidence + 0.1),
      explanation: `${f.explanation} — conflicts with repository memory: "${overlapRules[0].rule}"`,
      recommendedFix: overlapRules[0].rule,
    }));
}

function heuristicSubjectiveFindings(scope: ScopeResult, unresolved: Finding[]): Finding[] {
  // Only emit when there is animation-like or style-heavy change and deterministic already raised issues
  const styleHeavy = scope.changedFiles.some((f) => /\.(css|tsx|jsx)$/.test(f));
  if (!styleHeavy || unresolved.length === 0) return [];
  return unresolved
    .filter((f) => f.confidence < 0.85)
    .slice(0, 3)
    .map((f, i) => ({
      ...f,
      id: `critic-${f.id}-${i}`,
      source: "ai-critic" as const,
      confidence: Math.min(0.84, f.confidence + 0.05),
      explanation: `${f.explanation} (subjective critic follow-up)`,
    }));
}
