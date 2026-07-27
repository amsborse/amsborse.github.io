import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./config.ts";
import { normalizeRepoPath } from "./session.ts";
import { ReviewCache } from "./cache.ts";

function walk(dir: string, root: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      walk(abs, root, out);
    } else if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      out.push(normalizeRepoPath(path.relative(root, abs)));
    }
  }
}

export function listTestFiles(root = ROOT): string[] {
  const out: string[] = [];
  walk(path.join(root, "tests"), root, out);
  walk(path.join(root, "src"), root, out);
  walk(path.join(root, "tools/autoreview/tests"), root, out);
  return out;
}

function basenameNoExt(file: string): string {
  return path.posix.basename(file).replace(/\.(tsx?|jsx?)$/, "");
}

/**
 * Select related unit/e2e tests for changed files without running the full suite.
 */
export function selectRelatedTests(
  changedFiles: string[],
  options?: { root?: string; cache?: ReviewCache; maxTests?: number }
): {
  tests: string[];
  reasons: Record<string, string>;
  runFullSuite: boolean;
  fullSuiteReason?: string;
} {
  const root = options?.root ?? ROOT;
  const maxTests = options?.maxTests ?? 20;
  const key = options?.cache?.key({
    kind: "related-tests",
    files: [...changedFiles].sort(),
  });
  if (options?.cache && key) {
    const hit = options.cache.get<{
      tests: string[];
      reasons: Record<string, string>;
      runFullSuite: boolean;
      fullSuiteReason?: string;
    }>(key);
    if (hit) return hit;
  }

  const reasons: Record<string, string> = {};
  const selected = new Set<string>();
  let runFullSuite = false;
  let fullSuiteReason: string | undefined;

  for (const file of changedFiles.map(normalizeRepoPath)) {
    if (
      file.includes("vitest.config") ||
      file.includes("playwright.config") ||
      file.includes("tsconfig") ||
      file.includes("vite.config") ||
      file.includes(".github/workflows/") ||
      /RootLayout|App\.tsx|main\.tsx/.test(file)
    ) {
      runFullSuite = true;
      fullSuiteReason = `Global or shared contract change: ${file}`;
    }
  }

  const allTests = listTestFiles(root);
  for (const changed of changedFiles.map(normalizeRepoPath)) {
    const base = basenameNoExt(changed);
    for (const test of allTests) {
      const tb = basenameNoExt(test)
        .replace(/\.test$/, "")
        .replace(/\.spec$/, "");
      if (test.includes(base) || tb === base || (base.includes(tb) && tb.length > 3)) {
        selected.add(test);
        reasons[test] = `Name/path related to changed file ${changed}`;
      }
      // Content reference
      try {
        const content = fs.readFileSync(path.join(root, test), "utf8");
        const needle = changed.replace(/^src\//, "@/").replace(/\.(tsx?|jsx?)$/, "");
        if (content.includes(changed) || content.includes(needle) || content.includes(base)) {
          selected.add(test);
          reasons[test] = reasons[test] ?? `References changed symbol/path from ${changed}`;
        }
      } catch {
        /* ignore */
      }
    }

    // Colocated tests next to source modules only
    if (/\.(tsx?|jsx?)$/.test(changed)) {
      const colocated = [
        changed.replace(/\.(tsx?|jsx?)$/, ".test.ts"),
        changed.replace(/\.(tsx?|jsx?)$/, ".test.tsx"),
        changed.replace(/\.(tsx?|jsx?)$/, ".spec.ts"),
      ];
      for (const c of colocated) {
        if (c === changed) continue;
        if (fs.existsSync(path.join(root, c))) {
          selected.add(normalizeRepoPath(c));
          reasons[c] = `Colocated test for ${changed}`;
        }
      }
    }
  }

  let tests = [...selected];
  if (tests.length > maxTests) {
    tests = tests.slice(0, maxTests);
  }

  const result = { tests, reasons, runFullSuite, fullSuiteReason };
  if (options?.cache && key) options.cache.set(key, result);
  return result;
}
