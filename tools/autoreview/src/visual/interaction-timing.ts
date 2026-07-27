import type { Page } from "playwright";
import {
  DEFAULT_VISUAL_THRESHOLDS,
  type InteractionTimingReport,
  type VisualThresholds,
} from "./types.ts";

/**
 * Measure input → feedback / animation latency for a scoped interaction.
 * Thresholds are warnings requiring context, not automatic failures.
 */
export async function measureInteractionTiming(
  page: Page,
  interactionId: string,
  trigger: () => Promise<void>,
  thresholds: VisualThresholds = DEFAULT_VISUAL_THRESHOLDS
): Promise<InteractionTimingReport> {
  await page.evaluate(() => {
    const w = window as unknown as {
      __arTiming?: {
        input?: number;
        mut?: number;
        style?: number;
        anim?: number;
        stable?: number;
      };
    };
    w.__arTiming = {};
    const timing = w.__arTiming;
    const mo = new MutationObserver(() => {
      if (!timing.mut) timing.mut = performance.now();
    });
    mo.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    (w as { __arMo?: MutationObserver }).__arMo = mo;

    try {
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.entryType === "element" || e.name.includes("animation")) {
            if (!timing.anim) timing.anim = performance.now();
          }
        }
      });
      po.observe({ entryTypes: ["measure", "element"] as never });
    } catch {
      /* ignore */
    }

    document.addEventListener(
      "transitionstart",
      () => {
        if (!timing.anim) timing.anim = performance.now();
        if (!timing.style) timing.style = performance.now();
      },
      { once: true, capture: true }
    );
    document.addEventListener(
      "animationstart",
      () => {
        if (!timing.anim) timing.anim = performance.now();
      },
      { once: true, capture: true }
    );
  });

  const inputTimestamp = await page.evaluate(() => {
    const w = window as unknown as { __arTiming?: { input?: number } };
    const t = performance.now();
    if (w.__arTiming) w.__arTiming.input = t;
    return t;
  });

  await trigger();

  await page.waitForTimeout(50);
  await page.evaluate(async () => {
    const w = window as unknown as { __arTiming?: { stable?: number; style?: number } };
    // wait a couple frames for stability sampling
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    if (w.__arTiming && !w.__arTiming.stable) w.__arTiming.stable = performance.now();
    // sample style change via getComputedStyle flash
    if (w.__arTiming && !w.__arTiming.style) w.__arTiming.style = performance.now();
  });

  const marks = await page.evaluate(() => {
    const w = window as unknown as {
      __arTiming?: Record<string, number>;
      __arMo?: MutationObserver;
    };
    w.__arMo?.disconnect();
    return w.__arTiming || {};
  });

  const input = marks.input ?? inputTimestamp;
  const feedback = marks.mut ?? marks.style;
  const anim = marks.anim;
  const stable = marks.stable;

  const inputToFeedbackMs = feedback != null ? feedback - input : undefined;
  const inputToAnimationMs = anim != null ? anim - input : undefined;
  const totalTransitionMs = stable != null ? stable - input : undefined;

  const warnings: string[] = [];
  if (inputToFeedbackMs != null && inputToFeedbackMs > thresholds.primaryFeedbackMs) {
    warnings.push(
      `Primary input feedback ${Math.round(inputToFeedbackMs)}ms > ${thresholds.primaryFeedbackMs}ms warning threshold`
    );
  }
  if (inputToAnimationMs != null && inputToAnimationMs > thresholds.animationStartMs) {
    warnings.push(
      `Animation start ${Math.round(inputToAnimationMs)}ms > ${thresholds.animationStartMs}ms warning threshold`
    );
  }
  if (totalTransitionMs != null && totalTransitionMs > thresholds.microInteractionMs) {
    warnings.push(
      `Micro-interaction ${Math.round(totalTransitionMs)}ms > ${thresholds.microInteractionMs}ms without justification`
    );
  }
  if (totalTransitionMs != null && totalTransitionMs > thresholds.componentTransitionMs) {
    warnings.push(
      `Component transition ${Math.round(totalTransitionMs)}ms > ${thresholds.componentTransitionMs}ms without justification`
    );
  }

  return {
    interactionId,
    inputTimestamp: input,
    firstDomMutationMs: marks.mut != null ? marks.mut - input : undefined,
    firstStyleChangeMs: marks.style != null ? marks.style - input : undefined,
    animationStartMs: inputToAnimationMs,
    stableFinalStateMs: totalTransitionMs,
    inputToFeedbackMs,
    inputToAnimationMs,
    totalTransitionMs,
    warnings,
  };
}
