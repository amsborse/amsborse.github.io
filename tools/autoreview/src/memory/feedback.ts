import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../config.ts";
import { extractFeedback } from "./extract.ts";
import {
  rebuildIndex,
  loadComponentMemory,
  saveComponentMemory,
  allComponentRules,
} from "./index-builder.ts";
import { applySupersession, resolveContradiction } from "./contradict.ts";
import {
  countRelatedFeedback,
  initialLevel,
  promoteRule,
  shouldPromoteToComponentRule,
  shouldPromoteToRepositoryRule,
  userSaidEverywhere,
} from "./promote.ts";
import {
  ensureMemoryLayout,
  emptyPreferences,
  listJsonFiles,
  memoryRoot,
  readJson,
  writeJson,
  sanitizeComponentName,
} from "./store.ts";
import {
  DEFAULT_MEMORY_LIMITS,
  type DecisionRecord,
  type FeedbackRecord,
  type MemoryCategory,
  type MemoryReportSection,
  type MemoryRule,
  type PreferencesFile,
  type RuleLevel,
} from "./types.ts";

export interface AddFeedbackInput {
  feedback: string;
  task?: string;
  component?: string;
  route?: string;
  files?: string[];
  source?: string;
  viewport?: string;
  tags?: string[];
  fixApplied?: string;
  filesChanged?: string[];
  verificationPassed?: boolean;
  userApproved?: boolean;
  beforeScreenshot?: string;
  afterScreenshot?: string;
  rejectedSolution?: string;
  rootCause?: string;
  category?: string;
  /** Prefer storage as temporary unless evidence supports promotion */
  forceLevel?: RuleLevel;
}

let feedbackSeq = 0;

function nextId(prefix: string, root = ROOT): string {
  const d = new Date();
  const day = d.toISOString().slice(0, 10).replace(/-/g, "");
  const stamp = `${d.getUTCHours()}${d.getUTCMinutes()}${d.getUTCSeconds()}${d.getUTCMilliseconds()}`;
  feedbackSeq += 1;
  const base = ensureMemoryLayout(root);
  let candidate = "";
  for (let attempt = 0; attempt < 50; attempt++) {
    candidate = `${prefix}-${day}-${stamp}-${String(feedbackSeq + attempt).padStart(3, "0")}`;
    const paths = [
      path.join(base, "feedback", "processed", `${candidate}.json`),
      path.join(base, "decisions", `${candidate}.json`),
      path.join(base, "components", `${candidate}.json`),
    ];
    // Also avoid colliding rule ids stored inside component files by using entropy
    const existsAsFile = paths.some((p) => fs.existsSync(p));
    if (!existsAsFile) break;
  }
  return `${candidate}-${Math.random().toString(36).slice(2, 6)}`;
}

export function redactFeedbackText(text: string): string {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]")
    .replace(/\b(sk|pk|ghp|github_pat)_[A-Za-z0-9]+\b/g, "[REDACTED_SECRET]")
    .replace(/\b(api[_-]?key|token|password|secret)\s*[:=]\s*\S+/gi, "$1=[REDACTED]")
    .slice(0, DEFAULT_MEMORY_LIMITS.maxRawFeedbackChars);
}

