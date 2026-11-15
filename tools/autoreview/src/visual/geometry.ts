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
        rects?: Array<{ x: number; y: number; width: number; height: number }>;
      }> = [];

      const stackZ = (el: Element) => {
        for (let node: Element | null = el; node; node = node.parentElement) {
          const z = Number.parseInt(getComputedStyle(node).zIndex, 10);
          if (Number.isFinite(z)) return z;
        }
        return 0;
      };
      // A positioned layer that ignores the pointer and paints at or below the other element
      // is scenery (a hero image, a glow), not something covering content. Its own callouts
      // and hotspots are still checked against each other because they live inside it.
      const behindAsBackdrop = (layer: Element, other: Element) => {
        const style = getComputedStyle(layer);
        const decorative =
          layer.closest("[aria-hidden='true']") !== null ||
          (style.pointerEvents === "none" && /absolute|fixed/.test(style.position));
        return decorative && !layer.contains(other) && stackZ(layer) <= stackZ(other);
      };

      // Exact tags: a bare /button|a|input/ matched any tag containing "a" (main, header,
      // section, span), which made page wrappers count as controls.
      const isInteractive = (g: { tag: string; el: HTMLElement }) =>
        /^(button|a|input|select|textarea)$/.test(g.tag) || g.el.tabIndex >= 0;
      // What a reader actually sees: text the element draws itself, a control, or media.
      const carriesContent = (g: { tag: string; el: HTMLElement }) =>
        isInteractive(g) ||
        /^(img|svg|video|canvas|picture|iframe)$/.test(g.tag) ||
        [...g.el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
      // A box laid over the flow that still catches the pointer (a fixed header, a stray layer).
      const isOverlay = (g: { position: string; pointerEvents: string }) =>
        /absolute|fixed/.test(g.position) && g.pointerEvents !== "none";

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
          if (behindAsBackdrop(a.el, b.el) || behindAsBackdrop(b.el, a.el)) continue;
          // Plain wrappers (<main>, a section) under a fixed header say nothing about where
          // content is drawn; their text and controls are compared on their own.
          if (!(carriesContent(a) || isOverlay(a)) || !(carriesContent(b) || isOverlay(b)))
            continue;
          if (!intersects(a.boundingRect, b.boundingRect)) continue;
          const area = intersectionArea(a.boundingRect, b.boundingRect);
          if (area < 24) continue;
          const aText = Boolean(a.text);
          const bText = Boolean(b.text);
          const aInteractive = isInteractive(a);
          const bInteractive = isInteractive(b);
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
              // Copy to plain objects: Playwright returns a DOMRect seen twice as null, so an
              // element overlapping two others crashed the check with "reading 'x'".
              rects: [a.boundingRect, b.boundingRect].map(({ x, y, width, height }) => ({
                x,
                y,
                width,
                height,
              })),
            });
          }
        }
      }

      // Content-edge collision. A reader only sees an edge where a box paints one (a border, a
      // fill that differs from what is behind it, a shadow), so content is measured against the
      // nearest such box, and only on its painted sides. Measuring against the direct parent
      // flagged every heading flush with an invisible layout wrapper: hundreds of hits per page,
      // none of them visible on screen.
      const transparent = (c: string) => c === "transparent" || /^rgba\(.*,\s*0\)$/.test(c.trim());
      const fillOf = (s: CSSStyleDeclaration) =>
        (transparent(s.backgroundColor) ? "" : s.backgroundColor) +
        (s.backgroundImage === "none" ? "" : s.backgroundImage);
      const paintedSides = (el: Element) => {
        const s = getComputedStyle(el);
        const fill = fillOf(s);
        const behind = el.parentElement ? fillOf(getComputedStyle(el.parentElement)) : "";
        const whole = (fill !== "" && fill !== behind) || s.boxShadow !== "none";
        const side = (name: "Top" | "Right" | "Bottom" | "Left") =>
          whole ||
          (parseFloat(s[`border${name}Width`]) > 0 &&
            s[`border${name}Style`] !== "none" &&
            !transparent(s[`border${name}Color`]));
        return [side("Left"), side("Right"), side("Top"), side("Bottom")];
      };
      const frameOf = (el: Element) => {
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
          const sides = paintedSides(a);
          if (sides.some(Boolean)) return { box: a, sides };
        }
        return null;
      };
      for (const g of geos) {
        const interactive = isInteractive(g);
        // Only what draws text itself or is a control; wrappers are judged through their content.
        if (!(interactive || (g.text && carriesContent(g)))) continue;
        if (intentional(g.el) || g.boundingRect.width <= 1 || g.boundingRect.height <= 1) continue;
        const frame = frameOf(g.el);
        if (!frame) continue;
        const pr = frame.box.getBoundingClientRect();
        if (pr.width < 8 || pr.height < 8) continue;
        // An element that paints nothing itself shows only its content, so its own padding
        // counts as space (a full-width row link padded away from the divider above it).
        const own = getComputedStyle(g.el);
        const inset = paintedSides(g.el).some(Boolean)
          ? [0, 0, 0, 0]
          : [own.paddingLeft, own.paddingRight, own.paddingTop, own.paddingBottom].map(parseFloat);
        const r = g.boundingRect;
        const gaps = [r.left - pr.left, pr.right - r.right, r.top - pr.top, pr.bottom - r.bottom]
          .map((gap, i) => gap + inset[i])
          .filter((_, i) => frame.sides[i]);
        const min = interactive ? thresholds.interactiveToEdgePx : thresholds.textToEdgePx;
        const closest = Math.min(...gaps);
        if (closest < min) {
          issues.push({
            category: "layout",
            severity: "medium",
            confidence: 0.85,
            selector: g.selector,
            explanation: `Content-edge collision: ${g.selector} within ${closest.toFixed(1)}px of container edge (threshold ${min}px)`,
            recommendedFix: "Increase padding/margin to meet spacing minimums.",
          });
        }
      }

      // Clipping
      for (const g of geos) {
        // A visually hidden (sr-only) box is 1px with overflow hidden on purpose: its text is
        // for screen readers, so nothing a reader sees is clipped.
        if (g.clientRect.width <= 1 || g.clientRect.height <= 1) continue;
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
