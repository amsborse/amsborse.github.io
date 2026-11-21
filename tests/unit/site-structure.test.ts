import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { facets, navItems } from "@/data";
import { ARSENAL_LABS } from "@/data/arsenalTopics";
import { isImmersiveSandbox, shouldDisableGlobalEffects } from "@/layout/immersiveRoutes";

const appSource = readFileSync("src/App.tsx", "utf8");
const routePaths = new Set(
  [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => `/${m[1]}`)
);

describe("site structure", () => {
  it("keeps the résumé inside Experience instead of a separate nav item", () => {
    const labels = navItems.map((item) => item.label);
    expect(labels).toContain("Experience");
    expect(labels).not.toContain("Resume");
    expect(routePaths.has("/resume")).toBe(true);
  });

  it("points every home facet at a real route", () => {
    expect(facets.length).toBeGreaterThanOrEqual(4);
    for (const facet of facets) {
      expect(routePaths.has(facet.to), facet.to).toBe(true);
    }
  });
});

describe("arsenal labs", () => {
  it("points every lab card at a real route, with unique ids", () => {
    const ids = ARSENAL_LABS.map((lab) => lab.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const lab of ARSENAL_LABS) {
      expect(routePaths.has(lab.path), lab.path).toBe(true);
    }
  });

  it("lists the infinity lab as a scrolling page with its own atmosphere", () => {
    expect(ARSENAL_LABS.some((lab) => lab.path === "/arsenal/infinity")).toBe(true);
    expect(isImmersiveSandbox("/arsenal/infinity")).toBe(false);
    expect(shouldDisableGlobalEffects("/arsenal/infinity")).toBe(true);
  });
});

describe("project cards", () => {
  it("never link to the bare GitHub profile instead of a real repository", async () => {
    const { projects } = await import("@/data");
    for (const project of projects) {
      for (const link of project.links) {
        expect(link.href, project.id).not.toMatch(/^https:\/\/github\.com\/[^/]+\/?$/);
      }
    }
  });
});

describe("earlier work list", () => {
  it("lists each repository once with a real year", async () => {
    const { earlierWork } = await import("@/data");
    const repos = earlierWork.map((w) => w.repo);
    expect(new Set(repos).size).toBe(repos.length);
    for (const w of earlierWork) expect(w.year).toBeGreaterThanOrEqual(2015);
  });
});

describe("home facets", () => {
  it("include writing, building and creativity", async () => {
    const { facets } = await import("@/data");
    const ids = facets.map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(["writer", "builder", "creative"]));
  });
});
