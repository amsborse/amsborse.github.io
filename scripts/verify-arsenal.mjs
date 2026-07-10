#!/usr/bin/env node
/**
 * Validate committed `.arsenal/` workspace (Arsenal context engine output).
 * Does not require @arsenal/context-engine at runtime — checks structure only.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const BASE = join(ROOT, ".arsenal");

const REQUIRED_FILES = [
  "config.json",
  "repo-map.json",
  "file-index.json",
  "symbol-index.json",
  "dependency-graph.json",
  "knowledge-graph.json",
  "memory/active-task.md",
  "rules/AGENTS.md",
  "rules/CLAUDE.md",
  "rules/testing-rules.md",
  "summaries/architecture.md",
];

function main() {
  let failed = false;

  if (!existsSync(BASE)) {
    console.error("✗ Missing `.arsenal/` — run `npm run context:init` then index/summarize/graph");
    process.exit(1);
  }

  for (const file of REQUIRED_FILES) {
    const abs = join(BASE, file);
    if (!existsSync(abs)) {
      console.error(`✗ Missing .arsenal/${file}`);
      failed = true;
    }
  }

  const summariesDir = join(BASE, "summaries/files");
  if (!existsSync(summariesDir)) {
    console.error("✗ Missing .arsenal/summaries/files — run `npm run context:summarize`");
    failed = true;
  }

  try {
    const graph = JSON.parse(readFileSync(join(BASE, "knowledge-graph.json"), "utf8"));
    const nodeIds = new Set((graph.nodes ?? []).map((n) => n.id));
    let broken = 0;
    for (const edge of graph.edges ?? []) {
      const source = edge.source ?? edge.from;
      const target = edge.target ?? edge.to;
      if (!nodeIds.has(source) || !nodeIds.has(target)) broken += 1;
    }
    if (broken > 0) {
      console.warn(`⚠ ${broken} knowledge-graph edges reference missing nodes — run context:graph`);
    }
    console.log(
      `Arsenal graph — ${graph.nodes?.length ?? 0} nodes, ${graph.edges?.length ?? 0} edges`
    );
  } catch (err) {
    console.error(`✗ Invalid .arsenal/knowledge-graph.json: ${err.message}`);
    failed = true;
  }

  if (failed) {
    console.error("\n✗ verify:arsenal failed");
    process.exit(1);
  }

  console.log("✓ .arsenal structure valid");
  console.log("\n✓ verify:arsenal passed");
}

main();
