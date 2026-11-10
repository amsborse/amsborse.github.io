import { describe, expect, it } from "vitest";
import { getArticleSummaries, type ArticleSummary } from "@/utils/loadArticles";
import { categoriesFor, isPrimaryLanguage } from "@/utils/writingCatalog";
import { writingCategories } from "@/data/writingCategories";
import {
  articlesByYear,
  featuredArticles,
  filterArchive,
  homeSearchParams,
  parseHomeFilters,
  readingShelves,
  themeCounts,
} from "@/components/writing/home/catalog";

function article(slug: string, fields: Partial<ArticleSummary> = {}): ArticleSummary {
  return {
    slug,
    title: slug,
    description: "",
    date: "2025-01-01",
    featured: false,
    readingMinutes: 1,
    tags: [],
    headings: [],
    ...fields,
  };
}

describe("reading-room selection", () => {
  it("selects up to four primary features by date without mutating the input", async () => {
    const all = await getArticleSummaries();
    const snapshot = all.map((post) => post.slug);
    const selected = featuredArticles([...all].reverse());
    expect(selected).toHaveLength(4);
    expect(selected.every((post) => post.featured && isPrimaryLanguage(post))).toBe(true);
    expect(selected.map((post) => post.slug)).toEqual(
      all
        .filter((post) => post.featured && isPrimaryLanguage(post))
        .slice(0, 4)
        .map((post) => post.slug)
    );
    expect(all.map((post) => post.slug)).toEqual(snapshot);
    expect(featuredArticles([])).toEqual([]);
    expect(featuredArticles([article("mr", { featured: true, lang: "mr" })])).toEqual([]);
  });

  it("counts only originals, and intersects theme and search using the real catalog", async () => {
    const all = await getArticleSummaries();
    const counts = themeCounts(all);
    for (const category of writingCategories) {
      const expected = all.filter(
        (post) => isPrimaryLanguage(post) && categoriesFor(post).some((c) => c.id === category.id)
      );
      expect(counts.get(category.id)).toBe(expected.length);
      expect(filterArchive(all, { theme: category.id, query: "" })).toEqual(expected);
    }
    const matches = filterArchive(all, { theme: "emotions", query: "stress" });
    expect(matches.length).toBeGreaterThan(0);
    expect(
      matches.every(
        (post) => isPrimaryLanguage(post) && categoriesFor(post).some((c) => c.id === "emotions")
      )
    ).toBe(true);
    expect(filterArchive(all, { theme: null, query: "" })).toEqual(all.filter(isPrimaryLanguage));
    expect(filterArchive(all, { theme: "engineering", query: "no-such-word-xxxxx" })).toEqual([]);
  });

  it("surfaces both collections and multi-part series, excluding Life and translations", async () => {
    const shelves = readingShelves(await getArticleSummaries());
    expect(
      shelves
        .filter((shelf) => shelf.kind === "collection")
        .map((shelf) => shelf.name)
        .sort()
    ).toEqual(["Invisible Thinking Loops", "New Earth Consciousness"]);
    expect(shelves.some((shelf) => shelf.name === "Life")).toBe(false);
    expect(shelves.filter((shelf) => shelf.kind === "series").map((shelf) => shelf.name)).toEqual([
      "Alchemy of the Mind",
      "The Yoga Sutras",
    ]);
    expect(shelves.every((shelf) => shelf.articles.every(isPrimaryLanguage))).toBe(true);
    for (const shelf of shelves.filter((shelf) => shelf.kind === "series")) {
      const numbered = shelf.articles.filter((post) => post.seriesPart !== undefined);
      expect(numbered.map((post) => post.seriesPart)).toEqual(
        numbered.map((post) => post.seriesPart).sort((a, b) => a! - b!)
      );
    }
  });

  it("orders parts before unnumbered entries, resolves dates, and skips singleton series", () => {
    const posts = [
      article("second", { series: "Notes", seriesPart: 2 }),
      article("unknown", { series: "Notes", date: "2024-01-01" }),
      article("first", { series: "Notes", seriesPart: 1 }),
      article("translation", { series: "Notes", seriesPart: 0, lang: "mr" }),
      article("single", { series: "Single" }),
      article("late", { collection: "Collection", date: "2026-01-01" }),
      article("early", { collection: "Collection", date: "2024-01-01" }),
    ];
    const shelves = readingShelves(posts);
    expect(
      shelves.find((shelf) => shelf.name === "Notes")?.articles.map((post) => post.slug)
    ).toEqual(["first", "second", "unknown"]);
    expect(
      shelves.find((shelf) => shelf.name === "Collection")?.articles.map((post) => post.slug)
    ).toEqual(["early", "late"]);
    expect(shelves.some((shelf) => shelf.name === "Single")).toBe(false);
    expect(readingShelves([])).toEqual([]);
  });

  it("groups all archive matches by year, newest first, without dropping featured entries", async () => {
    const all = (await getArticleSummaries()).filter(isPrimaryLanguage);
    const groups = articlesByYear([...all].reverse());
    expect(groups.flatMap((group) => group.articles)).toEqual(all);
    expect(groups.map((group) => group.year)).toEqual([
      ...new Set(all.map((post) => post.date.slice(0, 4))),
    ]);
    expect(articlesByYear([])).toEqual([]);
  });
});

describe("shareable reading-room filters", () => {
  it("accepts known themes and Unicode queries and ignores invalid theme ids", () => {
    expect(parseHomeFilters(new URLSearchParams("theme=growth&q=stress"))).toEqual({
      theme: "growth",
      query: "stress",
    });
    expect(parseHomeFilters(new URLSearchParams("theme=unknown&q=मन"))).toEqual({
      theme: null,
      query: "मन",
    });
    expect(parseHomeFilters(new URLSearchParams())).toEqual({ theme: null, query: "" });
  });
  it("round-trips filters, preserves unrelated params, and removes reset values", () => {
    const original = new URLSearchParams("stage=classic&theme=growth&q=stress");
    const next = homeSearchParams(original, { theme: "self-awareness", query: "mind & body" });
    expect(parseHomeFilters(next)).toEqual({ theme: "self-awareness", query: "mind & body" });
    expect(next.get("stage")).toBe("classic");
    expect(original.get("q")).toBe("stress");
    expect(homeSearchParams(next, { theme: null, query: "" }).toString()).toBe("stage=classic");
  });
});
