import { describe, expect, it } from "vitest";
import { qualityForViewport } from "@/components/hero/heroQuality";

describe("hero quality tier selection", () => {
  it("uses low detail on phone widths or very slow frames", () => {
    expect(qualityForViewport(390)).toBe("low");
    expect(qualityForViewport(600)).toBe("low");
    expect(qualityForViewport(1200, 22)).toBe("low");
  });

  it("uses medium detail on tablet widths or sustained slow frames", () => {
    expect(qualityForViewport(834)).toBe("medium");
    expect(qualityForViewport(1000)).toBe("medium");
    expect(qualityForViewport(1200, 40)).toBe("medium");
  });

  it("keeps desktop quality at wide viewports and stable frame times", () => {
    expect(qualityForViewport(1672, 60)).toBe("high");
  });
});
