import fs from "node:fs";
import path from "node:path";
import { allComponentRules, loadIndex, loadComponentMemory } from "./index-builder.ts";
import { ensureMemoryLayout, listJsonFiles, memoryRoot, readJson } from "./store.ts";
import {
  DEFAULT_MEMORY_LIMITS,
  type DecisionRecord,
  type MemoryQuery,
  type MemoryRule,
  type RetrievedMemory,
} from "./types.ts";
import { estimateTokens } from "./tokens.ts";

/**
 * Retrieve only relevant lessons for the current task.
 * Priority:
 * 1. Explicit constraints for current component
 * 2. Accepted component decisions
 * 3. Route-specific decisions
 * 4. Relevant repository-wide principles
 * 5. Relevant rejected patterns
 * 6. Similar historical feedback
 */
export function retrieveMemory(
  query: MemoryQuery,
  root?: string,
  limits = DEFAULT_MEMORY_LIMITS
): RetrievedMemory {
  ensureMemoryLayout(root);
  const index = loadIndex(root);
  const components = (query.components || []).map((c) => c.trim()).filter(Boolean);
  const routes = (query.routes || []).map((r) => r.trim()).filter(Boolean);
  const tags = new Set((query.tags || []).map((t) => t.toLowerCase()));
  const files = query.files || [];

  // Infer tags from task/concepts
  for (const c of query.concepts || []) tags.add(c.toLowerCase());
  if (query.task) {
    const t = query.task.toLowerCase();
    if (/animat|motion|smooth/.test(t)) tags.add("animation");
    if (/card/.test(t)) tags.add("card");
    if (/responsive|mobile/.test(t)) tags.add("responsive");
    if (/nav/.test(t)) tags.add("navigation");
    if (/form/.test(t)) tags.add("forms");
  }

  const excluded: string[] = [];
  const scored: Array<{ rule: MemoryRule; score: number; bucket: string }> = [];

  // Load ONLY related component memories — never all components
  const relatedComponents = new Set(components);
  for (const file of files) {
    const base = path.posix.basename(file).replace(/\.(tsx?|jsx?)$/, "");
    if (/^[A-Z]/.test(base) || /Card|Button|Panel|Modal|Layout|Hero/.test(base)) {
      relatedComponents.add(base);
    }
  }

  for (const name of relatedComponents) {
    const mem = loadComponentMemory(name, root);
    for (const rule of mem.rules) {
      if (rule.status === "superseded" || rule.status === "archived") {
        excluded.push(`${rule.id} (inactive)`);
        continue;
      }
      let score = 0;
      if (rule.category === "explicit-constraint") score += 100;
      if (rule.level === "component-rule") score += 50;
      if (rule.component && relatedComponents.has(rule.component)) score += 40;
      if (rule.route && routes.includes(rule.route)) score += 30;
      if (rule.tags.some((t) => tags.has(t.toLowerCase()))) score += 20;
      if (query.viewports?.length && rule.viewport && query.viewports.includes(rule.viewport)) {
        score += 15;
      }
      score += rule.confidence * 10;
      scored.push({
        rule,
        score,
        bucket: rule.category === "explicit-constraint" ? "constraint" : "component",
      });
    }
  }

  // Animation rules when relevant
  if (tags.has("animation") || query.interactions?.some((i) => /anim|hover|click/.test(i))) {
    const anim = loadComponentMemory("animations", root);
    for (const rule of anim.rules) {
      if (rule.status === "superseded") continue;
      scored.push({
        rule,
        score: 35 + rule.confidence * 10,
        bucket: "animation",
      });
    }
  }

  // Route-linked rules from index (still only load matching component files)
  for (const route of routes) {
    const ids = index.routes[route] || [];
    for (const id of ids) {
      if (scored.some((s) => s.rule.id === id)) continue;
      const found = allComponentRules(root).find((r) => r.id === id);
      if (!found || found.status === "superseded") continue;
      // Only if rule is route-scoped or repository — skip foreign components
      if (
        found.component &&
        !relatedComponents.has(found.component) &&
        found.level !== "repository-rule" &&
        found.level !== "route-rule"
      ) {
        excluded.push(`${found.id} (unrelated component ${found.component})`);
        continue;
      }
      scored.push({ rule: found, score: 45, bucket: "route" });
    }
  }

  // Repository-wide: design principles + preferences are summarized as soft rules
  // only when tags match — loaded via parse of principles file (lightweight)
  const repoRules = loadRepositoryPrinciplesAsRules(root).filter((r) => {
    if (!tags.size) return false;
    return r.tags.some((t) => tags.has(t.toLowerCase()));
  });
  for (const rule of repoRules) {
    scored.push({ rule, score: 25 + rule.confidence * 5, bucket: "repository" });
  }

  scored.sort((a, b) => b.score - a.score);

  // Deduplicate by id
  const seen = new Set<string>();
  const ranked = scored.filter((s) => {
    if (seen.has(s.rule.id)) return false;
    seen.add(s.rule.id);
    return true;
  });

  const rules = ranked.slice(0, limits.maxRulesLoaded).map((s) => s.rule);
  for (const drop of ranked.slice(limits.maxRulesLoaded)) {
    excluded.push(`${drop.rule.id} (rule budget)`);
  }

  const rejectedPatterns = loadRejectedPatterns(root)
    .filter((p) => {
      if (p.scopeComponents?.some((c) => relatedComponents.has(c))) return true;
      if (p.tags?.some((t) => tags.has(t.toLowerCase()))) return true;
      return false;
    })
    .slice(0, limits.maxRejectedPatterns);

  const decisions = loadRecentDecisions(root)
    .filter((d) => {
      if (d.component && relatedComponents.has(d.component)) return true;
      if (d.route && routes.includes(d.route)) return true;
      return false;
    })
    .slice(0, limits.maxHistoricalDecisions);

  const applicableByComponent: Record<string, string[]> = {};
  for (const rule of rules) {
    const key = rule.component || "_repository";
    if (!applicableByComponent[key]) applicableByComponent[key] = [];
    applicableByComponent[key].push(rule.rule);
  }

  let tokensUsed = estimateTokens(
    JSON.stringify({
      rules: rules.map((r) => ({ id: r.id, rule: r.rule, reason: r.reason })),
      rejectedPatterns,
      decisions: decisions.map((d) => ({ id: d.id, summary: d.summary })),
    })
  );

  // Trim if over token budget
  while (tokensUsed > limits.maxMemoryContextTokens && rules.length > 0) {
    const dropped = rules.pop();
    if (dropped) excluded.push(`${dropped.id} (token budget)`);
    tokensUsed = estimateTokens(
      JSON.stringify({
        rules: rules.map((r) => ({ id: r.id, rule: r.rule, reason: r.reason })),
        rejectedPatterns,
        decisions: decisions.map((d) => ({ id: d.id, summary: d.summary })),
      })
    );
  }

  return {
    rules,
    rejectedPatterns: rejectedPatterns.map((p) => ({
      id: p.id,
      name: p.name,
      avoid: p.avoid,
      prefer: p.prefer,
      confidence: p.confidence,
      sourceDecisionId: p.sourceDecisionId,
    })),
    decisions,
    applicableByComponent,
    tokensUsed,
    excluded,
  };
}

