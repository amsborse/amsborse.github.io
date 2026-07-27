import type { DecisionRecord, MemoryRule } from "./types.ts";

export interface ContradictionResult {
  conflicting: boolean;
  existing?: MemoryRule;
  resolution: "prefer-specific" | "prefer-recent-explicit" | "mark-conflict" | "none";
  note: string;
  decision?: Omit<DecisionRecord, "id" | "createdAt" | "feedbackId" | "ruleIds"> & {
    ruleIds?: string[];
  };
}

/**
 * When new feedback conflicts with an existing rule:
 * do not silently overwrite — create a decision and prefer specificity / recent explicit direction.
 */
export function resolveContradiction(input: {
  existing: MemoryRule;
  incoming: MemoryRule;
  task: string;
  explicitRecent?: boolean;
}): ContradictionResult {
  const { existing, incoming } = input;
  if (!rulesConflict(existing, incoming)) {
    return { conflicting: false, resolution: "none", note: "No conflict detected" };
  }

  const existingSpecificity = specificityScore(existing);
  const incomingSpecificity = specificityScore(incoming);

  if (incomingSpecificity > existingSpecificity) {
    return {
      conflicting: true,
      existing,
      resolution: "prefer-specific",
      note: `Prefer more specific ${incoming.level} rule for ${incoming.component || incoming.route || "scope"} over ${existing.level}`,
      decision: {
        task: input.task,
        component: incoming.component,
        route: incoming.route,
        classification: "mixed",
        summary: `Conflict: ${existing.id} vs new direction. Prefer specific scope.`,
        conflictingRuleIds: [existing.id],
      },
    };
  }

  if (input.explicitRecent) {
    return {
      conflicting: true,
      existing,
      resolution: "prefer-recent-explicit",
      note: "Prefer explicit recent user direction over inferred historical preference",
      decision: {
        task: input.task,
        component: incoming.component,
        route: incoming.route,
        classification: "correction",
        summary: `Recent explicit feedback conflicts with ${existing.id}`,
        conflictingRuleIds: [existing.id],
      },
    };
  }

  return {
    conflicting: true,
    existing,
    resolution: "mark-conflict",
    note: "Marked as conflicting; neither silently overwritten",
    decision: {
      task: input.task,
      component: incoming.component || existing.component,
      route: incoming.route || existing.route,
      classification: "mixed",
      summary: `Unresolved conflict between ${existing.id} and incoming rule`,
      conflictingRuleIds: [existing.id],
    },
  };
}

export function rulesConflict(a: MemoryRule, b: MemoryRule): boolean {
  if (a.status === "superseded" || b.status === "superseded") return false;
  const aRule = a.rule.toLowerCase();
  const bRule = b.rule.toLowerCase();

  const oppositeAnimation =
    (/minimal|reduce|less animation/.test(aRule) &&
      /dramatic|bold|alive|continuous motion/.test(bRule)) ||
    (/minimal|reduce|less animation/.test(bRule) &&
      /dramatic|bold|alive|continuous motion/.test(aRule));

  const oppositeDensity =
    (/spacious|calm|minimal text|less text/.test(aRule) &&
      /dense|crowded|more information/.test(bRule)) ||
    (/spacious|calm|minimal text|less text/.test(bRule) &&
      /dense|crowded|more information/.test(aRule));

  const oppositeBadge =
    (/do not.*badge|avoid.*overlay|no absolute/.test(aRule) &&
      /overlay badge|absolute.*badge/.test(bRule)) ||
    (/do not.*badge|avoid.*overlay|no absolute/.test(bRule) &&
      /overlay badge|absolute.*badge/.test(aRule));

  if (!(oppositeAnimation || oppositeDensity || oppositeBadge)) {
    // Same topic opposing prefer/avoid keywords
    if (shareTopic(a, b) && preferAvoidOpposite(a, b)) return true;
    return false;
  }
  return true;
}

function shareTopic(a: MemoryRule, b: MemoryRule): boolean {
  const tags = new Set(a.tags.map((t) => t.toLowerCase()));
  return (
    b.tags.some((t) => tags.has(t.toLowerCase())) || (a.component && a.component === b.component)
  );
}

function preferAvoidOpposite(a: MemoryRule, b: MemoryRule): boolean {
  const pair = `${a.rule} || ${b.rule}`.toLowerCase();
  return (
    (/do not|avoid|never/.test(a.rule) &&
      /prefer|keep|use|always/.test(b.rule) &&
      similarNouns(a.rule, b.rule)) ||
    (/do not|avoid|never/.test(b.rule) &&
      /prefer|keep|use|always/.test(a.rule) &&
      similarNouns(a.rule, b.rule)) ||
    (/minimal animation/.test(pair) && /dramatic motion/.test(pair))
  );
}

function similarNouns(a: string, b: string): boolean {
  const words = (s: string) =>
    s
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 4 && !["prefer", "avoid", "never", "always", "should"].includes(w));
  const aw = new Set(words(a));
  return words(b).some((w) => aw.has(w));
}

function specificityScore(rule: MemoryRule): number {
  let score = 0;
  if (rule.component) score += 3;
  if (rule.route) score += 2;
  if (rule.viewport) score += 1;
  if (rule.level === "component-rule") score += 2;
  if (rule.level === "route-rule") score += 2;
  if (rule.level === "repository-rule") score += 0;
  if (rule.level === "observation") score -= 1;
  return score;
}

export function applySupersession(
  older: MemoryRule,
  newer: MemoryRule
): { older: MemoryRule; newer: MemoryRule } {
  return {
    older: {
      ...older,
      status: "superseded",
      supersededBy: newer.id,
      updatedAt: new Date().toISOString(),
    },
    newer: {
      ...newer,
      supersedes: [...new Set([...newer.supersedes, older.id])],
      updatedAt: new Date().toISOString(),
    },
  };
}
