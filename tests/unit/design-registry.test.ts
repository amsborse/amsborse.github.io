import { describe, expect, it } from "vitest";
import { DEFAULT_DESIGN, DESIGNS, designById } from "@/designs/registry";
import { SITE_DESIGNS, isSiteDesign } from "@/theme/design";

describe("design registry", () => {
  it("gives every design a unique id and keeps Editorial as the default", () => {
    const ids = DESIGNS.map((design) => design.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(DEFAULT_DESIGN).toBe("editorial");
    expect(designById(DEFAULT_DESIGN)).not.toHaveProperty("hero");
  });

  it("feeds the design picker straight from the registry", () => {
    expect(SITE_DESIGNS.map((design) => design.id)).toEqual(DESIGNS.map((design) => design.id));
    for (const design of DESIGNS) expect(isSiteDesign(design.id)).toBe(true);
    expect(isSiteDesign("not-a-design")).toBe(false);
  });

  it("loads each design's hero and interactions", async () => {
    for (const design of DESIGNS) {
      const definition = designById(design.id);
      if (definition.hero) expect(typeof (await definition.hero()).default).toBe("function");
      if (definition.effects) expect(typeof (await definition.effects()).mount).toBe("function");
    }
  });
});
