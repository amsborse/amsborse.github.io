import type { Page } from "playwright";
import type { Finding } from "../types.ts";
import { DEFAULT_VISUAL_THRESHOLDS, evidenceToFinding, type VisualThresholds } from "./types.ts";

export async function measureVisualStability(
  page: Page,
  route: string,
  action: () => Promise<void>,
  thresholds: VisualThresholds = DEFAULT_VISUAL_THRESHOLDS
): Promise<{ cls: number; findings: Finding[] }> {
  await page.evaluate(() => {
    const w = window as unknown as { __arCls?: number };
    w.__arCls = 0;
    try {
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries() as Array<
          PerformanceEntry & { value?: number; hadRecentInput?: boolean }
        >) {
          if (e.hadRecentInput) continue;
          w.__arCls = (w.__arCls || 0) + (e.value || 0);
        }
      });
      po.observe({ type: "layout-shift", buffered: true } as never);
    } catch {
      /* ignore */
    }
  });

  await action();
  await page.waitForTimeout(200);

  const cls = await page.evaluate(() => {
    const w = window as unknown as { __arCls?: number };
    return w.__arCls || 0;
  });

  const findings: Finding[] = [];
  if (cls > thresholds.layoutShiftBudget) {
    findings.push(
      evidenceToFinding(
        {
          category: "layout",
          severity: "high",
          confidence: 0.85,
          route,
          explanation: `Unexpected cumulative layout shift ${cls.toFixed(3)} above budget ${thresholds.layoutShiftBudget}`,
          recommendedFix:
            "Reserve image/aspect-ratio space, stabilize fonts, and avoid late-injected badges expanding content.",
          deterministic: true,
          traceOrTiming: `cls=${cls}`,
        },
        "cls",
        0
      )
    );
  }

  // Images without dimensions
  const imgIssues = await page.evaluate(() => {
    const bad: string[] = [];
    for (const img of document.querySelectorAll("img")) {
      const hasAttr = img.hasAttribute("width") || img.hasAttribute("height");
      const style = getComputedStyle(img);
      const hasAspect = style.aspectRatio && style.aspectRatio !== "auto";
      if (!hasAttr && !hasAspect && img.getAttribute("src")) {
        bad.push(img.getAttribute("src") || "img");
      }
    }
    return bad.slice(0, 10);
  });
  for (const src of imgIssues) {
    findings.push(
      evidenceToFinding(
        {
          category: "layout",
          severity: "medium",
          confidence: 0.75,
          route,
          explanation: `Image missing reserved dimensions/aspect-ratio: ${src}`,
          recommendedFix: "Set width/height attributes or CSS aspect-ratio.",
          deterministic: true,
        },
        "cls-img",
        findings.length
      )
    );
  }

  return { cls, findings };
}
