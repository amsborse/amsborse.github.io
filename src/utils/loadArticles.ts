import { articleOrder } from "@/data/articles";
import { parsePostMarkdown, type ParsedPost } from "@/utils/markdown";

const rawModules = import.meta.glob<string>("../content/articles/*.md", {
  query: "?raw",
  import: "default",
});

function slugFromPath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const file = normalized.split("/").pop() ?? path;
  return file.replace(/\.md$/i, "");
}

const slugOrder = articleOrder;

let cache: ParsedPost[] | null = null;
let loadPromise: Promise<ParsedPost[]> | null = null;

async function parseAll(): Promise<ParsedPost[]> {
  const bySlug = new Map<string, ParsedPost>();

  await Promise.all(
    Object.entries(rawModules).map(async ([path, loader]) => {
      const slug = slugFromPath(path);
      try {
        const raw = await loader();
        bySlug.set(slug, parsePostMarkdown(raw, slug));
      } catch (e) {
        console.error(`[writing] Failed to parse "${slug}" (${path}):`, e);
      }
    })
  );

  const ordered: ParsedPost[] = [];
  for (const slug of slugOrder) {
    const p = bySlug.get(slug);
    if (p) ordered.push(p);
  }
  for (const [slug, p] of bySlug) {
    if (!(slugOrder as readonly string[]).includes(slug as string)) {
      ordered.push(p);
    }
  }
  return ordered;
}

/** Load all markdown articles on demand (lazy per file). */
export function loadArticles(): Promise<ParsedPost[]> {
  if (cache) return Promise.resolve(cache);
  if (!loadPromise) {
    loadPromise = parseAll().then((posts) => {
      cache = posts;
      return posts;
    });
  }
  return loadPromise;
}

export async function getAllPosts(): Promise<ParsedPost[]> {
  return loadArticles();
}

export async function getPostBySlug(slug: string): Promise<ParsedPost | undefined> {
  const posts = await loadArticles();
  return posts.find((p) => p.slug === slug);
}

export async function getFeaturedPosts(): Promise<ParsedPost[]> {
  const posts = await loadArticles();
  return posts.filter((p) => p.featured);
}