export function addFeedback(
  input: AddFeedbackInput,
  root = ROOT
): {
  feedback: FeedbackRecord;
  decision?: DecisionRecord;
  report: MemoryReportSection;
} {
  const base = ensureMemoryLayout(root);
  const rawFeedback = redactFeedbackText(input.feedback);
  if (!rawFeedback.trim()) {
    throw new Error("Feedback is empty after redaction");
  }

  const extraction = extractFeedback({
    feedback: rawFeedback,
    task: input.task,
    component: input.component,
    route: input.route,
    files: input.files,
    beforeScreenshotDesc: input.beforeScreenshot,
    afterScreenshotDesc: input.afterScreenshot,
    verificationPassed: input.verificationPassed,
    fixApplied: input.fixApplied,
  });

  const components = unique([
    ...(input.component ? [input.component] : []),
    ...(extraction.detectedComponents || []),
  ]);
  const viewports = unique([
    ...(input.viewport ? [input.viewport] : []),
    ...(extraction.detectedViewports || []),
  ]);

  const everywhere = userSaidEverywhere(rawFeedback);
  const level =
    input.forceLevel ||
    initialLevel({
      repositoryWideExplicit: everywhere,
      componentExplicit: Boolean(input.component) || components.length > 0,
      extractionHasRepoRules: extraction.repositoryRules.length > 0 && everywhere,
    });

  const verifiedObjective =
    Boolean(input.verificationPassed) &&
    extraction.objectiveIssues.length > 0 &&
    Boolean(input.fixApplied);

  // Subjective + unapproved stays observation until confirmed
  const effectiveLevel: RuleLevel =
    extraction.needsUserConfirmation &&
    extraction.subjectivePreferences.length > 0 &&
    !input.userApproved &&
    !verifiedObjective
      ? "observation"
      : level;

  const id = nextId("feedback", root);
  const now = new Date().toISOString();

  const lessonRule =
    extraction.componentRules[0] ||
    extraction.objectiveIssues[0] ||
    extraction.explicitConstraints[0] ||
    rawFeedback;

  const prefer =
    input.fixApplied ||
    extraction.acceptedPatterns[0] ||
    "Prefer layout/flow that preserves hierarchy without overlap or clutter.";
  const avoid =
    extraction.rejectedPatterns[0] ||
    (OVERLAP_HINT(rawFeedback)
      ? "Overlaying chrome on variable-length text"
      : "Repeating the reported visual/interaction defect");

  const userApproved = input.userApproved === true || extraction.classification === "approved";

  const canAcceptResolution = userApproved || verifiedObjective;

  const feedback: FeedbackRecord = {
    id,
    createdAt: now,
    task: input.task || "(unspecified task)",
    source: input.source || "user-feedback",
    rawFeedback,
    scope: {
      repositoryWide: everywhere && canAcceptResolution,
      components,
      routes: input.route ? [input.route] : [],
      files: input.files || input.filesChanged || [],
      viewports,
    },
    problem: {
      category: input.category || inferCategory(rawFeedback),
      description: extraction.objectiveIssues[0] || rawFeedback,
      rootCause: input.rootCause,
    },
    acceptedResolution: canAcceptResolution
      ? {
          description: input.fixApplied || prefer,
          filesChanged: input.filesChanged || input.files || [],
          verified: Boolean(input.verificationPassed),
          userApproved,
        }
      : undefined,
    lesson: {
      rule: lessonRule.slice(0, 280),
      avoid,
      prefer,
    },
    confidence: extraction.confidence,
    status: "active",
    supersedes: [],
    tags: unique([
      ...(input.tags || []),
      ...viewports,
      inferCategory(rawFeedback),
      ...(components[0] ? ["component"] : []),
    ]),
    classification: extraction.classification,
    level: effectiveLevel,
  };

  // Persist raw (gitignored) + processed
  writeJson(path.join(base, "feedback", "raw", `${id}.json`), {
    ...feedback,
    _privacy: "Repository-local technical feedback only. No personality profiling.",
  });
  writeJson(path.join(base, "feedback", "processed", `${id}.json`), feedback);

  const report: MemoryReportSection = {
    rulesLoaded: [],
    historicalDecisionsApplied: [],
    newFeedbackCaptured: [id],
    rulesCreated: [],
    rulesUpdated: [],
    rejectedPatternsAdded: [],
    conflictsDetected: [],
    rulesRequiringConfirmation: [],
    memoryTokensUsed: 0,
  };

  if (extraction.needsUserConfirmation && !canAcceptResolution) {
    report.rulesRequiringConfirmation.push(id);
  }

  let decision: DecisionRecord | undefined;

  if (
    canAcceptResolution ||
    extraction.classification === "rejected" ||
    extraction.classification === "correction"
  ) {
    const decisionId = nextId("decision", root);
    const rule = buildRuleFromFeedback(feedback, effectiveLevel, decisionId, root);
    const { rule: finalRule, conflicts, updated } = upsertRule(rule, feedback, root);
    report.rulesCreated.push(finalRule.id);
    report.rulesUpdated.push(...updated);
    report.conflictsDetected.push(...conflicts);

    if (extraction.classification === "rejected" || extraction.rejectedPatterns.length) {
      appendAntiPattern(feedback, finalRule, decisionId, root);
      report.rejectedPatternsAdded.push(finalRule.id);
    }

    if (canAcceptResolution && extraction.acceptedPatterns.length) {
      mergePreference(feedback, "prefer", root);
    }
    if (extraction.rejectedPatterns.length) {
      mergePreference(feedback, "avoid", root);
    }

    // Promotion pass
    const promoted = maybePromote(finalRule, root);
    if (promoted && promoted.level !== finalRule.level) {
      report.rulesUpdated.push(promoted.id);
    }

    decision = {
      id: decisionId,
      createdAt: now,
      task: feedback.task,
      component: components[0],
      route: input.route,
      classification: extraction.classification,
      summary: feedback.lesson?.rule || rawFeedback.slice(0, 200),
      approvedSolution: canAcceptResolution ? feedback.acceptedResolution?.description : undefined,
      rejectedSolution:
        input.rejectedSolution || (extraction.classification === "rejected" ? avoid : undefined),
      rejectionReason: extraction.classification === "rejected" ? rawFeedback : undefined,
      beforeScreenshot: input.beforeScreenshot,
      afterScreenshot: input.afterScreenshot,
      difference:
        input.rejectedSolution && input.fixApplied
          ? `Rejected: ${input.rejectedSolution} | Accepted: ${input.fixApplied}`
          : undefined,
      ruleIds: [finalRule.id],
      feedbackId: id,
      conflictingRuleIds: conflicts,
    };
    writeJson(path.join(base, "decisions", `${decisionId}.json`), decision);
    feedback.decisionId = decisionId;
    writeJson(path.join(base, "feedback", "processed", `${id}.json`), feedback);
  }

  // Screenshot manifest association (paths only, not binary)
  if (input.beforeScreenshot || input.afterScreenshot) {
    const manifest = {
      feedbackId: id,
      before: input.beforeScreenshot,
      after: input.afterScreenshot,
      component: components[0],
      route: input.route,
      createdAt: now,
    };
    const manPath = path.join(base, "screenshot-manifests", `${id}.json`);
    const payload = JSON.stringify(manifest);
    if (Buffer.byteLength(payload, "utf8") <= DEFAULT_MEMORY_LIMITS.maxScreenshotManifestBytes) {
      writeJson(manPath, manifest);
    }
  }

  rebuildIndex(root);
  syncDesignPrinciplesStub(root);
  return { feedback, decision, report };
}

