/** Minimal YAML frontmatter for static posts (no runtime eval). */

export type FrontData = {
  title?: string;
  description?: string;
  date?: string;
  tags?: string[];
  featured?: boolean;
  readingMinutes?: number;
  /** Optional; URL slug is always the filename — if set, should match the file slug. */
  slug?: string;
  /** Medium import fields (see scripts/import-medium.mjs). */
  subtitle?: string;
  kicker?: string;
  source?: string;
  mediumId?: string;
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

const STRING_KEYS = [
  "title",
  "description",
  "date",
  "slug",
  "subtitle",
  "kicker",
  "source",
  "mediumId",
  "mediumUrl",
  "collection",
  "series",
  "lang",
  "translationOf",
  "cover",
] as const;
const NUMBER_KEYS = ["readingMinutes", "seriesPart", "rank", "coverWidth", "coverHeight"] as const;

type StringKey = (typeof STRING_KEYS)[number];
type NumberKey = (typeof NUMBER_KEYS)[number];

export function parseFrontmatter(raw: string): { data: FrontData; body: string } {
  let text = raw;
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  text = text.trim();
  // No /m flag: ^ and $ must be start/end of file so body can't steal the match.
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
  if (!m) return { data: {}, body: text };

  const data: FrontData = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let val = line.slice(colon + 1).trim();

    if (key === "tags") {
      const inner = /^\[(.*)\]$/.exec(val);
      data.tags = inner ? inner[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")) : [];
      continue;
    }
    if (key === "featured") {
      data.featured = val === "true";
      continue;
    }
    if ((NUMBER_KEYS as readonly string[]).includes(key)) {
      data[key as NumberKey] = Number(val);
      continue;
    }
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1).replace(/\\(["\\])/g, "$1");
    }
    if ((STRING_KEYS as readonly string[]).includes(key)) data[key as StringKey] = val;
  }

  return { data, body: m[2] };
}
