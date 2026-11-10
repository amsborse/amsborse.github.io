#!/usr/bin/env node
/**
 * Fail CI when emitted JS exceeds budget (post-build).
 *
 * Application code and article content are budgeted separately: each essay is its own lazy
 * chunk that only loads on that essay's page, so adding essays must not hide code bloat (and
 * code must not be allowed to grow into the room the essays take).
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Application JS budget in KiB — adjust if the code legitimately grows. */
export const MAX_CODE_JS_KIB = 2200;
/** Article content chunks (one per essay) in KiB — adjust when many essays are added. */
export const MAX_ARTICLE_JS_KIB = 1200;

const ARTICLE_DIRS = ["src/content/articles", "src/content/articles/medium"];

/** Slugs of every article file; Vite names each article's chunk after its file. */
export function articleSlugs(root = process.cwd()) {
  return new Set(
    ARTICLE_DIRS.flatMap((dir) => readdirSync(join(root, dir)))
      .filter((name) => name.endsWith(".md"))
      .map((name) => name.slice(0, -3))
  );
}

/** Splits emitted JS files into application code and article content, in bytes. */
export function measure(files, slugs) {
  const totals = { code: 0, articles: 0 };
  for (const { name, size } of files) {
    if (!name.endsWith(".js")) continue;
    const chunk = name.replace(/-[\w-]{8}\.js$/, "");
    totals[slugs.has(chunk) ? "articles" : "code"] += size;
  }
  return totals;
}

function main() {
  const dir = join(process.cwd(), "dist", "assets");
  const files = readdirSync(dir).map((name) => ({ name, size: statSync(join(dir, name)).size }));
  const { code, articles } = measure(files, articleSlugs());
  let failed = false;
  for (const [label, bytes, max] of [
    ["Bundle JS (code)", code, MAX_CODE_JS_KIB],
    ["Article content JS", articles, MAX_ARTICLE_JS_KIB],
  ]) {
    const kib = bytes / 1024;
    console.log(`${label}: ${kib.toFixed(1)} KiB (budget: ${max} KiB)`);
    if (kib > max) {
      console.error(`✗ ${label} exceeds budget by ${(kib - max).toFixed(1)} KiB`);
      failed = true;
    }
  }
  if (failed) process.exit(1);
  console.log("✓ Bundle size within budget");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (err) {
    console.error("✗ Could not measure bundle — run `npm run build` first.", err);
    process.exit(1);
  }
}
