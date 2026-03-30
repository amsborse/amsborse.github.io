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
};

export function parseFrontmatter(raw: string): { data: FrontData; body: string } {
  let text = raw.trim();
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  // No /m flag: ^ and $ must be start/end of file so body can't steal the match.
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
  if (!m) return { data: {}, body: raw };

  const data: FrontData = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let val = line.slice(colon + 1).trim();

    if (key === "tags") {
      const inner = /^\[(.*)\]$/.exec(val);
      data.tags = inner
        ? inner[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""))
        : [];
      continue;
    }
    if (key === "featured") {
      data.featured = val === "true";
      continue;
    }
    if (key === "readingMinutes") {
      data.readingMinutes = Number(val);
      continue;
    }
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1).replace(/\\"/g, '"');
    }
    if (key === "title") data.title = val;
    else if (key === "description") data.description = val;
    else if (key === "date") data.date = val;
    else if (key === "slug") data.slug = val;
  }

  return { data, body: m[2] };
}
