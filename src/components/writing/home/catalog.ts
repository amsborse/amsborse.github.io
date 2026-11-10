import { writingCategories } from "@/data/writingCategories";
import { compareArticles, type ArticleSummary } from "@/utils/loadArticles";
import { categoriesFor, isPrimaryLanguage, searchArticles } from "@/utils/writingCatalog";

export type HomeFilters = { theme: string | null; query: string };
export type ReadingShelf = {
  name: string;
  kind: "collection" | "series";
  articles: ArticleSummary[];
};

export function parseHomeFilters(params: URLSearchParams): HomeFilters {
  const theme = params.get("theme");
  return {
    theme: writingCategories.some((category) => category.id === theme) ? theme : null,
    query: params.get("q") ?? "",
  };
}

/** Preserve unrelated parameters, including the stage preview setting. */
export function homeSearchParams(params: URLSearchParams, filters: HomeFilters): URLSearchParams {
  const next = new URLSearchParams(params);
  if (filters.theme) next.set("theme", filters.theme);
  else next.delete("theme");
  if (filters.query) next.set("q", filters.query);
  else next.delete("q");
  return next;
}

export function featuredArticles(articles: readonly ArticleSummary[]): ArticleSummary[] {
  return articles
    .filter((article) => isPrimaryLanguage(article) && article.featured)
    .sort(compareArticles)
    .slice(0, 4);
}

export function filterArchive(articles: readonly ArticleSummary[], filters: HomeFilters) {
  return searchArticles(
    articles.filter(
      (article) =>
        isPrimaryLanguage(article) &&
        (!filters.theme || categoriesFor(article).some((category) => category.id === filters.theme))
    ),
    filters.query
  );
}

export function themeCounts(articles: readonly ArticleSummary[]): Map<string, number> {
  const counts = new Map(writingCategories.map((category) => [category.id, 0]));
  articles.filter(isPrimaryLanguage).forEach((article) => {
    categoriesFor(article).forEach((category) => {
      counts.set(category.id, (counts.get(category.id) ?? 0) + 1);
    });
  });
  return counts;
}

export function readingShelves(articles: readonly ArticleSummary[]): ReadingShelf[] {
  const shelves = new Map<string, ReadingShelf>();
  for (const article of articles.filter(isPrimaryLanguage)) {
    for (const kind of ["collection", "series"] as const) {
      const name = article[kind];
      if (!name || (kind === "series" && name === "Life")) continue;
      const key = `${kind}:${name}`;
      const shelf = shelves.get(key) ?? { name, kind, articles: [] };
      shelf.articles.push(article);
      shelves.set(key, shelf);
    }
  }
  return [...shelves.values()]
    .filter((shelf) => shelf.kind === "collection" || shelf.articles.length > 1)
    .map((shelf) => ({
      ...shelf,
      articles: [...shelf.articles].sort((a, b) => {
        const byPart =
          shelf.kind === "series" ? (a.seriesPart ?? Infinity) - (b.seriesPart ?? Infinity) : 0;
        return byPart || a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug);
      }),
    }))
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
}

/** The archive stays chronological even when search returns relevance-ranked matches. */
export function articlesByYear(articles: readonly ArticleSummary[]) {
  const years = new Map<string, ArticleSummary[]>();
  for (const article of [...articles].sort(compareArticles)) {
    const year = article.date.slice(0, 4);
    const group = years.get(year) ?? [];
    group.push(article);
    years.set(year, group);
  }
  return [...years].map(([year, entries]) => ({ year, articles: entries }));
}
