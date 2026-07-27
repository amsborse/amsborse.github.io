import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./config.ts";
import { normalizeRepoPath } from "./session.ts";
import { ReviewCache } from "./cache.ts";

const IMPORT_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?from\s+)?["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)/g;

const EXT_CANDIDATES = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".css",
  ".json",
  "/index.ts",
  "/index.tsx",
];

export function resolveImport(fromFile: string, specifier: string, root = ROOT): string | null {
  if (specifier.startsWith("@/")) {
    specifier = path.join("src", specifier.slice(2)).replace(/\\/g, "/");
    return resolveExisting(specifier, root);
  }
  if (!specifier.startsWith(".") && !specifier.startsWith("/")) {
    return null; // package import
  }
  const dir = path.dirname(fromFile);
  const joined = normalizeRepoPath(path.join(dir, specifier));
  return resolveExisting(joined, root);
}

function resolveExisting(rel: string, root: string): string | null {
  const cleaned = normalizeRepoPath(rel);
  for (const ext of EXT_CANDIDATES) {
    const candidate = normalizeRepoPath(cleaned + ext);
    const abs = path.join(root, candidate);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return candidate;
  }
  return null;
}

export function extractImports(fileContent: string): string[] {
  const specs: string[] = [];
  IMPORT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = IMPORT_RE.exec(fileContent)) !== null) {
    specs.push(m[1] || m[2]);
  }
  return specs;
}

export function buildForwardDeps(
  files: string[],
  depth: number,
  root = ROOT,
  cache?: ReviewCache
): { deps: string[]; reasons: Record<string, string> } {
  const cacheKey = cache?.key({ kind: "fwd-deps", files: [...files].sort(), depth });
  if (cache && cacheKey) {
    const hit = cache.get<{ deps: string[]; reasons: Record<string, string> }>(cacheKey);
    if (hit) return hit;
  }

  const reasons: Record<string, string> = {};
  const visited = new Set<string>();
  let frontier = files.map(normalizeRepoPath);

  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const file of frontier) {
      if (visited.has(file)) continue;
      visited.add(file);
      const abs = path.join(root, file);
      if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) continue;
      let content = "";
      try {
        content = fs.readFileSync(abs, "utf8");
      } catch {
        continue;
      }
      // Do not expand pure barrel re-export indexes — include the barrel itself only.
      const isBarrel =
        /(?:^|\/)index\.(tsx?|jsx?)$/.test(file) &&
        !/^\s*(import\s+(?!type\s*\{)[^;]+from|const|function|class)\b/m.test(
          content
            .replace(/^\s*export\s+\*\s+from.+$/gm, "")
            .replace(/^\s*export\s+\{[^}]+\}\s+from.+$/gm, "")
        );
      if (isBarrel) {
        continue;
      }
      for (const spec of extractImports(content)) {
        const resolved = resolveImport(file, spec, root);
        if (!resolved || visited.has(resolved)) continue;
        reasons[resolved] =
          reasons[resolved] ?? `Direct import from ${file} (dependency depth ${d + 1})`;
        next.push(resolved);
      }
    }
    frontier = next;
  }

  const deps = Object.keys(reasons);
  const result = { deps, reasons };
  if (cache && cacheKey) cache.set(cacheKey, result);
  return result;
}

/**
 * Reverse dependency: files that import any of the seeds, limited depth.
 * Scans only under src/ and tools/autoreview/tests/fixtures for practicality.
 */
export function buildReverseDeps(
  seeds: string[],
  depth: number,
  root = ROOT,
  cache?: ReviewCache,
  scanRoots: string[] = ["src", "tools/autoreview/tests/fixtures"]
): { deps: string[]; reasons: Record<string, string> } {
  const cacheKey = cache?.key({
    kind: "rev-deps",
    seeds: [...seeds].sort(),
    depth,
    scanRoots,
  });
  if (cache && cacheKey) {
    const hit = cache.get<{ deps: string[]; reasons: Record<string, string> }>(cacheKey);
    if (hit) return hit;
  }

  const allFiles = listSourceFiles(root, scanRoots);
  const importMap = new Map<string, string[]>(); // file -> resolved imports

  for (const file of allFiles) {
    const abs = path.join(root, file);
    let content = "";
    try {
      content = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const imports: string[] = [];
    for (const spec of extractImports(content)) {
      const resolved = resolveImport(file, spec, root);
      if (resolved) imports.push(resolved);
    }
    importMap.set(file, imports);
  }

  const reasons: Record<string, string> = {};
  let frontier = new Set(seeds.map(normalizeRepoPath));
  const found = new Set<string>();

  for (let d = 0; d < depth; d++) {
    const next = new Set<string>();
    for (const [file, imports] of importMap) {
      if (found.has(file) || frontier.has(file)) continue;
      const hits = imports.filter((i) => frontier.has(i));
      if (hits.length === 0) continue;
      found.add(file);
      reasons[file] = `Directly renders/imports ${hits[0]} (reverse dependency depth ${d + 1})`;
      next.add(file);
    }
    frontier = next;
  }

  const result = { deps: [...found], reasons };
  if (cache && cacheKey) cache.set(cacheKey, result);
  return result;
}

function listSourceFiles(root: string, scanRoots: string[]): string[] {
  const out: string[] = [];
  for (const sr of scanRoots) {
    const abs = path.join(root, sr);
    if (!fs.existsSync(abs)) continue;
    walk(abs, root, out);
  }
  return out;
}

function walk(dir: string, root: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, root, out);
      continue;
    }
    if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      out.push(normalizeRepoPath(path.relative(root, abs)));
    }
  }
}

export function isHighRiskFile(file: string): boolean {
  const n = normalizeRepoPath(file).toLowerCase();
  return (
    n.includes("rootlayout") ||
    n.endsWith("app.tsx") ||
    n.includes("vite.config") ||
    n.includes("main.tsx") ||
    n.includes("/styles/") ||
    n.includes("index.css") ||
    n.includes("globals") ||
    n.includes("theme") ||
    n.includes("router") ||
    n.includes(".github/workflows/") ||
    n.includes("autoreview.config")
  );
}
