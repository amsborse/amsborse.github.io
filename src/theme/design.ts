import { DEFAULT_DESIGN, DESIGNS, type SiteDesign } from "@/designs/registry";

export type { SiteDesign } from "@/designs/registry";

export const DESIGN_STORAGE_KEY = "portfolio-design";

/** The switcher's menu, in registry order. */
export const SITE_DESIGNS: { id: SiteDesign; label: string; hint: string }[] = DESIGNS.map(
  ({ id, label, hint }) => ({ id, label, hint })
);

export function isSiteDesign(value: unknown): value is SiteDesign {
  return SITE_DESIGNS.some((d) => d.id === value);
}

/** URL ?design= wins (for sharing and screenshots), then the saved choice, then the original. */
export function resolveInitialDesign(): SiteDesign {
  if (typeof window === "undefined") return DEFAULT_DESIGN;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("design");
    if (isSiteDesign(fromUrl)) return fromUrl;
    const stored = localStorage.getItem(DESIGN_STORAGE_KEY);
    if (isSiteDesign(stored)) return stored;
  } catch {
    /* storage blocked: fall back to the original design */
  }
  return DEFAULT_DESIGN;
}

export function applySiteDesign(design: SiteDesign) {
  document.documentElement.setAttribute("data-design", design);
}

export function saveSiteDesign(design: SiteDesign) {
  try {
    localStorage.setItem(DESIGN_STORAGE_KEY, design);
  } catch {
    /* storage blocked: the choice lasts for this visit only */
  }
}
