import type { Page } from "playwright";
import type { Finding } from "../types.ts";
import { evidenceToFinding } from "./types.ts";

export async function runScopedA11yChecks(
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

      // Keyboard reachability / focus-visible
      const focusables = [
        ...root.querySelectorAll(
          "a[href],button,input,select,textarea,[tabindex]:not([tabindex='-1'])"
        ),
      ] as HTMLElement[];

      for (const el of focusables.slice(0, 40)) {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (style.visibility === "hidden" || style.display === "none") continue;
        if (rect.width < 24 || rect.height < 24) {
          issues.push({
            category: "touch-target",
            severity: "medium",
            confidence: 0.85,
            selector: cssPath(el),
            explanation: `Touch target too small (${Math.round(rect.width)}x${Math.round(rect.height)})`,
            recommendedFix: "Increase interactive hit area to ≥44×44 where practical.",
          });
        }
        const name =
          el.getAttribute("aria-label") ||
          el.getAttribute("aria-labelledby") ||
          (el as HTMLInputElement).labels?.[0]?.textContent ||
          el.textContent;
        if (!name?.trim() && el.tagName !== "INPUT") {
          issues.push({
            category: "accessibility",
            severity: "high",
            confidence: 0.8,
            selector: cssPath(el),
            explanation: "Interactive element missing accessible name",
            recommendedFix: "Add aria-label or visible text content.",
          });
        }
        if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") {
          if (
            el.tabIndex >= 0 &&
            el.getAttribute("aria-disabled") !== "true" &&
            !el.hasAttribute("disabled")
          ) {
            issues.push({
              category: "accessibility",
              severity: "medium",
              confidence: 0.7,
              selector: cssPath(el),
              explanation: "Disabled semantics may be incomplete",
              recommendedFix: "Use disabled attribute or aria-disabled consistently.",
            });
          }
        }
      }

      // Decorative images should be aria-hidden / alt=""
      for (const img of [...root.querySelectorAll("img")].slice(0, 30)) {
        const decorative = img.getAttribute("role") === "presentation" || img.alt === "";
        const alt = img.getAttribute("alt");
        if (alt == null) {
          issues.push({
            category: "accessibility",
            severity: "medium",
            confidence: 0.85,
            selector: cssPath(img),
            explanation: "Image missing alt attribute",
            recommendedFix: 'Provide alt text or alt="" for decorative images.',
          });
        }
        void decorative;
      }

      // Dialog escape/focus return hooks
      const dialog = root.querySelector("[role='dialog'], dialog, [aria-modal='true']");
      if (dialog) {
        if (!dialog.getAttribute("aria-label") && !dialog.getAttribute("aria-labelledby")) {
          issues.push({
            category: "accessibility",
            severity: "high",
            confidence: 0.85,
            selector: cssPath(dialog),
            explanation: "Dialog missing accessible name",
            recommendedFix: "Set aria-labelledby or aria-label on the dialog.",
          });
        }
      }

      // Expanded/selected state attributes consistency
      for (const el of [...root.querySelectorAll("[aria-expanded], [aria-selected]")].slice(
        0,
        30
      )) {
        const val = el.getAttribute("aria-expanded") || el.getAttribute("aria-selected");
        if (val !== "true" && val !== "false") {
          issues.push({
            category: "accessibility",
            severity: "medium",
            confidence: 0.8,
            selector: cssPath(el),
            explanation: `Invalid boolean ARIA state value "${val}"`,
            recommendedFix: "Use aria-expanded/selected as true|false.",
          });
        }
      }

      // Contrast heuristic (very rough luminance on text vs background)
      for (const el of focusables.slice(0, 15)) {
        const st = getComputedStyle(el);
        const fg = st.color;
        const bg = st.backgroundColor;
        if (
          fg.includes("rgba") &&
          /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0?\.?[0-3]\d*\s*\)/.test(fg)
        ) {
          issues.push({
            category: "contrast",
            severity: "medium",
            confidence: 0.55,
            selector: cssPath(el),
            explanation: `Possibly low-contrast text color ${fg} on ${bg}`,
            recommendedFix: "Increase contrast to meet WCAG for body/UI text.",
          });
        }
      }

      return issues.slice(0, 30);
    },
    { scopeSelector }
  );

  // Keyboard focus probe
  try {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return null;
      const st = getComputedStyle(el);
      return {
        tag: el.tagName,
        outline: st.outlineStyle,
        outlineWidth: st.outlineWidth,
        boxShadow: st.boxShadow,
      };
    });
    if (focused && focused.outline === "none" && focused.boxShadow === "none") {
      raw.push({
        category: "focus",
        severity: "high",
        confidence: 0.7,
        selector: focused.tag,
        explanation: "No visible focus indicator after Tab",
        recommendedFix: "Provide :focus-visible outline or ring styles.",
      });
    }
  } catch {
    /* ignore */
  }

  return raw.map((issue, i) =>
    evidenceToFinding(
      {
        category: (issue.category as Finding["category"]) || "accessibility",
        severity: issue.severity as Finding["severity"],
        confidence: issue.confidence,
        route,
        selector: issue.selector,
        explanation: issue.explanation,
        recommendedFix: issue.recommendedFix,
        deterministic: true,
      },
      "a11y",
      i
    )
  );
}