function loadRepositoryPrinciplesAsRules(root?: string): MemoryRule[] {
  const file = path.join(memoryRoot(root), "design-principles.md");
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, "utf8");
  const rules: MemoryRule[] = [];
  const sections = text.split(/^##\s+/m).slice(1);
  for (const section of sections) {
    const lines = section.split("\n");
    const title = lines[0]?.trim();
    if (!title || /how to edit/i.test(title)) continue;
    const body = lines.slice(1).join("\n").trim();
    if (!body || (body.startsWith("_") && body.includes("none yet"))) continue;
    rules.push({
      id: `principle-${slug(title)}`,
      rule: `${title}: ${body.slice(0, 240)}`,
      reason: "Manual design-principles.md (takes precedence over low-confidence inferred rules)",
      confidence: 0.99,
      level: "repository-rule",
      category: "repository-preference",
      tags: title.toLowerCase().split(/\W+/).filter(Boolean).slice(0, 4),
      status: "active",
      supersedes: [],
      createdAt: "",
      updatedAt: "",
    });
  }
  return rules;
}

export interface RejectedPatternParsed {
  id: string;
  name: string;
  avoid: string;
  prefer: string;
  confidence: number;
  sourceDecisionId?: string;
  scopeComponents?: string[];
  tags?: string[];
}

export function loadRejectedPatterns(root?: string): RejectedPatternParsed[] {
  const file = path.join(memoryRoot(root), "anti-patterns.md");
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, "utf8");
  const chunks = text.split(/^##\s+/m).slice(1);
  return chunks.map((chunk, i) => {
    const lines = chunk.split("\n");
    const name = lines[0]?.trim() || `anti-${i}`;
    const get = (label: string) => {
      const line = lines.find((l) => l.toLowerCase().startsWith(label.toLowerCase()));
      return line ? line.split(":").slice(1).join(":").trim() : "";
    };
    const scope = get("Scope");
    return {
      id: `anti-${slug(name)}`,
      name,
      avoid: get("Avoid") || get("Rejected because"),
      prefer: get("Prefer"),
      confidence: /high/i.test(get("Confidence")) ? 0.9 : 0.7,
      sourceDecisionId: get("Source decision ID") || undefined,
      scopeComponents: scope
        ? scope
            .split(/,|and/)
            .map((s) => s.trim())
            .filter((s) => /^[A-Z]/.test(s))
        : [],
      tags: name
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3),
    };
  });
}

function loadRecentDecisions(root?: string): DecisionRecord[] {
  const dir = path.join(memoryRoot(root), "decisions");
  const files = listJsonFiles(dir);
  const items = files
    .map((f) => readJson<DecisionRecord | null>(f, null))
    .filter((d): d is DecisionRecord => Boolean(d));
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return items;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}
