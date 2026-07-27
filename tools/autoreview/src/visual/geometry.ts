import type { Page } from "playwright";
import type { Finding } from "../types.ts";
import {
  DEFAULT_VISUAL_THRESHOLDS,
  evidenceToFinding,
  type ElementGeometry,
  type VisualThresholds,
} from "./types.ts";

export async function runLayoutGeometryValidation(
  page: Page,
  route: string,
  scopeSelector: string,
  thresholds: VisualThresholds = DEFAULT_VISUAL_THRESHOLDS
): Promise<{ findings: Finding[]; geometries: ElementGeometry[] }> {
  const raw = await page.evaluate(
    ({ scopeSelector, thresholds, route }) => {
      const root =
        document.querySelector(scopeSelector) || document.querySelector("main") || document.body;

      const intentional = (el: Element) =>
        thresholds.intentionalOverlaySelectors.some((sel) => {
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
        const tag = el.tagName.toLowerCase();
        const parent = el.parentElement;
        if (!parent) return tag;
        const idx = [...parent.children].indexOf(el) + 1;
        return `${cssPath(parent)} > ${tag}:nth-child(${idx})`;
      };

      const nodes = [...root.querySelectorAll("*")].slice(0, 500) as HTMLElement[];
      const geos: Array<{
        selector: string;
        tag: string;
        el: HTMLElement;
        boundingRect: DOMRect;
        clientRect: { width: number; height: number };
        scroll: { width: number; height: number };
        margin: string;
        padding: string;
        borderWidth: string;
        position: string;
        transform: string;
        overflow: string;
        zIndex: string;
        visibility: string;
        opacity: string;
        pointerEvents: string;
        text?: { width: number; height: number; fontSize: string; lineHeight: string };
      }> = [];

      for (const el of nodes) {
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;
        const rect = el.getBoundingClientRect();
        if (rect.width < 1 && rect.height < 1) continue;
        const textContent = (el.innerText || "").trim();
        geos.push({
          selector: cssPath(el),
          tag: el.tagName.toLowerCase(),
          el,
          boundingRect: rect,
          clientRect: { width: el.clientWidth, height: el.clientHeight },
          scroll: { width: el.scrollWidth, height: el.scrollHeight },
          margin: style.margin,
          padding: style.padding,
          borderWidth: style.borderWidth,
          position: style.position,
          transform: style.transform,
          overflow: `${style.overflowX}/${style.overflowY}`,
          zIndex: style.zIndex,
          visibility: style.visibility,
          opacity: style.opacity,
          pointerEvents: style.pointerEvents,
          text: textContent
            ? {
                width: rect.width,
                height: rect.height,
                fontSize: style.fontSize,
                lineHeight: style.lineHeight,
              }
            : undefined,
        });
      }

      const issues: Array<{
        category: string;
        severity: string;
        confidence: number;
        selector: string;
        explanation: string;
        recommendedFix?: string;
        rects?: DOMRect[];
      }> = [];

      const intersects = (a: DOMRect, b: DOMRect) =>
        !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);

      const intersectionArea = (a: DOMRect, b: DOMRect) => {
        const w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        return w * h;
      };

      // Overlap among separate regions
      for (let i = 0; i < Math.min(geos.length, 120); i++) {
        for (let j = i + 1; j < Math.min(geos.length, 120); j++) {
          const a = geos[i];
          const b = geos[j];
          if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
          if (intentional(a.el) || intentional(b.el)) continue;
          if (!intersects(a.boundingRect, b.boundingRect)) continue;
          const area = intersectionArea(a.boundingRect, b.boundingRect);
          if (area < 24) continue;
          const aText = Boolean(a.text);
          const bText = Boolean(b.text);
          const aInteractive = /button|a|input|select|textarea/.test(a.tag) || a.el.tabIndex >= 0;
          const bInteractive = /button|a|input|select|textarea/.test(b.tag) || b.el.tabIndex >= 0;
          const badgeLike = /badge|chip|pill|icon|label|action/i.test(
            a.selector + b.selector + a.el.className + b.el.className
          );
          const fixedSticky =
            a.position === "fixed" ||
            a.position === "sticky" ||
            b.position === "fixed" ||
            b.position === "sticky";
          const absEscape = a.position === "absolute" || b.position === "absolute";

          if (
            (aText && bInteractive) ||
            (bText && aInteractive) ||
            badgeLike ||
            fixedSticky ||
            absEscape
          ) {
            issues.push({
              category: "overlap",
              severity: badgeLike || fixedSticky ? "high" : "medium",
              confidence: badgeLike ? 0.9 : 0.75,
              selector: a.selector,
              explanation: `Meaningful overlap between ${a.selector} and ${b.selector} (~${Math.round(area)}px²)`,
              recommendedFix:
                "Reserve layout space or adjust stacking so badges/actions do not cover text or controls.",
              rects: [a.boundingRect, b.boundingRect],
            });
          }
        }
      }

      // Content-edge collision
      for (const g of geos) {
        const parent = g.el.parentElement;
        if (!parent) continue;
        const pr = parent.getBoundingClientRect();
        if (pr.width < 8 || pr.height < 8) continue;
        const left = g.boundingRect.left - pr.left;
        const right = pr.right - g.boundingRect.right;
        const top = g.boundingRect.top - pr.top;
        const bottom = pr.bottom - g.boundingRect.bottom;
        const interactive = /button|a|input|select|textarea/.test(g.tag) || g.el.tabIndex >= 0;
        const min = interactive ? thresholds.interactiveToEdgePx : thresholds.textToEdgePx;
        if (g.text || interactive) {
          if (left < min || right < min || top < min || bottom < min) {
            issues.push({
              category: "layout",
              severity: "medium",
              confidence: 0.85,
              selector: g.selector,
              explanation: `Content-edge collision: ${g.selector} within ${Math.min(left, right, top, bottom).toFixed(1)}px of container edge (threshold ${min}px)`,
              recommendedFix: "Increase padding/margin to meet spacing minimums.",
            });
          }
        }
      }

      // Clipping
      for (const g of geos) {
        if (g.scroll.width > g.clientRect.width + 2 || g.scroll.height > g.clientRect.height + 2) {
          const style = getComputedStyle(g.el);
          if (
            style.overflow === "hidden" ||
            style.overflowX === "hidden" ||
            style.overflowY === "hidden"
          ) {
            issues.push({
              category: "clipping",
              severity: "high",
              confidence: 0.9,
              selector: g.selector,
              explanation: `Clipping detected on ${g.selector} (scroll ${g.scroll.width}x${g.scroll.height} vs client ${g.clientRect.width}x${g.clientRect.height})`,
              recommendedFix:
                "Allow wrap/expand or intentional ellipsis with truncation indicator.",
            });
          }
        }
      }

      // Focus ring clipping heuristic
      const focused = document.activeElement as HTMLElement | null;
      if (focused && root.contains(focused)) {
        const fr = focused.getBoundingClientRect();
        let p = focused.parentElement;
        while (p && p !== document.body) {
          const st = getComputedStyle(p);
          if (st.overflow !== "visible") {
            const pr = p.getBoundingClientRect();
            if (
              fr.top < pr.top - 2 ||
              fr.bottom > pr.bottom + 2 ||
              fr.left < pr.left - 2 ||
              fr.right > pr.right + 2
            ) {
              issues.push({
                category: "focus",
                severity: "high",
                confidence: 0.8,
                selector: cssPath(focused),
                explanation: "Focus ring may be clipped by an overflow-hidden ancestor",
                recommendedFix:
                  "Use overflow:visible on focus ancestors or outline-offset inside bounds.",
              });
              break;
            }
          }
          p = p.parentElement;
        }
      }

      return {
        route,
        issues: issues.slice(0, 40),
        geometries: geos.slice(0, 80).map(({ el: _el, boundingRect, ...rest }) => ({
          ...rest,
          boundingRect: {
            x: boundingRect.x,
            y: boundingRect.y,
            width: boundingRect.width,
            height: boundingRect.height,
          },
        })),
      };
    },
    {
      scopeSelector,
      thresholds: {
        textToEdgePx: thresholds.textToEdgePx,
        interactiveToEdgePx: thresholds.interactiveToEdgePx,
        intentionalOverlaySelectors: thresholds.intentionalOverlaySelectors,
      },
      route,
    }
  );

  const findings = raw.issues.map((issue, i) =>
    evidenceToFinding(
      {
        category: issue.category,
        severity: issue.severity as Finding["severity"],
        confidence: issue.confidence,
        route,
        selector: issue.selector,
        explanation: issue.explanation,
        recommendedFix: issue.recommendedFix,
        boundingRects: issue.rects?.map((r) => ({
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
        })),
        deterministic: true,
      },
      "geom",
      i
    )
  );

  return { findings, geometries: raw.geometries as ElementGeometry[] };
}
