export type SiteDesign = "editorial" | "blueprint" | "broadsheet";

export const DESIGN_STORAGE_KEY = "portfolio-design";

export const SITE_DESIGNS: { id: SiteDesign; label: string; hint: string }[] = [
  { id: "editorial", label: "Editorial", hint: "Warm paper and amber, the original" },
  { id: "blueprint", label: "Blueprint", hint: "Drafting grid, cyan ink, spec-sheet cards" },
  { id: "broadsheet", label: "Broadsheet", hint: "Newsprint columns, vermilion, clipping cards" },
];

export function isSiteDesign(value: unknown): value is SiteDesign {
  return SITE_DESIGNS.some((d) => d.id === value);
}

/** URL ?design= wins (for sharing and screenshots), then the saved choice, then the original. */
export function resolveInitialDesign(): SiteDesign {
  if (typeof window === "undefined") return "editorial";
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("design");
    if (isSiteDesign(fromUrl)) return fromUrl;
    const stored = localStorage.getItem(DESIGN_STORAGE_KEY);
    if (isSiteDesign(stored)) return stored;
  } catch {
    /* storage blocked: fall back to the original design */
  }
  return "editorial";
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
