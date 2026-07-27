import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./config.ts";
import type { Finding, RepairAction, ScopeResult } from "./types.ts";

export interface RepairPlan {
  actions: RepairAction[];
  staleEvidence: string[];
}

export function planRepairs(
  findings: Finding[],
  maxIterationsBudget: number,
  iteration: number
): RepairPlan {
  if (iteration >= maxIterationsBudget) {
    return { actions: [], staleEvidence: [] };
  }

  const ranked = [...findings]
    .filter((f) => !f.repaired)
    .sort((a, b) => severityScore(b) * b.confidence - severityScore(a) * a.confidence);

  const actions: RepairAction[] = [];
  const stale = new Set<string>();

  for (const f of ranked) {
    // High-confidence only for auto-apply
    if (f.confidence < 0.8) continue;
    if (f.severity !== "critical" && f.severity !== "high") continue;

    actions.push({
      findingId: f.id,
      file: f.file,
      description: f.recommendedFix || f.explanation,
      confidence: f.confidence,
      applied: false,
    });

    if (f.category === "asset-path" || f.category === "overflow" || f.category === "clipping") {
      stale.add("screenshots");
      stale.add("deterministic");
    }
    if (f.category === "interaction" || f.category === "runtime") {
      stale.add("interactions");
      stale.add("tests");
    }
    if (f.category === "animation") {
      stale.add("animation");
      stale.add("interactions");
    }
  }

  return { actions: actions.slice(0, 5), staleEvidence: [...stale] };
}

function severityScore(f: Finding): number {
  switch (f.severity) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}

/**
 * Apply only safe, high-confidence text repairs with clear patterns.
 * Most findings are reported for the agent to fix; auto-apply is intentionally conservative.
 */
export function applyHighConfidenceRepairs(
  actions: RepairAction[],
  scope: ScopeResult,
  root = ROOT
): RepairAction[] {
  return actions.map((action) => {
    // Auto-fix only for a few well-scoped source issues, e.g. missing trailing slash in base comments — skip invasive edits.
    const target = action.file || scope.changedFiles.find((f) => /\.(css|tsx|jsx)$/.test(f));

    if (!target) {
      return {
        ...action,
        applied: false,
        result: "No safe auto-repair target; left for agent",
      };
    }

    const abs = path.join(root, target);
    if (!fs.existsSync(abs)) {
      return { ...action, applied: false, result: "Target file missing" };
    }

    // Conservative: do not mutate app source automatically in CI/forks.
    if (process.env.AUTOREVIEW_APPLY_REPAIRS !== "1") {
      return {
        ...action,
        applied: false,
        result:
          "Repair planned but not applied (set AUTOREVIEW_APPLY_REPAIRS=1 to enable auto-apply)",
      };
    }

    return {
      ...action,
      applied: false,
      result: "Auto-apply hooks reserved for agent-driven patches",
    };
  });
}

export function invalidateForStale(
  stale: string[]
): Array<"deterministic" | "screenshots" | "interactions" | "tests" | "animation" | "browser"> {
  const map: Array<
    "deterministic" | "screenshots" | "interactions" | "tests" | "animation" | "browser"
  > = [];
  for (const s of stale) {
    if (
      s === "deterministic" ||
      s === "screenshots" ||
      s === "interactions" ||
      s === "tests" ||
      s === "animation" ||
      s === "browser"
    ) {
      map.push(s);
    }
  }
  return map;
}
