import { articleOrder } from "./articles";
import { parsePostMarkdown, type ParsedPost } from "@/utils/markdown";

const rawModules = import.meta.glob<string>("./posts/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function slugFromPath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const file = normalized.split("/").pop() ?? path;
  return file.replace(/\.md$/i, "");
}

const slugOrder = articleOrder;

function parseAll(): ParsedPost[] {
  const bySlug = new Map<string, ParsedPost>();
  for (const [path, raw] of Object.entries(rawModules)) {
    const slug = slugFromPath(path);
    try {
      bySlug.set(slug, parsePostMarkdown(raw, slug));
    } catch (e) {
      console.error(`[writing] Failed to parse "${slug}" (${path}):`, e);
    }
  }
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

const allPosts = parseAll();

export function getAllPosts(): ParsedPost[] {
  return allPosts;
}

export function getPostBySlug(slug: string): ParsedPost | undefined {
  return allPosts.find((p) => p.slug === slug);
}

export function getFeaturedPosts(): ParsedPost[] {
  return allPosts.filter((p) => p.featured);
}
