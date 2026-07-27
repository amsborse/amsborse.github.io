import path from "node:path";
import { normalizeRepoPath } from "./session.ts";

/** Infer likely React component names from changed file paths. */
export function inferComponentsFromFiles(files: string[]): string[] {
  const names = new Set<string>();
  for (const file of files.map(normalizeRepoPath)) {
    const base = path.posix.basename(file).replace(/\.(tsx?|jsx?)$/, "");
    if (/^[A-Z]/.test(base) || /(Card|Button|Panel|Modal|Layout|Hero|Nav)/.test(base)) {
      names.add(base);
    }
  }
  return [...names];
}

export function isComponentSourceFile(file: string): boolean {
  const n = normalizeRepoPath(file);
  return (
    /\.(tsx|jsx)$/.test(n) &&
    (n.includes("/components/") || n.includes("/pages/") || n.includes("/layout/"))
  );
}
