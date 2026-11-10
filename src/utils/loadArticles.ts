import { articleOrder } from "@/data/articles";
import { parsePostMarkdown, type ParsedPost } from "@/utils/markdown";

/**
 * Listing data for one article: everything but the body. Medium imports come from the
 * generated src/content/medium/index.json (scripts/import-medium.mjs), so listing pages never
 * download the 68 article bodies; the few hand-written essays are parsed directly.
 */
export type ArticleSummary = Omit<ParsedPost, "html" | "toc"> & { headings: string[] };

type Loader = () => Promise<string>;

const handWritten = import.meta.glob<string>("../content/articles/*.md", {
  query: "?raw",
  import: "default",
});
const imported = import.meta.glob<string>("../content/articles/medium/*.md", {
  query: "?raw",
  import: "default",
});

function slugFromPath(path: string): string {
  const file = path.replace(/\\/g, "/").split("/").pop() ?? path;
  return file.replace(/\.md$/i, "");
}

function bySlug(modules: Record<string, Loader>): Map<string, Loader> {
  return new Map(Object.entries(modules).map(([path, load]) => [slugFromPath(path), load]));
}

const handWrittenLoaders = bySlug(handWritten);
const importedLoaders = bySlug(imported);

function loaderFor(slug: string): Loader | undefined {
  return handWrittenLoaders.get(slug) ?? importedLoaders.get(slug);
}

export function toSummary(post: ParsedPost): ArticleSummary {
  const summary: ArticleSummary & Partial<Pick<ParsedPost, "html" | "toc">> = {
    ...post,
    headings: post.toc.map((item) => item.text),
  };
  delete summary.html;
  delete summary.toc;
  return summary;
}

/** Newest first; same-day ties keep the curated hand-written order, then slug. */
export function compareArticles(a: ArticleSummary, b: ArticleSummary): number {
  const byDate = b.date.localeCompare(a.date);
  if (byDate !== 0) return byDate;
  const order = articleOrder as readonly string[];
  const rank = (slug: string) => (order.includes(slug) ? order.indexOf(slug) : order.length);
  return rank(a.slug) - rank(b.slug) || a.slug.localeCompare(b.slug);
}

async function loadHandWrittenSummaries(): Promise<ArticleSummary[]> {
  const out: ArticleSummary[] = [];
  await Promise.all(
    [...handWrittenLoaders].map(async ([slug, load]) => {
      try {
        out.push(toSummary(parsePostMarkdown(await load(), slug)));
      } catch (e) {
        console.error(`[writing] Failed to parse "${slug}":`, e);
      }
    })
  );
  return out;
}

async function loadImportedSummaries(): Promise<ArticleSummary[]> {
  const { default: index } = await import("@/content/medium/index.json");
  return index as ArticleSummary[];
}

let summaries: Promise<ArticleSummary[]> | null = null;

/** Every article (all languages), newest first, without bodies. Cached after the first call. */
export function getArticleSummaries(): Promise<ArticleSummary[]> {
  if (!summaries) {
    summaries = Promise.all([loadHandWrittenSummaries(), loadImportedSummaries()]).then(
      ([own, medium]) => [...own, ...medium].sort(compareArticles)
    );
    summaries.catch(() => {
      summaries = null; // let a later call retry instead of caching the failure
    });
  }
  return summaries;
}

const posts = new Map<string, Promise<ParsedPost | undefined>>();

/** Loads and parses only the one article that is being read. */
export function getPostBySlug(slug: string): Promise<ParsedPost | undefined> {
  const load = loaderFor(slug);
  if (!load) return Promise.resolve(undefined);
  let post = posts.get(slug);
  if (!post) {
    post = load().then((raw) => parsePostMarkdown(raw, slug));
    post.catch(() => posts.delete(slug));
    posts.set(slug, post);
  }
  return post;
}
