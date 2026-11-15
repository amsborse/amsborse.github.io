import { DEFAULT_DESIGN, DESIGNS, type SiteDesign } from "@/designs/registry";
import { readAssignment, resolveDesign } from "@/experiments/assignment";
import { ASSIGNMENT_STORAGE_KEY } from "@/experiments/config";

export type { SiteDesign } from "@/designs/registry";

export const DESIGN_STORAGE_KEY = "portfolio-design";

/** The switcher's menu, in registry order. */
export const SITE_DESIGNS: { id: SiteDesign; label: string; hint: string }[] = DESIGNS.map(
  ({ id, label, hint }) => ({ id, label, hint })
);

export function isSiteDesign(value: unknown): value is SiteDesign {
  return SITE_DESIGNS.some((d) => d.id === value);
}

/**
 * URL ?design= wins (for sharing and screenshots), then the choice made in the picker, then the
 * design experiment's sticky assignment (src/experiments), then the original.
 */
export function resolveInitialDesign(): SiteDesign {
  if (typeof window === "undefined") return DEFAULT_DESIGN;
  try {
    const ids = SITE_DESIGNS.map((d) => d.id);
    const { design } = resolveDesign({
      designs: ids,
      fallback: DEFAULT_DESIGN,
      fromUrl: new URLSearchParams(window.location.search).get("design"),
      fromPicker: localStorage.getItem(DESIGN_STORAGE_KEY),
      assignment: readAssignment(localStorage.getItem(ASSIGNMENT_STORAGE_KEY), ids),
    });
    if (isSiteDesign(design)) return design;
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
