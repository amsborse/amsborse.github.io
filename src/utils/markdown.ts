import { marked } from "marked";
import { parseFrontmatter } from "@/utils/frontmatter";

export type TocItem = { id: string; text: string; level: 2 | 3 };

marked.setOptions({ gfm: true });

function estimateReadingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

function extractToc(markdownBody: string): TocItem[] {
  const lines = markdownBody.split("\n");
  const toc: TocItem[] = [];
  const usedIds = new Set<string>();

  for (const line of lines) {
    const h2 = /^##\s+(.+)$/.exec(line);
    const h3 = /^###\s+(.+)$/.exec(line);
    if (h2) {
      const text = h2[1].trim();
      let id = slugifyHeading(text, usedIds);
      toc.push({ id, text, level: 2 });
    } else if (h3) {
      const text = h3[1].trim();
      let id = slugifyHeading(text, usedIds);
      toc.push({ id, text, level: 3 });
    }
  }
  return toc;
}

function slugifyHeading(text: string, used: Set<string>): string {
  const base = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "section";
  let id = base;
  let n = 2;
  while (used.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  used.add(id);
  return id;
}

/** Ensures headings in HTML have ids matching TOC for anchor navigation */
function addHeadingIds(html: string, toc: TocItem[]): string {
  let i = 0;
  return html.replace(/<h([23])>([^<]+)<\/h\1>/g, (_m, level, inner) => {
    const item = toc[i];
    if (!item || String(item.level) !== String(level)) {
      return `<h${level}>${inner}</h${level}>`;
    }
    i += 1;
    return `<h${level} id="${item.id}">${inner}</h${level}>`;
  });
}

export type ParsedPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  featured: boolean;
  readingMinutes: number;
  html: string;
  toc: TocItem[];
};

export function parsePostMarkdown(raw: string, slug: string): ParsedPost {
  const { data, body: content } = parseFrontmatter(raw);
  if (import.meta.env.DEV && data.slug != null && data.slug !== slug) {
    console.warn(`[writing] Frontmatter slug "${data.slug}" does not match file slug "${slug}".`);
  }
  const title = data.title ?? "Untitled";
  const description = data.description ?? "";
  const date = data.date ?? "";
  const tags = data.tags ?? [];
  const featured = Boolean(data.featured);

  const toc = extractToc(content);
  const rawHtml = marked.parse(content) as string;
  const html = addHeadingIds(rawHtml, toc);
  const readingMinutes =
    data.readingMinutes != null && Number.isFinite(data.readingMinutes)
      ? data.readingMinutes
      : estimateReadingMinutes(content);

  return {
    slug,
    title,
    description,
    date,
    tags,
    featured,
    readingMinutes: Number.isFinite(readingMinutes) ? readingMinutes : 1,
    html,
    toc,
  };
}
