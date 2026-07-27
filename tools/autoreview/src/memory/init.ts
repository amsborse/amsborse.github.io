import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../config.ts";
import { rebuildIndex } from "./index-builder.ts";
import { emptyPreferences, ensureMemoryLayout, memoryRoot, writeJson } from "./store.ts";

export function initAgentMemory(root = ROOT): void {
  const base = ensureMemoryLayout(root);

  const prefsPath = path.join(base, "preferences.json");
  if (!fs.existsSync(prefsPath)) {
    writeJson(prefsPath, emptyPreferences());
  }

  const principles = path.join(base, "design-principles.md");
  if (!fs.existsSync(principles)) {
    fs.writeFileSync(
      principles,
      `# Design principles

Manual repository design principles for coding agents.

**Manual edits here take precedence over automatically inferred lower-confidence rules.**

## How to edit

- Add durable principles under named sections.
- Prefer short, actionable rules.
- Do not store personal information.
- Run \`npm run memory:reindex\` after structural changes.

## Visual hierarchy

_Add principles only when confirmed by user feedback._

## Motion

_Add principles only when confirmed by user feedback._

## Density and calmness

_Add principles only when confirmed by user feedback._
`,
      "utf8"
    );
  }

  const anti = path.join(base, "anti-patterns.md");
  if (!fs.existsSync(anti)) {
    fs.writeFileSync(
      anti,
      `# Rejected patterns

Repository-local anti-patterns learned from user corrections.

Each entry should include Scope, Rejected because, Avoid, Prefer, Confidence, and Source decision ID.

`,
      "utf8"
    );
  }

  const readme = path.join(base, "README.md");
  if (!fs.existsSync(readme)) {
    fs.writeFileSync(readme, MEMORY_README, "utf8");
  }

  // Seed animations.json with empty structure (no invented preferences)
  const animPath = path.join(base, "components", "animations.json");
  if (!fs.existsSync(animPath)) {
    writeJson(animPath, {
      component: "animations",
      rules: [],
    });
  }

  rebuildIndex(root);
}

const MEMORY_README = `# Repository agent memory

Local design-memory for coding agents working in this repo.

## What is stored

- Explicit user corrections and approvals
- Rejected / approved UI patterns
- Component, route, interaction, and animation lessons
- Historical decisions with sources

## What is NOT stored

- Personal emotional interpretations or personality profiles
- Credentials, env vars, or private user data
- Unrelated conversation content

## Layout

| Path | Purpose | Git? |
|------|---------|------|
| \`preferences.json\` | Evidence-based preferences only | yes |
| \`design-principles.md\` | Manual durable principles (highest precedence) | yes |
| \`anti-patterns.md\` | Rejected patterns | yes |
| \`index.json\` | Retrieval index | yes |
| \`decisions/\` | Accepted/rejected decision records | yes |
| \`components/\` | Component + animation rules | yes |
| \`routes/\`, \`interactions/\` | Scoped notes | yes |
| \`feedback/processed/\` | Structured feedback | optional |
| \`feedback/raw/\` | Temporary raw inputs | **no** (gitignored) |
| \`screenshot-manifests/\` | Screenshot path manifests | **no** (gitignored) |

## Commands

\`\`\`bash
npm run memory:add -- --feedback "..." --component FeatureCard --route /components
npm run memory:list
npm run memory:search -- --component FeatureCard
npm run memory:search -- --tag animation
npm run memory:review
npm run memory:compact
npm run memory:reindex
\`\`\`

## Manual edit / delete

1. Edit or delete rules in \`.agent-memory/components/*.json\`
2. Edit \`design-principles.md\` / \`anti-patterns.md\`
3. Run \`npm run memory:reindex\`

Do not train or fine-tune a model from this memory. Agents must retrieve only relevant slices (≤10 rules, ≤5 anti-patterns, ≤3 decisions, ≤4000 tokens).
`;

export function memoryDir(root = ROOT): string {
  return memoryRoot(root);
}