function OVERLAP_HINT(text: string): boolean {
  return /overlap|covers?|on top of/i.test(text);
}

function inferCategory(text: string): string {
  if (/overlap|covers?/.test(text)) return "overlap";
  if (/animat|smooth|delay|motion/.test(text)) return "animation";
  if (/pale|contrast|hierarchy/.test(text)) return "contrast";
  if (/crowded|too much|clutter|information/.test(text)) return "density";
  if (/generic/.test(text)) return "generic";
  if (/mobile|responsive|clip/.test(text)) return "responsive";
  if (/a11y|accessib|focus|contrast/.test(text)) return "accessibility";
  if (/do not change|don't change|keep/.test(text)) return "constraint";
  return "design";
}

function buildRuleFromFeedback(
  feedback: FeedbackRecord,
  level: RuleLevel,
  decisionId: string,
  root: string
): MemoryRule {
  const category: MemoryCategory =
    level === "repository-rule"
      ? "repository-preference"
      : feedback.classification === "rejected"
        ? "rejected-pattern"
        : feedback.classification === "approved"
          ? "approved-pattern"
          : feedback.scope.components[0]
            ? "component-preference"
            : "temporary-task-feedback";

  return {
    id: nextId(sanitizeComponentName(feedback.scope.components[0] || "rule").toLowerCase(), root),
    rule: feedback.lesson?.rule || feedback.rawFeedback.slice(0, 200),
    reason: feedback.rawFeedback.slice(0, 280),
    confidence: feedback.confidence,
    level,
    category,
    component: feedback.scope.components[0],
    route: feedback.scope.routes[0],
    tags: feedback.tags,
    status: "active",
    sourceFeedbackId: feedback.id,
    sourceDecisionId: decisionId,
    supersedes: [],
    createdAt: feedback.createdAt,
    updatedAt: feedback.createdAt,
    observationCount: 1,
    viewport: feedback.scope.viewports[0],
  };
}

function upsertRule(
  rule: MemoryRule,
  feedback: FeedbackRecord,
  root: string
): { rule: MemoryRule; conflicts: string[]; updated: string[] } {
  const conflicts: string[] = [];
  const updated: string[] = [];
  const targetName = rule.component || (rule.tags.includes("animation") ? "animations" : "general");
  const mem = loadComponentMemory(
    targetName === "general" ? "RepositoryGeneral" : targetName,
    root
  );

  // Contradiction check
  for (const existing of mem.rules.filter((r) => r.status === "active")) {
    const result = resolveContradiction({
      existing,
      incoming: rule,
      task: feedback.task,
      explicitRecent: true,
    });
    if (!result.conflicting) continue;
    conflicts.push(existing.id);
    if (result.resolution === "prefer-specific" || result.resolution === "prefer-recent-explicit") {
      const { older, newer } = applySupersession(existing, rule);
      const idx = mem.rules.findIndex((r) => r.id === existing.id);
      if (idx >= 0) mem.rules[idx] = older;
      rule = newer;
      updated.push(existing.id);
    } else {
      existing.conflictsWith = [...new Set([...(existing.conflictsWith || []), rule.id])];
      rule.conflictsWith = [...new Set([...(rule.conflictsWith || []), existing.id])];
      existing.status = "conflicting";
      rule.status = "conflicting";
      updated.push(existing.id);
    }
  }

  // Dedup identical active rules
  const dup = mem.rules.find(
    (r) => r.status === "active" && normalize(r.rule) === normalize(rule.rule)
  );
  if (dup) {
    dup.observationCount = (dup.observationCount ?? 1) + 1;
    dup.confidence = Math.max(dup.confidence, rule.confidence);
    dup.updatedAt = new Date().toISOString();
    dup.reason = `${dup.reason} | Reinforced by ${feedback.id}`;
    saveComponentMemory(mem, root);
    updated.push(dup.id);
    return { rule: dup, conflicts, updated };
  }

  mem.rules.push(rule);
  saveComponentMemory(mem, root);

  // Also store animation-tagged rules in animations.json
  if (rule.tags.includes("animation") || rule.category === "animation-preference") {
    const anim = loadComponentMemory("animations", root);
    if (!anim.rules.some((r) => r.id === rule.id)) {
      anim.rules.push({ ...rule, component: rule.component || "animations" });
      saveComponentMemory(anim, root);
    }
  }

  return { rule, conflicts, updated };
}

function maybePromote(rule: MemoryRule, root: string): MemoryRule | null {
  if (!rule.component) return null;
  const processed = listJsonFiles(path.join(memoryRoot(root), "feedback", "processed"))
    .map((f) => readJson<FeedbackRecord | null>(f, null))
    .filter((f): f is FeedbackRecord => Boolean(f));

  const count = countRelatedFeedback(processed, rule.component, rule.rule);
  let next = rule;
  if (shouldPromoteToComponentRule(rule, count)) {
    next = promoteRule(rule, "component-rule", `Same correction observed ${count} times`);
  }

  const componentsConfirming = new Set(
    processed
      .filter(
        (f) => f.lesson && normalize(f.lesson.rule).includes(normalize(rule.rule).slice(0, 30))
      )
      .flatMap((f) => f.scope.components)
  );
  const tasksConfirming = new Set(
    processed
      .filter(
        (f) => f.lesson && normalize(f.lesson.rule).includes(normalize(rule.rule).slice(0, 30))
      )
      .map((f) => f.task)
  );

  if (
    shouldPromoteToRepositoryRule({
      userSaidEverywhere: false,
      confirmedAcrossDistinctComponents: componentsConfirming.size,
      confirmedAcrossDistinctTasks: tasksConfirming.size,
    })
  ) {
    next = promoteRule(next, "repository-rule", "Confirmed across ≥3 components or tasks");
  }

  if (next !== rule) {
    const mem = loadComponentMemory(rule.component, root);
    const idx = mem.rules.findIndex((r) => r.id === rule.id);
    if (idx >= 0) {
      mem.rules[idx] = next;
      saveComponentMemory(mem, root);
    }
  }
  return next;
}

function appendAntiPattern(
  feedback: FeedbackRecord,
  rule: MemoryRule,
  decisionId: string,
  root: string
): void {
  const file = path.join(memoryRoot(root), "anti-patterns.md");
  const name = feedback.problem?.category
    ? `${titleCase(feedback.problem.category)}: ${feedback.scope.components[0] || "UI"}`
    : rule.rule.slice(0, 80);
  const block = `

## ${name}

Scope: ${feedback.scope.components.join(", ") || "local UI"} ${feedback.scope.routes.join(", ")}
Rejected because: ${feedback.rawFeedback}
Avoid: ${feedback.lesson?.avoid || rule.rule}
Prefer: ${feedback.lesson?.prefer || ""}
Confidence: ${rule.confidence >= 0.85 ? "High" : "Medium"}
Source decision ID: ${decisionId}
`;
  fs.appendFileSync(file, block, "utf8");
}

function mergePreference(feedback: FeedbackRecord, kind: "prefer" | "avoid", root: string): void {
  const file = path.join(memoryRoot(root), "preferences.json");
  const prefs = readJson<PreferencesFile>(file, emptyPreferences());
  const phrase = kind === "prefer" ? feedback.lesson?.prefer : feedback.lesson?.avoid;
  if (!phrase) return;

  // Only repository-wide confirmed preferences enter preferences.json
  if (!feedback.scope.repositoryWide) return;
  if (feedback.level === "observation" || feedback.level === "task-rule") return;

  const bucket = feedback.tags.includes("animation")
    ? prefs.animation || (prefs.animation = { preferred: [], avoid: [] })
    : feedback.tags.includes("responsive") || feedback.tags.includes("mobile")
      ? prefs.responsive
      : feedback.tags.includes("interaction")
        ? prefs.interaction
        : prefs.visualStyle;

  if (kind === "prefer") {
    const arr =
      "preferred" in bucket
        ? bucket.preferred
        : ((bucket as { preferred: string[] }).preferred = []);
    if (!arr.includes(phrase)) arr.push(phrase);
  } else {
    if (!bucket.avoid.includes(phrase)) bucket.avoid.push(phrase);
  }
  prefs._meta = {
    ...(prefs._meta || { note: emptyPreferences()._meta!.note }),
    updatedAt: new Date().toISOString(),
  };
  writeJson(file, prefs);
}

function syncDesignPrinciplesStub(root: string): void {
  const file = path.join(memoryRoot(root), "design-principles.md");
  if (fs.existsSync(file)) return;
  // created by init
}

export function addFeedbackFromFile(filePath: string, root = ROOT) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
  const data = JSON.parse(fs.readFileSync(abs, "utf8")) as AddFeedbackInput & {
    feedback?: string;
    rawFeedback?: string;
  };
  return addFeedback(
    {
      ...data,
      feedback: data.feedback || data.rawFeedback || "",
    },
    root
  );
}

