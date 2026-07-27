import fs from "node:fs";
import path from "node:path";
import type { Page } from "playwright";
import { ROOT } from "./config.ts";
import type { Finding, ScopeResult } from "./types.ts";

const ANIMATION_HINT =
  /framer-motion|motion\.|gsap|@keyframes|animate-|transition-|Animation|useSpring|animate\(/i;

export function filesNeedAnimationReview(files: string[], root = ROOT): string[] {
  return files.filter((file) => {
    if (!/\.(tsx?|jsx?|css)$/.test(file)) return false;
    const abs = path.join(root, file);
    if (!fs.existsSync(abs)) return false;
    try {
      return ANIMATION_HINT.test(fs.readFileSync(abs, "utf8"));
    } catch {
      return false;
    }
  });
}

export async function runAnimationReview(
  page: Page,
  scope: ScopeResult
): Promise<{ findings: Finding[]; reviewed: string[] }> {
  const targets = filesNeedAnimationReview(scope.changedFiles);
  if (targets.length === 0) {
    return { findings: [], reviewed: [] };
  }

  const findings: Finding[] = [];
  const metrics = await page.evaluate(async () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const longTasks: number[] = [];
    try {
      const entries = performance.getEntriesByType("measure");
      for (const e of entries) {
        if (e.duration > 50) longTasks.push(e.duration);
      }
    } catch {
      /* ignore */
    }
    return {
      reducedMotion: reduced,
      elapsed: performance.now() - start,
      longTaskCount: longTasks.length,
    };
  });

  if (metrics.longTaskCount > 3) {
    findings.push({
      id: "anim-long-tasks",
      severity: "medium",
      confidence: 0.7,
      category: "animation",
      explanation: "Multiple long performance measures detected around animated surfaces",
      recommendedFix:
        "Reduce layout thrash and competing animations; respect prefers-reduced-motion.",
      source: "animation",
    });
  }

  try {
    const btn = page.locator("button, [role='button']").first();
    if (await btn.count()) {
      await btn.click({ timeout: 2000 }).catch(() => null);
      await btn.click({ timeout: 2000 }).catch(() => null);
    }
  } catch {
    /* ignore */
  }

  return { findings, reviewed: targets };
}
