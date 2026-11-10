/** Pure helpers for browsing articles: themes, search and related reading. */
import { writingCategories, type WritingCategory } from "@/data/writingCategories";
import type { ArticleSummary } from "@/utils/loadArticles";

type Browsable = Pick<
  ArticleSummary,
  "slug" | "title" | "description" | "date" | "tags" | "headings"
> &
  Partial<
    Pick<ArticleSummary, "subtitle" | "kicker" | "collection" | "series" | "lang" | "translationOf">
  >;

/** Tags too broad to say anything about an article ("Life" is on 61 of 68 Medium posts). */
const GENERIC_TAGS = new Set(["life"]);

function fold(text: string): string {
  return text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Themes an article belongs to, in the curated theme order. */
export function categoriesFor(
  article: Pick<Browsable, "tags" | "collection">,
  categories: readonly WritingCategory[] = writingCategories
): WritingCategory[] {
  const tags = new Set(article.tags.map(fold));
  return categories.filter(
    (c) =>
      c.tags.some((t) => tags.has(fold(t))) ||
      (article.collection !== undefined && (c.collections ?? []).includes(article.collection))
  );
}

/** English (or untagged) originals; translations are reached from their original. */
export function isPrimaryLanguage(article: Pick<Browsable, "lang">): boolean {
  return article.lang === undefined || article.lang === "en";
}

const FIELD_WEIGHTS: [weight: number, pick: (a: Browsable) => string[]][] = [
  [8, (a) => [a.title]],
  [4, (a) => [a.subtitle ?? "", a.description, a.kicker ?? ""]],
  [4, (a) => [...a.tags, a.series ?? "", a.collection ?? ""]],
  [3, (a) => categoriesFor(a).map((c) => c.label)],
  [2, (a) => a.headings],
];

/**
 * Every word of the query must appear somewhere in the article's title, subtitle, tags,
 * series, collection, theme or section headings. Results rank by where the words matched.
 */
export function searchArticles<T extends Browsable>(articles: readonly T[], query: string): T[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...articles];
  const scored: { article: T; score: number; index: number }[] = [];
  articles.forEach((article, index) => {
    const fields = FIELD_WEIGHTS.map(
      ([weight, pick]) => [weight, fold(pick(article).join(" \n "))] as const
    );
    let score = 0;
    for (const word of words) {
      const hits = fields.filter(([, text]) => text.includes(word));
      if (hits.length === 0) return;
      score += Math.max(...hits.map(([weight]) => weight));
    }
    scored.push({ article, score, index });
  });
  return scored.sort((a, b) => b.score - a.score || a.index - b.index).map((s) => s.article);
}

/**
 * Articles to read next, closest first: same series, then same collection, shared specific
 * tags and shared themes. Never the article itself or its own translations.
 */
export function relatedArticles<T extends Browsable>(
  current: Browsable,
  articles: readonly T[],
  limit = 3
): T[] {
  const family = new Set([current.slug, current.translationOf].filter(Boolean));
  const tags = new Set(current.tags.map(fold).filter((t) => !GENERIC_TAGS.has(t)));
  const themes = new Set(categoriesFor(current).map((c) => c.id));
  const scored: { article: T; score: number; index: number }[] = [];
  articles.forEach((article, index) => {
    if (family.has(article.slug) || (article.translationOf && family.has(article.translationOf)))
      return;
    if (isPrimaryLanguage(article) !== isPrimaryLanguage(current)) return;
    let score = 0;
    if (current.series && article.series === current.series) score += 8;
    if (current.collection && article.collection === current.collection) score += 4;
    score += 2 * article.tags.filter((t) => tags.has(fold(t))).length;
    score += categoriesFor(article).filter((c) => themes.has(c.id)).length;
    if (score > 0) scored.push({ article, score, index });
  });
  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((s) => s.article);
}
