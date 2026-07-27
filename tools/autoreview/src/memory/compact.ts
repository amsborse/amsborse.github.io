import path from "node:path";
import { ROOT } from "../config.ts";
import { rebuildIndex, allComponentRules, saveComponentMemory } from "./index-builder.ts";
import { ensureMemoryLayout, listJsonFiles, memoryRoot, readJson, writeJson } from "./store.ts";
import { DEFAULT_MEMORY_LIMITS, type MemoryRule } from "./types.ts";

export interface CompactionReport {
  mergedRules: string[];
  outdatedMarked: string[];
  supersessionResolved: string[];
  decisionsRetained: number;
  compactWarning?: string;
  keptRawReferences: string[];
  wroteAt: string;
}

/**
 * Merge duplicates, mark outdated, preserve decision history, keep index small.
 */
export function compactMemory(root = ROOT): CompactionReport {
  const base = ensureMemoryLayout(root);
  const report: CompactionReport = {
    mergedRules: [],
    outdatedMarked: [],
    supersessionResolved: [],
    decisionsRetained: 0,
    keptRawReferences: [],
    wroteAt: new Date().toISOString(),
  };

  const componentDir = path.join(base, "components");
  for (const file of listJsonFiles(componentDir)) {
    const mem = readJson<{ component: string; rules: MemoryRule[] } | null>(file, null);
    if (!mem) continue;
    const byNorm = new Map<string, MemoryRule>();
    const kept: MemoryRule[] = [];

    for (const rule of mem.rules) {
      const key = normalize(rule.rule);
      const prev = byNorm.get(key);
      if (prev && prev.status === "active" && rule.status === "active") {
        prev.confidence = Math.max(prev.confidence, rule.confidence);
        prev.observationCount = (prev.observationCount ?? 1) + (rule.observationCount ?? 1);
        prev.reason = dedupeReason(prev.reason, rule.reason);
        prev.updatedAt = new Date().toISOString();
        prev.supersedes = [...new Set([...prev.supersedes, ...rule.supersedes, rule.id])];
        report.mergedRules.push(`${rule.id} -> ${prev.id}`);
        continue;
      }
      byNorm.set(key + ":" + rule.id, rule);
      kept.push(rule);
    }

    // Resolve supersession chains: if A superseded by B and B by C, point A to C
    for (const rule of kept) {
      if (rule.supersededBy) {
        let tip = rule.supersededBy;
        const seen = new Set<string>([rule.id]);
        while (true) {
          const next = kept.find((r) => r.id === tip);
          if (!next?.supersededBy || seen.has(next.supersededBy)) break;
          seen.add(tip);
          tip = next.supersededBy;
        }
        if (tip !== rule.supersededBy) {
          rule.supersededBy = tip;
          report.supersessionResolved.push(`${rule.id} => ${tip}`);
        }
      }
    }

    // Mark very old low-confidence observations outdated if superseded trail exists
    for (const rule of kept) {
      if (rule.level === "observation" && rule.confidence < 0.7 && rule.supersededBy) {
        rule.status = "archived";
        report.outdatedMarked.push(rule.id);
      }
    }

    mem.rules = kept;
    saveComponentMemory(mem, root);
  }

  const decisions = listJsonFiles(path.join(base, "decisions"));
  report.decisionsRetained = decisions.length;
  if (decisions.length > DEFAULT_MEMORY_LIMITS.maxDecisionsBeforeCompactWarning) {
    report.compactWarning = `Decision count ${decisions.length} exceeds ${DEFAULT_MEMORY_LIMITS.maxDecisionsBeforeCompactWarning}; consider archiving old decisions manually.`;
  }

  // Preserve references to raw feedback ids from processed files
  for (const file of listJsonFiles(path.join(base, "feedback", "processed"))) {
    const fb = readJson<{ id?: string } | null>(file, null);
    if (fb?.id) report.keptRawReferences.push(fb.id);
  }

  rebuildIndex(root);

  const reportPath = path.join(base, "compaction-report.json");
  writeJson(reportPath, report);
  return report;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function dedupeReason(a: string, b: string): string {
  if (a.includes(b)) return a;
  if (b.includes(a)) return b;
  return `${a} | ${b}`.slice(0, 500);
}

export function reviewMemorySummary(root = ROOT): string {
  ensureMemoryLayout(root);
  const rules = allComponentRules(root).filter((r) => r.status === "active");
  const decisions = listJsonFiles(path.join(memoryRoot(root), "decisions")).length;
  const feedback = listJsonFiles(path.join(memoryRoot(root), "feedback", "processed")).length;
  const lines = [
    `# Agent memory review`,
    ``,
    `- Active rules: ${rules.length}`,
    `- Decisions: ${decisions}`,
    `- Processed feedback: ${feedback}`,
    `- Components with memory: ${listJsonFiles(path.join(memoryRoot(root), "components")).length}`,
    ``,
    `## Active rules`,
    ...rules
      .slice(0, 40)
      .map((r) => `- \`${r.id}\` [${r.level}/${r.confidence}] ${r.component || "repo"}: ${r.rule}`),
    ``,
    `Manual precedence: edit \`.agent-memory/design-principles.md\` and \`.agent-memory/anti-patterns.md\` directly.`,
    `Delete or archive rules by editing the component JSON under \`.agent-memory/components/\` then run \`npm run memory:reindex\`.`,
  ];
  return lines.join("\n");
}
