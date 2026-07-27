import type { Page } from "playwright";
import type { Finding } from "../types.ts";
import { evidenceToFinding } from "./types.ts";

export async function runZIndexValidation(
  page: Page,
  route: string,
  scopeSelector: string
): Promise<Finding[]> {
  const raw = await page.evaluate(
    ({ scopeSelector }) => {
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

      const layers = [...root.querySelectorAll("*")].slice(0, 400).map((el) => {
        const st = getComputedStyle(el);
        const z = st.zIndex === "auto" ? 0 : Number(st.zIndex) || 0;
        return {
          el: el as HTMLElement,
          selector: cssPath(el),
          z,
          position: st.position,
          rect: el.getBoundingClientRect(),
          role: el.getAttribute("role") || "",
          tag: el.tagName.toLowerCase(),
        };
      });

      for (const layer of layers) {
        if (layer.z >= 10000) {
          issues.push({
            category: "layout",
            severity: "medium",
            confidence: 0.8,
            selector: layer.selector,
            explanation: `Excessively high arbitrary z-index (${layer.z})`,
            recommendedFix: "Use repository stacking tokens/scale instead of extreme z-index.",
          });
        }
      }

      const dropdowns = layers.filter(
        (l) =>
          /menu|listbox|dialog/.test(l.role) ||
          /dropdown|popover|tooltip|modal/i.test(l.selector + l.el.className)
      );
      const cards = layers.filter((l) => /card|panel/i.test(l.selector + l.el.className));
      const headers = layers.filter(
        (l) => l.position === "fixed" || l.tag === "header" || /header|nav/i.test(l.selector)
      );

      const overlaps = (a: DOMRect, b: DOMRect) =>
        !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);

      for (const d of dropdowns) {
        for (const c of cards) {
          if (!overlaps(d.rect, c.rect)) continue;
          if (d.z < c.z) {
            issues.push({
              category: "layout",
              severity: "high",
              confidence: 0.85,
              selector: d.selector,
              explanation: `Dropdown/overlay ${d.selector} (z=${d.z}) appears behind card ${c.selector} (z=${c.z})`,
              recommendedFix: "Raise overlay stacking context above cards.",
            });
          }
        }
        for (const h of headers) {
          if (!overlaps(d.rect, h.rect)) continue;
          if (d.z <= h.z && /dialog|modal/i.test(d.role + d.selector)) {
            issues.push({
              category: "layout",
              severity: "high",
              confidence: 0.8,
              selector: d.selector,
              explanation: `Modal/dialog may sit behind fixed header ${h.selector}`,
              recommendedFix: "Ensure modal stacking exceeds fixed header layers.",
            });
          }
        }
      }

      // Tooltips under overflow containers
      for (const tip of layers.filter((l) => /tooltip/i.test(l.selector + l.el.className))) {
        let p: HTMLElement | null = tip.el.parentElement;
        while (p) {
          const st = getComputedStyle(p);
          if (st.overflow !== "visible" && tip.z <= 1) {
            issues.push({
              category: "layout",
              severity: "medium",
              confidence: 0.7,
              selector: tip.selector,
              explanation: "Tooltip may be clipped/hidden under an overflow ancestor",
              recommendedFix: "Portal tooltips to body or raise z-index above overflow ancestors.",
            });
            break;
          }
          p = p.parentElement;
        }
      }

      return issues.slice(0, 25);
    },
    { scopeSelector }
  );

  return raw.map((issue, i) =>
    evidenceToFinding(
      {
        category: "layout",
        severity: issue.severity as Finding["severity"],
        confidence: issue.confidence,
        route,
        selector: issue.selector,
        explanation: issue.explanation,
        recommendedFix: issue.recommendedFix,
        deterministic: true,
      },
      "z",
      i
    )
  );
}