export function listFeedback(root = ROOT): FeedbackRecord[] {
  const dir = path.join(memoryRoot(root), "feedback", "processed");
  return listJsonFiles(dir)
    .map((f) => readJson<FeedbackRecord | null>(f, null))
    .filter((f): f is FeedbackRecord => Boolean(f))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function searchMemory(options: {
  component?: string;
  tag?: string;
  route?: string;
  query?: string;
  root?: string;
}): Array<MemoryRule | FeedbackRecord | DecisionRecord> {
  const root = options.root ?? ROOT;
  const out: Array<MemoryRule | FeedbackRecord | DecisionRecord> = [];
  if (options.component) {
    out.push(...loadComponentMemory(options.component, root).rules);
  }
  if (options.tag) {
    out.push(
      ...allComponentRules(root).filter((r) =>
        r.tags.map((t) => t.toLowerCase()).includes(options.tag!.toLowerCase())
      )
    );
  }
  if (options.route) {
    out.push(...allComponentRules(root).filter((r) => r.route === options.route));
  }
  if (options.query) {
    const q = options.query.toLowerCase();
    out.push(
      ...allComponentRules(root).filter(
        (r) => r.rule.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q)
      ),
      ...listFeedback(root).filter((f) => f.rawFeedback.toLowerCase().includes(q))
    );
  }
  // de-dupe by id
  const seen = new Set<string>();
  return out.filter((item) => {
    const id = "rawFeedback" in item ? item.id : item.id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function unique(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function titleCase(s: string): string {
  return s.replace(/(^|\s)\S/g, (t) => t.toUpperCase());
}
