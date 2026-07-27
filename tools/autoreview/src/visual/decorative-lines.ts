import type { Page } from "playwright";
import type { Finding } from "../types.ts";
import { DEFAULT_VISUAL_THRESHOLDS, evidenceToFinding, type VisualThresholds } from "./types.ts";

/**
 * Detect decorative SVG/CSS line collisions with protected text/content.
 * When certainty is low, returns markers for critic-region capture.
 */
export async function runDecorativeLineValidation(
  page: Page,
  route: string,
  scopeSelector: string,
  thresholds: VisualThresholds = DEFAULT_VISUAL_THRESHOLDS
): Promise<{ findings: Finding[]; lowCertaintyRegions: string[] }> {
  const raw = await page.evaluate(
    ({ scopeSelector, exclusions }) => {
      const root =
        document.querySelector(scopeSelector) || document.querySelector("main") || document.body;

      const excluded = (el: Element) =>
        exclusions.some((sel) => {
          try {
            return el.matches(sel) || Boolean(el.closest(sel));
          } catch {
            return false;
          }
        });

      const cssPath = (el: Element): string => {
        const h = el as HTMLElement;
        if (h.dataset?.testid) return `[data-testid='${h.dataset.testid}']`;
        if (el.id) return `#${CSS.escape(el.id)}`;
        return el.tagName.toLowerCase();
      };

      const protectedEls = [
        ...root.querySelectorAll("h1,h2,h3,h4,p,label,button,a,li,span,[data-testid]"),
      ].filter((el) => !excluded(el) && (el as HTMLElement).innerText?.trim()) as HTMLElement[];

      const protectedRects = protectedEls.map((el) => ({
        selector: cssPath(el),
        rect: el.getBoundingClientRect(),
      }));

      const issues: Array<{
        category: string;
        severity: string;
        confidence: number;
        selector: string;
        explanation: string;
        recommendedFix?: string;
      }> = [];
      const lowCertainty: string[] = [];

      const intersects = (a: DOMRect, b: DOMRect) =>
        !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);

      // SVG paths / lines
      for (const svg of [...root.querySelectorAll("svg")].slice(0, 40)) {
        if (excluded(svg)) continue;
        for (const shape of [...svg.querySelectorAll("path,line,polyline")].slice(0, 80)) {
          const box =
            (shape as SVGGraphicsElement).getBoundingClientRect?.() ||
            shape.getBoundingClientRect();
          if (box.width < 1 && box.height < 1) continue;
          for (const p of protectedRects) {
            if (!intersects(box, p.rect)) continue;
            const area =
              Math.max(0, Math.min(box.right, p.rect.right) - Math.max(box.left, p.rect.left)) *
              Math.max(0, Math.min(box.bottom, p.rect.bottom) - Math.max(box.top, p.rect.top));
            if (area < 8) continue;
            const confidence = area > 40 ? 0.82 : 0.55;
            const issue = {
              category: "layout",
              severity: confidence >= 0.8 ? "high" : "medium",
              confidence,
              selector: cssPath(shape),
              explanation: `Decorative SVG geometry intersects protected content ${p.selector}`,
              recommendedFix: "Reroute decorative lines or isolate content with padding/masks.",
            };
            if (confidence < 0.7) lowCertainty.push(p.selector);
            else issues.push(issue);
          }
        }
      }

      // Pseudo-elements that look like lines
      for (const el of [...root.querySelectorAll("*")].slice(0, 250) as HTMLElement[]) {
        if (excluded(el)) continue;
        for (const pseudo of ["::before", "::after"] as const) {
          const st = getComputedStyle(el, pseudo);
          if (st.content === "none" || st.content === "normal") continue;
          const w = parseFloat(st.width) || 0;
          const h = parseFloat(st.height) || 0;
          const looksLine = (w >= 20 && h <= 4) || (h >= 20 && w <= 4);
          if (!looksLine) continue;
          const rect = el.getBoundingClientRect();
          for (const p of protectedRects) {
            if (el.contains(document.querySelector(p.selector) as Node)) continue;
            if (intersects(rect, p.rect)) {
              issues.push({
                category: "layout",
                severity: "medium",
                confidence: 0.65,
                selector: `${cssPath(el)}${pseudo}`,
                explanation: `Pseudo-element line may pass through readable content (${p.selector})`,
                recommendedFix: "Offset decorative pseudo-elements away from text.",
              });
              lowCertainty.push(p.selector);
            }
          }
        }
      }

      return { issues: issues.slice(0, 25), lowCertainty: [...new Set(lowCertainty)].slice(0, 10) };
    },
    { scopeSelector, exclusions: thresholds.decorativeExclusions }
  );

  const findings = raw.issues.map((issue, i) =>
    evidenceToFinding(
      {
        category: "layout",
        severity: issue.severity as Finding["severity"],
        confidence: issue.confidence,
        route,
        selector: issue.selector,
        explanation: issue.explanation,
        recommendedFix: issue.recommendedFix,
        deterministic: issue.confidence >= 0.7,
      },
      "deco",
      i
    )
  );

  return { findings, lowCertaintyRegions: raw.lowCertainty };
}
