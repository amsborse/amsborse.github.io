import type { Page } from "playwright";
import type { Finding } from "./types.ts";

export interface DeterministicScanResult {
  findings: Finding[];
  metrics: Record<string, number>;
}

/**
 * Browser-side deterministic visual/a11y layout checks for the current page.
 */
export async function runDeterministicChecks(
  page: Page,
  route: string
): Promise<DeterministicScanResult> {
  const raw = await page.evaluate(() => {
    const findings: Array<{
      category: string;
      severity: string;
      confidence: number;
      selector: string;
      explanation: string;
      recommendedFix?: string;
    }> = [];

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Horizontal / viewport overflow
    if (document.documentElement.scrollWidth > vw + 1) {
      findings.push({
        category: "overflow",
        severity: "high",
        confidence: 0.95,
        selector: "html",
        explanation: `Horizontal overflow detected (${document.documentElement.scrollWidth}px > ${vw}px viewport)`,
        recommendedFix: "Constrain wide children with max-width/overflow and responsive widths.",
      });
    }

    const all = [...document.querySelectorAll("body *")] as HTMLElement[];
    const boxes: Array<{ el: HTMLElement; rect: DOMRect }> = [];
    for (const el of all.slice(0, 800)) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      boxes.push({ el, rect });
    }

    // Zero-size interactive
    for (const el of all) {
      const tag = el.tagName.toLowerCase();
      const interactive =
        tag === "button" || tag === "a" || el.getAttribute("role") === "button" || el.tabIndex >= 0;
      if (!interactive) continue;
      // Not rendered at all (inside a [hidden] panel or a breakpoint-hidden menu): nothing to
      // click and nothing to see, so it is not a zero-size control.
      if (el.getClientRects().length === 0) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) {
        findings.push({
          category: "interaction",
          severity: "high",
          confidence: 0.9,
          selector: cssPath(el),
          explanation: "Interactive element has zero size",
          recommendedFix: "Ensure clickable controls have non-zero dimensions.",
        });
      } else if (rect.width < 24 || rect.height < 24) {
        findings.push({
          category: "touch-target",
          severity: "medium",
          confidence: 0.85,
          selector: cssPath(el),
          explanation: `Touch target too small (${Math.round(rect.width)}x${Math.round(rect.height)})`,
          recommendedFix: "Increase hit area to at least ~44x44 CSS pixels on touch UIs.",
        });
      }
    }

    // Text clipping
    for (const el of all.slice(0, 400)) {
      const style = getComputedStyle(el);
      if (!el.textContent?.trim()) continue;
      if (style.overflow === "hidden" || style.textOverflow === "ellipsis") {
        if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) {
          findings.push({
            category: "clipping",
            severity: "medium",
            confidence: 0.8,
            selector: cssPath(el),
            explanation: "Text appears clipped by overflow:hidden container",
            recommendedFix: "Allow wrapping or expand the container.",
          });
        }
      }
    }

    // Broken images
    for (const img of document.querySelectorAll("img")) {
      if (img.complete && img.naturalWidth === 0 && (img.getAttribute("src") || "").length > 0) {
        findings.push({
          category: "asset-path",
          severity: "high",
          confidence: 0.92,
          selector: cssPath(img),
          explanation: `Broken image: ${img.getAttribute("src")}`,
          recommendedFix: "Fix src path, including GitHub Pages base path if needed.",
        });
      }
    }

    // Duplicate IDs
    const ids = new Map<string, number>();
    for (const el of document.querySelectorAll("[id]")) {
      const id = el.id;
      ids.set(id, (ids.get(id) || 0) + 1);
    }
    for (const [id, count] of ids) {
      if (count > 1) {
        findings.push({
          category: "accessibility",
          severity: "medium",
          confidence: 1,
          selector: `#${CSS.escape(id)}`,
          explanation: `Duplicate id "${id}" appears ${count} times`,
          recommendedFix: "Make IDs unique within the document.",
        });
      }
    }

    // Invisible but focusable
    for (const el of all) {
      if (
        el.tabIndex < 0 &&
        el.tagName !== "A" &&
        el.tagName !== "BUTTON" &&
        el.tagName !== "INPUT"
      ) {
        continue;
      }
      const focusable =
        el.tabIndex >= 0 || ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(el.tagName);
      if (!focusable) continue;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const invisible =
        style.visibility === "hidden" ||
        style.opacity === "0" ||
        (rect.width > 0 && style.position === "absolute" && (rect.right < 0 || rect.bottom < 0));
      if (invisible) {
        findings.push({
          category: "focus",
          severity: "medium",
          confidence: 0.75,
          selector: cssPath(el),
          explanation: "Element is focusable but not visibly rendered",
          recommendedFix: "Remove from tab order (tabindex=-1) or make it visible when focused.",
        });
      }
    }

    // Overlap between elements that own visible text. Page wrappers (a full-page <main> under
    // a fixed header) contain text but their boxes say nothing about where it is drawn.
    const textBoxes = boxes
      // Off-screen text (a skip link parked at left:-9999px until focused) is not on the page.
      .filter((b) => ownsText(b.el) && b.rect.right > 0 && b.rect.left < window.innerWidth)
      .map((b) => ({ el: b.el, rect: textRect(b.el) ?? b.rect }));
    let overlapCount = 0;
    for (let i = 0; i < Math.min(textBoxes.length, 200); i++) {
      for (let j = i + 1; j < Math.min(textBoxes.length, 200); j++) {
        const a = textBoxes[i];
        const b = textBoxes[j];
        if (!a.el.contains(b.el) && !b.el.contains(a.el) && overlaps(a.rect, b.rect)) {
          const za = stackZ(a.el);
          const zb = stackZ(b.el);
          if (Math.abs(za - zb) > 10) {
            overlapCount += 1;
            if (overlapCount <= 5) {
              findings.push({
                category: "overlap",
                severity: "high",
                confidence: 0.7,
                selector: cssPath(a.el),
                explanation: `Possible overlapping content between ${cssPath(a.el)} and ${cssPath(b.el)}`,
                recommendedFix:
                  "Adjust stacking context, spacing, or layout so text/controls do not collide.",
              });
            }
          }
        }
      }
    }

    // Fixed header occlusion
    const fixedHeaders = boxes.filter((b) => {
      const s = getComputedStyle(b.el);
      return (
        s.position === "fixed" && b.rect.top <= 0 && b.rect.height > 40 && b.rect.width > vw * 0.5
      );
    });
    if (fixedHeaders.length) {
      const headerBottom = Math.max(...fixedHeaders.map((h) => h.rect.bottom));
      for (const b of textBoxes.slice(0, 200)) {
        if (b.rect.top < headerBottom && b.rect.bottom > 0) {
          if (fixedHeaders.some((h) => h.el.contains(b.el))) continue;
          const s = getComputedStyle(b.el);
          if (s.position === "fixed" || s.position === "sticky") continue;
          if (b.rect.top < headerBottom - 4 && b.rect.top >= 0) {
            findings.push({
              category: "layout",
              severity: "medium",
              confidence: 0.65,
              selector: cssPath(b.el),
              explanation: "Content may be hidden behind a fixed header",
              recommendedFix: "Add top padding/scroll-margin matching the header height.",
            });
            break;
          }
        }
      }
    }

    function overlaps(a: DOMRect, b: DOMRect): boolean {
      return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
    }
    /** True when the element itself draws text (a direct, non-blank text node). */
    function ownsText(el: HTMLElement): boolean {
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) return true;
      }
      return false;
    }
    /** Where the element's own text is drawn, without its padding or empty space. */
    function textRect(el: HTMLElement): DOMRect | null {
      const range = document.createRange();
      let box: DOMRect | null = null;
      for (const node of el.childNodes) {
        if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue;
        range.selectNodeContents(node);
        const r = range.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        box = box
          ? new DOMRect(
              Math.min(box.left, r.left),
              Math.min(box.top, r.top),
              Math.max(box.right, r.right) - Math.min(box.left, r.left),
              Math.max(box.bottom, r.bottom) - Math.min(box.top, r.top)
            )
          : r;
      }
      return box;
    }
    /** The z-index the element paints at: its own, or that of the nearest ancestor that sets one. */
    function stackZ(el: HTMLElement): number {
      for (let cur: HTMLElement | null = el; cur; cur = cur.parentElement) {
        const z = Number(getComputedStyle(cur).zIndex);
        if (Number.isFinite(z)) return z;
      }
      return 0;
    }
    function cssPath(el: Element): string {
      if ((el as HTMLElement).dataset?.testid) {
        return `[data-testid='${(el as HTMLElement).dataset.testid}']`;
      }
      if (el.id) return `#${CSS.escape(el.id)}`;
      const tag = el.tagName.toLowerCase();
      const parent = el.parentElement;
      if (!parent) return tag;
      const idx = [...parent.children].indexOf(el) + 1;
      return `${cssPath(parent)} > ${tag}:nth-child(${idx})`;
    }

    return {
      findings,
      metrics: {
        viewportWidth: vw,
        viewportHeight: vh,
        scrollWidth: document.documentElement.scrollWidth,
        elementSample: boxes.length,
        overlapCount,
      },
    };
  });

  const findings: Finding[] = raw.findings.map((f, i) => ({
    id: `det-${route}-${i}`,
    severity: f.severity as Finding["severity"],
    confidence: f.confidence,
    category: f.category as Finding["category"],
    selector: f.selector,
    route,
    explanation: f.explanation,
    recommendedFix: f.recommendedFix,
    source: "deterministic",
  }));

  return { findings, metrics: raw.metrics };
}
