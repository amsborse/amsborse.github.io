#!/usr/bin/env node
/**
 * Fail CI when total emitted JS exceeds budget (post-build).
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST_ASSETS = join(process.cwd(), "dist", "assets");
/** Total JS budget in KiB — adjust if bundle legitimately grows. */
const MAX_TOTAL_JS_KIB = 2200;

function totalJsBytes(dir) {
  let total = 0;
  for (const name of readdirSync(dir)) {
    if (name.endsWith(".js")) {
      total += statSync(join(dir, name)).size;
    }
  }
  return total;
}

try {
  const bytes = totalJsBytes(DIST_ASSETS);
  const kib = bytes / 1024;
  console.log(`Bundle JS total: ${kib.toFixed(1)} KiB (budget: ${MAX_TOTAL_JS_KIB} KiB)`);

  if (kib > MAX_TOTAL_JS_KIB) {
    console.error(`✗ JS bundle exceeds budget by ${(kib - MAX_TOTAL_JS_KIB).toFixed(1)} KiB`);
    process.exit(1);
  }

  console.log("✓ Bundle size within budget");
} catch (err) {
  console.error("✗ Could not measure bundle — run `npm run build` first.", err);
  process.exit(1);
}
