import fs from "node:fs";
import path from "node:path";
import { ensureMemoryLayout, listJsonFiles, memoryRoot, readJson, writeJson } from "./store.ts";
import type {
  ComponentMemory,
  DecisionRecord,
  FeedbackRecord,
  MemoryIndex,
  MemoryRule,
} from "./types.ts";

export function emptyIndex(): MemoryIndex {
  return {
    components: {},
    routes: {},
    tags: {},
    files: {},
    interactions: {},
    superseded: {},
    decisions: [],
    feedback: [],
    updatedAt: new Date().toISOString(),
  };
}

export function rebuildIndex(root?: string): MemoryIndex {
  const base = ensureMemoryLayout(root);
  const index = emptyIndex();

  const processed = listJsonFiles(path.join(base, "feedback", "processed"));
  for (const file of processed) {
    const fb = readJson<FeedbackRecord | null>(file, null);
    if (!fb) continue;
    index.feedback.push(fb.id);
    for (const c of fb.scope.components) push(index.components, c, fb.id);
    for (const r of fb.scope.routes) push(index.routes, r, fb.id);
    for (const t of fb.tags) push(index.tags, t, fb.id);
    for (const f of fb.scope.files) push(index.files, f, fb.id);
    for (const i of fb.scope.interactions || []) push(index.interactions, i, fb.id);
  }

  const decisionFiles = listJsonFiles(path.join(base, "decisions"));
  for (const file of decisionFiles) {
    const d = readJson<DecisionRecord | null>(file, null);
    if (!d) continue;
    index.decisions.push(d.id);
    if (d.component) push(index.components, d.component, d.id);
    if (d.route) push(index.routes, d.route, d.id);
    for (const ruleId of d.ruleIds) {
      // tags inferred later from component files
      void ruleId;
    }
  }

  const componentFiles = listJsonFiles(path.join(base, "components"));
  for (const file of componentFiles) {
    const mem = readJson<ComponentMemory | null>(file, null);
    if (!mem) continue;
    for (const rule of mem.rules) {
      push(index.components, mem.component, rule.id);
      for (const t of rule.tags) push(index.tags, t, rule.id);
      if (rule.route) push(index.routes, rule.route, rule.id);
      if (rule.supersededBy) index.superseded[rule.id] = rule.supersededBy;
      if (rule.status === "superseded" && rule.supersededBy) {
        index.superseded[rule.id] = rule.supersededBy;
      }
    }
  }

  // animations.json is a special component memory file
  const animPath = path.join(base, "components", "animations.json");
  if (fs.existsSync(animPath)) {
    const anim = readJson<ComponentMemory | null>(animPath, null);
    if (anim) {
      for (const rule of anim.rules) {
        push(index.tags, "animation", rule.id);
        for (const t of rule.tags) push(index.tags, t, rule.id);
      }
    }
  }

  index.updatedAt = new Date().toISOString();
  writeJson(path.join(base, "index.json"), index);
  return index;
}

function push(map: Record<string, string[]>, key: string, id: string): void {
  const k = key.trim();
  if (!k) return;
  if (!map[k]) map[k] = [];
  if (!map[k].includes(id)) map[k].push(id);
}

export function loadIndex(root?: string): MemoryIndex {
  const p = path.join(memoryRoot(root), "index.json");
  return readJson(p, emptyIndex());
}

export function allComponentRules(root?: string): MemoryRule[] {
  const base = ensureMemoryLayout(root);
  const rules: MemoryRule[] = [];
  for (const file of listJsonFiles(path.join(base, "components"))) {
    const mem = readJson<ComponentMemory | null>(file, null);
    if (mem) rules.push(...mem.rules);
  }
  return rules;
}

export function loadComponentMemory(component: string, root?: string): ComponentMemory {
  const file = path.join(
    memoryRoot(root),
    "components",
    `${component.replace(/[^\w.-]+/g, "_")}.json`
  );
  return readJson(file, { component, rules: [] });
}

export function saveComponentMemory(mem: ComponentMemory, root?: string): void {
  const file = path.join(
    memoryRoot(root),
    "components",
    `${mem.component.replace(/[^\w.-]+/g, "_")}.json`
  );
  writeJson(file, mem);
}
