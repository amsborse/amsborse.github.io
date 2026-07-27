import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./config.ts";
import type { CacheStats } from "./types.ts";

const CACHE_DIR = path.join(ROOT, ".autoreview", "cache");

export class ReviewCache {
  stats: CacheStats = { hits: 0, misses: 0, keys: [] };

  constructor(private dir = CACHE_DIR) {
    fs.mkdirSync(this.dir, { recursive: true });
  }

  key(parts: Record<string, unknown>): string {
    const stable = JSON.stringify(parts, Object.keys(parts).sort());
    return crypto.createHash("sha256").update(stable).digest("hex");
  }

  get<T>(key: string): T | null {
    const file = path.join(this.dir, `${key}.json`);
    if (!fs.existsSync(file)) {
      this.stats.misses += 1;
      return null;
    }
    try {
      this.stats.hits += 1;
      this.stats.keys.push(key);
      return JSON.parse(fs.readFileSync(file, "utf8")) as T;
    } catch {
      this.stats.misses += 1;
      return null;
    }
  }

  set(key: string, value: unknown): void {
    const file = path.join(this.dir, `${key}.json`);
    fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
  }

  getOrCompute<T>(key: string, compute: () => T): T {
    const hit = this.get<T>(key);
    if (hit !== null) return hit;
    const value = compute();
    this.set(key, value);
    return value;
  }
}

export function hashContents(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}
