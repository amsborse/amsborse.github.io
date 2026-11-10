import { marked } from "marked";
import { parseFrontmatter } from "@/utils/frontmatter";

export type TocItem = { id: string; text: string; level: 2 | 3 };

marked.setOptions({ gfm: true });

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

/** Inline tags vanish without a gap so `<strong>real.</strong>🔅` stays `real.🔅`. */
const INLINE_TAG = /<\/?(?:a|strong|b|em|i|code|span|s|del|sup|sub|mark|u)\b[^>]*>/gi;

/** Plain text of an HTML fragment produced by marked (tags removed, basic entities decoded). */
export function htmlToText(html: string): string {
  return html
    .replace(INLINE_TAG, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:amp|lt|gt|quot|#39);/g, (e) => ENTITIES[e])
    .replace(/\s+/g, " ")
    .trim();
}

function estimateReadingMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

function slugifyHeading(text: string, used: Set<string>): string {
  const base =
    text
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

/**
 * Gives every h2/h3 an id and builds the TOC from the rendered HTML, so headings that
 * contain links, emphasis or emoji (common in imported Medium posts) still get anchors.
 */
function addHeadingIds(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const used = new Set<string>();
  const out = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_m, level: string, inner: string) => {
    const text = htmlToText(inner);
    const id = slugifyHeading(text, used);
    toc.push({ id, text, level: level === "2" ? 2 : 3 });
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
  return { html: out, toc };
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
  /** Medium import metadata; absent for hand-written posts. */
  subtitle?: string;
  kicker?: string;
  source?: string;
  mediumUrl?: string;
  collection?: string;
  series?: string;
  seriesPart?: number;
  lang?: string;
  translationOf?: string;
  rank?: number;
  cover?: string;
  coverWidth?: number;
  coverHeight?: number;
};

const OPTIONAL_KEYS = [
  "subtitle",
  "kicker",
  "source",
  "mediumUrl",
  "collection",
  "series",
  "seriesPart",
  "lang",
  "translationOf",
  "rank",
  "cover",
  "coverWidth",
  "coverHeight",
] as const;

export function parsePostMarkdown(raw: string, slug: string): ParsedPost {
  const { data, body: content } = parseFrontmatter(raw);
  if (import.meta.env.DEV && data.slug != null && data.slug !== slug) {
    console.warn(`[writing] Frontmatter slug "${data.slug}" does not match file slug "${slug}".`);
  }
  const rawHtml = marked.parse(content) as string;
  const { html, toc } = addHeadingIds(rawHtml);
  const readingMinutes =
    data.readingMinutes != null && Number.isFinite(data.readingMinutes)
      ? data.readingMinutes
      : estimateReadingMinutes(htmlToText(rawHtml));

  const post: ParsedPost = {
    slug,
    title: data.title ?? "Untitled",
    description: data.description ?? "",
    date: data.date ?? "",
    tags: data.tags ?? [],
    featured: Boolean(data.featured),
    readingMinutes,
    html,
    toc,
  };
  for (const key of OPTIONAL_KEYS) {
    const value = data[key];
    if (value != null && value !== "" && !(typeof value === "number" && !Number.isFinite(value))) {
      (post as Record<string, unknown>)[key] = value;
    }
  }
  return post;
}
