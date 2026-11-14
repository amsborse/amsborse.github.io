import type { ComponentType } from "react";
import type { ServiceId } from "@/components/hero/topology";

/**
 * Every site design in one list. Adding a design is one entry here, one skin CSS file in
 * src/styles/designs/ (imported in main.tsx, scoped to `:root[data-design="<id>"]`) and,
 * optionally, its own hero, interactions and plate treatment. Everything heavy is a lazy
 * loader, so a design costs nothing until someone picks it.
 */

/** What every design hero receives from HeroSection; a hero uses the parts it needs. */
export type DesignHeroProps = {
  theme: "dark" | "light";
  hovered: ServiceId | null;
  failed: ServiceId | null;
  reducedMotion: boolean;
  onHover: (id: ServiceId | null) => void;
  onSelect: (id: ServiceId) => void;
};

/** How the cinematic chapter plates are redrawn in this design's medium. */
export type PlateTreatment = "halftone" | "linework";

export type DesignDefinition = {
  id: string;
  label: string;
  hint: string;
  /** Replaces the island hero. Omit to keep the original island. */
  hero?: () => Promise<{ default: ComponentType<DesignHeroProps> }>;
  /** Page-wide interactions, mounted while the design is active; `mount` returns cleanup. */
  effects?: () => Promise<{ mount: () => () => void }>;
  /** Redraws the chapter plates. Omit to keep the original photographs. */
  plate?: PlateTreatment;
};

export const DESIGNS = [
  { id: "editorial", label: "Editorial", hint: "Warm paper and amber, the original" },
  {
    id: "blueprint",
    label: "Blueprint",
    hint: "Drafting grid, cyan ink, spec-sheet cards",
    hero: () =>
      import("./blueprint/HeroDrawing").then((module) => ({ default: module.HeroDrawing })),
    effects: () => import("./blueprint/effects"),
    plate: "linework",
  },
  {
    id: "broadsheet",
    label: "Broadsheet",
    hint: "Newsprint columns, vermilion, clipping cards",
    hero: () =>
      import("./broadsheet/HeroFrontPage").then((module) => ({
        default: module.HeroFrontPage,
      })),
    effects: () => import("./broadsheet/effects"),
    plate: "halftone",
  },
] as const satisfies readonly DesignDefinition[];

export type SiteDesign = (typeof DESIGNS)[number]["id"];

/** The original design: the default, and the fallback for anything unknown. */
export const DEFAULT_DESIGN: SiteDesign = "editorial";

export function designById(id: SiteDesign): DesignDefinition {
  return DESIGNS.find((design) => design.id === id) ?? DESIGNS[0];
}
