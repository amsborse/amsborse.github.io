import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../config.ts";
import type { PreferencesFile } from "./types.ts";

export function memoryRoot(root = ROOT): string {
  return path.join(root, ".agent-memory");
}

export const MEMORY_DIRS = [
  "decisions",
  "components",
  "routes",
  "interactions",
  "feedback/raw",
  "feedback/processed",
  "screenshot-manifests",
] as const;

export function ensureMemoryLayout(root = ROOT): string {
  const base = memoryRoot(root);
  fs.mkdirSync(base, { recursive: true });
  for (const d of MEMORY_DIRS) {
    fs.mkdirSync(path.join(base, d), { recursive: true });
  }
  return base;
}

export function emptyPreferences(): PreferencesFile {
  return {
    visualStyle: { preferred: [], avoid: [] },
    interaction: { preferred: [], avoid: [] },
    responsive: { avoid: [] },
    accessibility: { preferred: [], avoid: [] },
    animation: { preferred: [], avoid: [] },
    _meta: {
      note: "Only populated from explicit user feedback, repeated corrections, accepted decisions, or repo design docs. Do not invent defaults.",
    },
  };
}

export function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function listJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(dir, f));
}

export function sanitizeComponentName(name: string): string {
  return name.replace(/[^\w.-]+/g, "_");
}
