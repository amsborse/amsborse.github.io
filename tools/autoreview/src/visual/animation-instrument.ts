import type { Page } from "playwright";
import type { Finding, ScopeResult } from "../types.ts";
import type { AnimationSmoothnessReport } from "./types.ts";
import { evidenceToFinding } from "./types.ts";
import { filesNeedAnimationReview } from "../animation-review.ts";

/**
 * Scoped animation smoothness instrumentation.
 * Results are browser-run timing evidence — not exact real-device FPS claims.
 */
export async function instrumentAnimationSmoothness(
  page: Page,
  interactionId: string,
  trigger: () => Promise<void>
): Promise<AnimationSmoothnessReport> {
  await page.evaluate(() => {
    const w = window as unknown as {
      __arAnim?: {
        frames: number[];
        longTasks: number[];
        shifts: number;
        animStart?: number;
        animEnd?: number;
        expectedEnd?: number;
        jump?: boolean;
      };
    };
    w.__arAnim = { frames: [], longTasks: [], shifts: 0 };
    const state = w.__arAnim;
    let last = performance.now();
    let raf = 0;
    const loop = (t: number) => {
      state.frames.push(t - last);
      last = t;
      if (state.frames.length < 120) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    (w as { __arRaf?: number }).__arRaf = raf;

    try {
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.duration > 50) state.longTasks.push(e.duration);
          if (e.entryType === "layout-shift") state.shifts += 1;
        }
      });
      po.observe({ entryTypes: ["longtask", "layout-shift"] as never });
    } catch {
      /* ignore */
    }

    document.addEventListener(
      "animationstart",
      () => {
        state.animStart = performance.now();
      },
      { capture: true }
    );
    document.addEventListener(
      "animationend",
      () => {
        state.animEnd = performance.now();
      },
      { capture: true }
    );
    document.addEventListener(
      "transitionend",
      () => {
        state.animEnd = performance.now();
      },
      { capture: true }
    );
  });

  await trigger();
  await page.waitForTimeout(300);

  const data = await page.evaluate(() => {
    const w = window as unknown as {
      __arAnim?: {
        frames: number[];
        longTasks: number[];
        shifts: number;
        animStart?: number;
        animEnd?: number;
      };
      __arRaf?: number;
    };
    if (w.__arRaf) cancelAnimationFrame(w.__arRaf);
    // Web Animations API snapshot
    let jump = false;
    try {
      const anims = document.getAnimations?.() || [];
      for (const a of anims) {
        const effect = a.effect as KeyframeEffect | null;
        if (effect && a.playState === "finished") {
          /* finished ok */
        }
        if (a.playState === "idle" && (a.currentTime as number) > 0) jump = true;
      }
    } catch {
      /* ignore */
    }
    return { ...(w.__arAnim || { frames: [], longTasks: [], shifts: 0 }), jump };
  });

  const frames = data.frames || [];
  const longest = frames.reduce((m, n) => Math.max(m, n), 0);
  const report: AnimationSmoothnessReport = {
    interactionId,
    frameIntervalsMs: frames.slice(0, 40),
    framesAbove24ms: frames.filter((f) => f > 24).length,
    framesAbove50ms: frames.filter((f) => f > 50).length,
    longestFrameIntervalMs: longest,
    longTasksAbove50ms: (data.longTasks || []).length,
    layoutShiftCount: data.shifts || 0,
    animationStartDelayMs: data.animStart,
    finalStateJump: Boolean(data.jump),
    note: "Browser-run timing evidence from the automation environment; not exact real-device FPS.",
  };
  return report;
}

