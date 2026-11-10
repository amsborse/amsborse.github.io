import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { writingCategories } from "@/data/writingCategories";
import {
  compareArticles,
  getArticleSummaries,
  getPostBySlug,
  toSummary,
  type ArticleSummary,
} from "@/utils/loadArticles";
import { parsePostMarkdown } from "@/utils/markdown";
import {
  categoriesFor,
  isPrimaryLanguage,
  relatedArticles,
  searchArticles,
} from "@/utils/writingCatalog";

const ROOT = process.cwd();
const ARTICLES = path.join(ROOT, "src/content/articles");

function article(over: Partial<ArticleSummary> & { slug: string }): ArticleSummary {
  return {
    title: over.slug,
    description: "",
    date: "2025-01-01",
    tags: [],
    featured: false,
    readingMinutes: 1,
    headings: [],
    ...over,
  };
}

describe("article summaries", () => {
  it("lists every hand-written and imported article once, newest first", async () => {
    const all = await getArticleSummaries();
    const files = [
      ...fs.readdirSync(ARTICLES),
      ...fs.readdirSync(path.join(ARTICLES, "medium")),
    ].filter((f) => f.endsWith(".md"));
    expect(all.map((a) => a.slug).sort()).toEqual(files.map((f) => f.slice(0, -3)).sort());
    expect(new Set(all.map((a) => a.slug)).size).toBe(all.length);
    expect([...all].sort(compareArticles)).toEqual(all);
    expect(await getArticleSummaries()).toBe(all);
  });

  it("keeps the generated Medium index in sync with the article files", async () => {
    const all = await getArticleSummaries();
    for (const summary of all.filter((a) => a.source === "medium")) {
      const raw = fs.readFileSync(path.join(ARTICLES, "medium", `${summary.slug}.md`), "utf8");
      // The index also carries the Medium post id, which the reader never needs.
      const fromFile: ArticleSummary & { mediumId?: string } = { ...summary };
      delete fromFile.mediumId;
      expect(fromFile, summary.slug).toEqual(toSummary(parsePostMarkdown(raw, summary.slug)));
    }
  });

  it("loads a single article by slug and nothing for unknown slugs", async () => {
    const all = await getArticleSummaries();
    const medium = all.find((a) => a.source === "medium")!;
    const post = await getPostBySlug(medium.slug);
    expect(post?.title).toBe(medium.title);
    expect(post?.html.length).toBeGreaterThan(100);
    expect(await getPostBySlug(medium.slug)).toBe(post);
    expect((await getPostBySlug("designing-for-reliability"))?.source).toBeUndefined();
    expect(await getPostBySlug("no-such-article")).toBeUndefined();
  });

  it("breaks same-day ties by curated order, then slug", () => {
    const sameDay = [
      article({ slug: "zeta" }),
      article({ slug: "notes-on-api-design" }),
      article({ slug: "alpha" }),
      article({ slug: "designing-for-reliability" }),
      article({ slug: "newer", date: "2026-01-01" }),
    ].sort(compareArticles);
    expect(sameDay.map((a) => a.slug)).toEqual([
      "newer",
      "designing-for-reliability",
      "notes-on-api-design",
      "alpha",
      "zeta",
    ]);
  });
});

describe("writing themes", () => {
  it("places every original article in at least one theme", async () => {
    const all = await getArticleSummaries();
    const orphans = all.filter(isPrimaryLanguage).filter((a) => categoriesFor(a).length === 0);
    expect(orphans.map((a) => a.slug)).toEqual([]);
  });

  it("matches tags case- and accent-insensitively, and by collection", () => {
    expect(categoriesFor({ tags: ["PSYCHOLOGY"] }).map((c) => c.id)).toEqual([
      "invisible-patterns",
    ]);
    expect(
      categoriesFor({ tags: [], collection: "New Earth Consciousness" }).map((c) => c.id)
    ).toEqual(["consciousness"]);
    expect(categoriesFor({ tags: ["Life"] })).toEqual([]);
    expect(new Set(writingCategories.map((c) => c.id)).size).toBe(writingCategories.length);
  });

  it("treats English and untagged articles as primary, translations as not", () => {
    expect(isPrimaryLanguage({})).toBe(true);
    expect(isPrimaryLanguage({ lang: "en" })).toBe(true);
    expect(isPrimaryLanguage({ lang: "mr" })).toBe(false);
  });
});

describe("searchArticles", () => {
  const items = [
    article({ slug: "a", title: "Stress and the body", tags: ["Health"] }),
    article({ slug: "b", title: "On rest", description: "Why stress lingers", tags: ["Stoicism"] }),
    article({ slug: "c", title: "Cafés", headings: ["A note on stress"] }),
    article({ slug: "d", title: "Unrelated" }),
  ];

  it("returns everything for an empty query", () => {
    expect(searchArticles(items, "   ")).toEqual(items);
  });

  it("ranks title matches above description and heading matches", () => {
    expect(searchArticles(items, "STRESS").map((a) => a.slug)).toEqual(["a", "b", "c"]);
  });

  it("requires every word and ignores accents", () => {
    expect(searchArticles(items, "stress stoicism").map((a) => a.slug)).toEqual(["b"]);
    expect(searchArticles(items, "cafes").map((a) => a.slug)).toEqual(["c"]);
    expect(searchArticles(items, "philosophy").map((a) => a.slug)).toEqual(["b"]);
    expect(searchArticles(items, "nothing-matches")).toEqual([]);
  });
});

describe("relatedArticles", () => {
  const current = article({
    slug: "cur",
    series: "Alchemy",
    collection: "Loops",
    tags: ["Life", "Mindset"],
  });
  const pool = [
    current,
    article({ slug: "cur-marathi", translationOf: "cur", lang: "mr", series: "Alchemy" }),
    article({ slug: "life-only", tags: ["Life"] }),
    article({ slug: "same-series", series: "Alchemy" }),
    article({ slug: "same-collection", collection: "Loops" }),
    article({ slug: "same-tag", tags: ["Mindset"] }),
    article({ slug: "same-theme", tags: ["Belief"] }),
  ];

  it("orders by series, collection, specific tags and theme; skips itself and translations", () => {
    expect(relatedArticles(current, pool, 10).map((a) => a.slug)).toEqual([
      "same-series",
      "same-collection",
      "same-tag",
      "same-theme",
    ]);
    expect(relatedArticles(current, pool)).toHaveLength(3);
  });

  it("keeps translations with translations", () => {
    const marathi = pool[1];
    const others = [...pool, article({ slug: "other-mr", lang: "mr", series: "Alchemy" })];
    expect(relatedArticles(marathi, others).map((a) => a.slug)).toEqual(["other-mr"]);
  });
});
