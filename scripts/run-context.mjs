#!/usr/bin/env node
/**
 * Run Arsenal context CLI against this repo.
 * Resolves CLI from ARSENAL_CLI env or sibling ../Arsenal checkout.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const [, , subcommand, ...rest] = process.argv;

if (!subcommand) {
  console.error("Usage: node scripts/run-context.mjs <init|index|summarize|graph|doctor|...>");
  process.exit(1);
}

const candidates = [
  process.env.ARSENAL_CLI,
  join(ROOT, "../Arsenal/packages/generator/dist/cli.js"),
].filter(Boolean);

const cli = candidates.find((path) => existsSync(path));
if (!cli) {
  console.error(
    "Arsenal CLI not found. Clone Arsenal alongside this repo or set ARSENAL_CLI to generator/dist/cli.js"
  );
  process.exit(1);
}

const result = spawnSync(process.execPath, [cli, "context", subcommand, ...rest], {
  cwd: ROOT,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