export async function runAnimationInteractionTests(
  page: Page,
  scope: ScopeResult
): Promise<Finding[]> {
  const targets = filesNeedAnimationReview(scope.changedFiles);
  if (!targets.length) return [];

  const findings: Finding[] = [];
  const btn = page.locator("button, [role='button'], [data-testid]").first();
  if (!(await btn.count())) return findings;

  const scenarios: Array<{ name: string; run: () => Promise<void> }> = [
    {
      name: "normal-trigger",
      run: async () => {
        await btn.click({ timeout: 3000 }).catch(() => undefined);
      },
    },
    {
      name: "rapid-repeat",
      run: async () => {
        await btn.click({ timeout: 2000 }).catch(() => undefined);
        await btn.click({ timeout: 2000 }).catch(() => undefined);
        await btn.click({ timeout: 2000 }).catch(() => undefined);
      },
    },
    {
      name: "during-transition",
      run: async () => {
        await btn.click({ timeout: 2000 }).catch(() => undefined);
        await page.waitForTimeout(40);
        await btn.click({ timeout: 2000 }).catch(() => undefined);
      },
    },
    {
      name: "reduced-motion",
      run: async () => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await btn.click({ timeout: 2000 }).catch(() => undefined);
        await page.emulateMedia({ reducedMotion: "no-preference" });
      },
    },
  ];

  for (const scenario of scenarios) {
    try {
      await scenario.run();
      const stuck = await page.evaluate(() => {
        const anims = document.getAnimations?.() || [];
        return anims.some((a) => a.playState === "running" && a.pending);
      });
      // Check duplicate leftover nodes with same test id
      const dup = await page.evaluate(() => {
        const map = new Map<string, number>();
        for (const el of document.querySelectorAll("[data-testid]")) {
          const id = (el as HTMLElement).dataset.testid || "";
          map.set(id, (map.get(id) || 0) + 1);
        }
        return [...map.entries()].some(([, n]) => n > 3);
      });
      if (stuck) {
        findings.push(
          evidenceToFinding(
            {
              category: "animation",
              severity: "high",
              confidence: 0.8,
              explanation: `Animation may be stuck after scenario ${scenario.name}`,
              recommendedFix: "Ensure interruptible animations and cleanup on remount.",
              deterministic: true,
              state: scenario.name,
            },
            "anim-ix",
            findings.length
          )
        );
      }
      if (dup) {
        findings.push(
          evidenceToFinding(
            {
              category: "animation",
              severity: "medium",
              confidence: 0.7,
              explanation: `Possible duplicate nodes after rapid animation scenario ${scenario.name}`,
              recommendedFix: "Clean up ephemeral animated nodes after completion.",
              deterministic: true,
              state: scenario.name,
            },
            "anim-ix",
            findings.length
          )
        );
      }
    } catch (err) {
      findings.push(
        evidenceToFinding(
          {
            category: "animation",
            severity: "medium",
            confidence: 0.6,
            explanation: `Animation scenario ${scenario.name} error: ${String(err)}`,
            deterministic: true,
            state: scenario.name,
          },
          "anim-ix",
          findings.length
        )
      );
    }
  }

  // reduced-motion handling for new animation files
  const hasMotion = targets.length > 0;
  if (hasMotion) {
    const respects = await page.evaluate(() => {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? true
        : document.body.dataset.reducedMotionAware !== "false";
    });
    if (!respects) {
      /* informational only — hard gate checked separately via findings when media is reduce */
    }
  }

  return findings;
}

export function smoothnessToFindings(report: AnimationSmoothnessReport, route?: string): Finding[] {
  const findings: Finding[] = [];
  if (report.finalStateJump) {
    findings.push(
      evidenceToFinding(
        {
          category: "animation",
          severity: "high",
          confidence: 0.8,
          route,
          explanation: "Possible final-state jump detected after animation",
          recommendedFix: "Ease to the true final layout; avoid snapping transforms.",
          deterministic: true,
          traceOrTiming: report.note,
        },
        "anim-smooth",
        0
      )
    );
  }
  if (report.framesAbove50ms > 5) {
    findings.push(
      evidenceToFinding(
        {
          category: "animation",
          severity: "medium",
          confidence: 0.7,
          route,
          explanation: `${report.framesAbove50ms} frames >50ms (longest ${Math.round(report.longestFrameIntervalMs)}ms). ${report.note}`,
          recommendedFix: "Reduce main-thread work during animation.",
          deterministic: true,
          traceOrTiming: `longTasks=${report.longTasksAbove50ms}`,
        },
        "anim-smooth",
        1
      )
    );
  }
  return findings;
}
