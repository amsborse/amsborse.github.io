import type { FeedbackRecord, MemoryRule, RuleLevel } from "./types.ts";

/**
 * Default new feedback to observation.
 * Promote carefully — never auto-globalize.
 */
export function initialLevel(input: {
  repositoryWideExplicit: boolean;
  componentExplicit: boolean;
  extractionHasRepoRules: boolean;
}): RuleLevel {
  if (input.repositoryWideExplicit || input.extractionHasRepoRules) {
    return "repository-rule";
  }
  if (input.componentExplicit) return "component-rule";
  return "observation";
}

export function shouldPromoteToComponentRule(
  rule: MemoryRule,
  relatedFeedbackCount: number
): boolean {
  if (
    rule.level === "component-rule" ||
    rule.level === "route-rule" ||
    rule.level === "repository-rule"
  ) {
    return false;
  }
  // Explicit component preference already stored as component-rule via ingest path
  return relatedFeedbackCount >= 2;
}

export function shouldPromoteToRepositoryRule(input: {
  userSaidEverywhere: boolean;
  confirmedAcrossDistinctComponents: number;
  confirmedAcrossDistinctTasks: number;
}): boolean {
  if (input.userSaidEverywhere) return true;
  return input.confirmedAcrossDistinctComponents >= 3 || input.confirmedAcrossDistinctTasks >= 3;
}

export function promoteRule(rule: MemoryRule, target: RuleLevel, reason: string): MemoryRule {
  const order: RuleLevel[] = [
    "observation",
    "task-rule",
    "component-rule",
    "route-rule",
    "repository-rule",
  ];
  const from = order.indexOf(rule.level);
  const to = order.indexOf(target);
  if (to <= from) return rule;
  return {
    ...rule,
    level: target,
    reason: `${rule.reason} | Promoted to ${target}: ${reason}`,
    updatedAt: new Date().toISOString(),
    observationCount: (rule.observationCount ?? 1) + 1,
  };
}

export function countRelatedFeedback(
  feedback: FeedbackRecord[],
  component: string,
  normalizedRule: string
): number {
  const needle = normalize(normalizedRule);
  return feedback.filter((f) => {
    if (!f.scope.components.map((c) => c.toLowerCase()).includes(component.toLowerCase())) {
      return false;
    }
    const blob = normalize(
      [f.rawFeedback, f.lesson?.rule, f.lesson?.avoid, f.lesson?.prefer].filter(Boolean).join(" ")
    );
    return blob.includes(needle.slice(0, 40)) || similarOverlap(blob, needle);
  }).length;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function similarOverlap(a: string, b: string): boolean {
  const words = b.split(" ").filter((w) => w.length > 4);
  const hits = words.filter((w) => a.includes(w)).length;
  return words.length > 0 && hits / words.length >= 0.5;
}

export function userSaidEverywhere(text: string): boolean {
  return /\b(everywhere|across the (site|app|repo)|globally|for all components|repository[- ]wide)\b/i.test(
    text
  );
}
