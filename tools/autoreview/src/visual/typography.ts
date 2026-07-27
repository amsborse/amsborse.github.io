import type { Page } from "playwright";
import type { Finding } from "../types.ts";
import { DEFAULT_VISUAL_THRESHOLDS, evidenceToFinding, type VisualThresholds } from "./types.ts";

const LONG_COPY =
  "Extended description for layout stress: availability, latency budgets, and recovery posture across regions.";

export async function runTypographyValidation(
  page: Page,
  route: string,
  scopeSelector: string,
  thresholds: VisualThresholds = DEFAULT_VISUAL_THRESHOLDS
): Promise<Finding[]> {
  const raw = await page.evaluate(
    ({ scopeSelector, minFontPx, longCopy }) => {
      const root =
        document.querySelector(scopeSelector) || document.querySelector("main") || document.body;
      const issues: Array<{
        category: string;
        severity: string;
        confidence: number;
        selector: string;
        explanation: string;
        recommendedFix?: string;
      }> = [];

      const cssPath = (el: Element): string => {
        const h = el as HTMLElement;
        if (h.dataset?.testid) return `[data-testid='${h.dataset.testid}']`;
        if (el.id) return `#${CSS.escape(el.id)}`;
        return el.tagName.toLowerCase();
      };

      const texts = [...root.querySelectorAll("h1,h2,h3,h4,p,span,label,li,button,a")].slice(
        0,
        200
      ) as HTMLElement[];

      for (const el of texts) {
        const style = getComputedStyle(el);
        const fontSize = parseFloat(style.fontSize) || 0;
        const rect = el.getBoundingClientRect();
        if (fontSize && fontSize < minFontPx) {
          issues.push({
            category: "typography",
            severity: "medium",
            confidence: 0.9,
            selector: cssPath(el),
            explanation: `Text smaller than accessibility minimum (${fontSize}px < ${minFontPx}px)`,
            recommendedFix: `Increase font-size to at least ${minFontPx}px.`,
          });
        }
        if (el.scrollWidth > el.clientWidth + 2 && style.whiteSpace === "nowrap") {
          issues.push({
            category: "typography",
            severity: "high",
            confidence: 0.88,
            selector: cssPath(el),
            explanation: "Text overflow with nowrap",
            recommendedFix: "Allow wrapping or truncate intentionally with ellipsis.",
          });
        }
        if (/^h[1-3]$/i.test(el.tagName)) {
          const words = (el.innerText || "").trim().split(/\s+/);
          if (words.length >= 4) {
            const range = document.createRange();
            range.selectNodeContents(el);
            const rects = [...range.getClientRects()];
            if (rects.length >= 2) {
              const last = rects[rects.length - 1];
              const lastWord = words[words.length - 1] || "";
              if (last.width < fontSize * 4 && lastWord.length <= 3) {
                issues.push({
                  category: "typography",
                  severity: "low",
                  confidence: 0.55,
                  selector: cssPath(el),
                  explanation: "Possible orphaned short word on heading last line",
                  recommendedFix: "Adjust measure or wording to avoid orphaned heading lines.",
                });
              }
            }
          }
        }
        if (rect.width > 0 && rect.width < fontSize * 8 && (el.innerText || "").length > 40) {
          issues.push({
            category: "typography",
            severity: "medium",
            confidence: 0.7,
            selector: cssPath(el),
            explanation: "Extremely narrow text column for long copy",
            recommendedFix: "Widen measure or reduce content density.",
          });
        }
        if (style.textTransform === "uppercase") {
          const ls = parseFloat(style.letterSpacing) || 0;
          if (ls < 0.5) {
            issues.push({
              category: "typography",
              severity: "low",
              confidence: 0.6,
              selector: cssPath(el),
              explanation: "Uppercase text with tight letter-spacing",
              recommendedFix: "Increase letter-spacing for uppercase labels.",
            });
          }
        }
      }

      // Hierarchy: heading weaker than supporting text
      const h = root.querySelector("h1,h2,h3") as HTMLElement | null;
      const p = root.querySelector("p") as HTMLElement | null;
      if (h && p) {
        const hs = parseFloat(getComputedStyle(h).fontSize) || 0;
        const ps = parseFloat(getComputedStyle(p).fontSize) || 0;
        const hw = parseInt(getComputedStyle(h).fontWeight, 10) || 400;
        const pw = parseInt(getComputedStyle(p).fontWeight, 10) || 400;
        if (hs <= ps && hw <= pw) {
          issues.push({
            category: "typography",
            severity: "medium",
            confidence: 0.75,
            selector: cssPath(h),
            explanation: "Heading appears visually weaker than supporting text",
            recommendedFix: "Increase heading size/weight relative to body copy.",
          });
        }
      }

      // Label distance from control
      for (const label of [...root.querySelectorAll("label")].slice(0, 40) as HTMLElement[]) {
        const id = label.getAttribute("for");
        const control = id
          ? document.getElementById(id)
          : label.querySelector("input,select,textarea,button");
        if (!control) continue;
        const lr = label.getBoundingClientRect();
        const cr = control.getBoundingClientRect();
        const gap = Math.abs(cr.top - lr.bottom);
        if (gap > 40 && Math.abs(lr.left - cr.left) < 80) {
          issues.push({
            category: "typography",
            severity: "low",
            confidence: 0.65,
            selector: cssPath(label),
            explanation: `Label separated ${Math.round(gap)}px from its control`,
            recommendedFix: "Tighten vertical spacing between labels and controls.",
          });
        }
      }

      // Probe long content fixture into first contenteditable-like card paragraph if marked
      const longTarget = root.querySelector("[data-long-content-fixture], [data-testid*='card'] p");
      if (longTarget && longTarget.childElementCount === 0) {
        const prev = longTarget.textContent;
        longTarget.textContent = longCopy;
        const style = getComputedStyle(longTarget as Element);
        const el = longTarget as HTMLElement;
        if (el.scrollHeight > el.clientHeight + 4 && style.overflow === "hidden") {
          issues.push({
            category: "typography",
            severity: "medium",
            confidence: 0.7,
            selector: cssPath(el),
            explanation: "Long-content fixture clips without truncation indicator",
            recommendedFix: "Support long copy with wrap, clamp+ellipsis, or expand.",
          });
        }
        longTarget.textContent = prev;
      }

      // Missing font loading / fallback heuristic
      if (document.fonts && document.fonts.status !== "loaded") {
        issues.push({
          category: "typography",
          severity: "medium",
          confidence: 0.6,
          selector: "document",
          explanation: `Fonts not fully loaded (status=${document.fonts.status})`,
          recommendedFix: "Await document.fonts.ready before screenshot baselines.",
        });
      }

      return issues.slice(0, 30);
    },
    {
      scopeSelector,
      minFontPx: thresholds.minFontPx,
      longCopy: LONG_COPY,
    }
  );

  return raw.map((issue, i) =>
    evidenceToFinding(
      {
        category: "typography",
        severity: issue.severity as Finding["severity"],
        confidence: issue.confidence,
        route,
        selector: issue.selector,
        explanation: issue.explanation,
        recommendedFix: issue.recommendedFix,
        deterministic: true,
      },
      "type",
      i
    )
  );
}
