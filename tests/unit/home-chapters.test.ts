import { describe, expect, it } from "vitest";
import { homeChapters } from "../../src/components/home/chapters";

describe("home chapters", () => {
  it("tells the story in the order a visitor reads it", () => {
    expect(homeChapters.map((chapter) => chapter.label)).toEqual([
      "Introduction",
      "Experience",
      "Projects",
      "Engineering depth",
      "Writing",
      "Contact",
    ]);
  });

  it("gives every chapter a unique id that works as a link target", () => {
    const ids = homeChapters.map((chapter) => chapter.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z-]*$/);
  });
});
