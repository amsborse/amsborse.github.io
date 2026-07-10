#!/usr/bin/env node
/**
 * Local + CI quality gate. Fails fast before broken code reaches GitHub Pages.
 */
import { spawnSync } from "node:child_process";

const steps = [
  ["Knowledge graph (cursor)", "npm run verify:kg"],
  ["Arsenal context workspace", "npm run verify:arsenal"],
  ["Typecheck", "npm run typecheck"],
  ["Lint", "npm run lint"],
  ["Format check", "npm run format:check"],
  ["Unit tests + coverage (99% on utils)", "npm run test:coverage"],
  ["Production build", "npm run build"],
];

for (const [label, command] of steps) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(command, { stdio: "inherit", shell: true, env: process.env });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\n✓ validate passed");
