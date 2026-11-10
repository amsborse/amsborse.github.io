#!/usr/bin/env node
/**
 * Medium export → Markdown articles + locally hosted images.
 *
 *   node scripts/import-medium.mjs --posts <medium-export>/posts [--skip-images] [--only <slug>]
 *
 * - Imports only published posts that have a title graf (drafts and untitled comment
 *   responses are skipped and listed in the report).
 * - Text is converted graf by graf; nothing is rewritten or invented.
 * - Images: the original upload is fetched from miro.medium.com/v2/<image-id> into
 *   `.cache/medium-images/` (gitignored), then written as responsive WebP into
 *   `public/writing/<slug>/`. Production never hotlinks Medium.
 * - Every image gets a manifest entry (`src/content/medium/manifest.json`) with its source URL,
 *   position, caption, alt and status. Failures are recorded, never silently replaced.
 *
 * Supersedes the older Turndown-based `scripts/import-medium-html.js`.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARTICLES_DIR = path.join(ROOT, "src/content/articles/medium");
const HAND_WRITTEN_DIR = path.join(ROOT, "src/content/articles");
const MEDIUM_DIR = path.join(ROOT, "src/content/medium");
const PUBLIC_DIR = path.join(ROOT, "public/writing");
const CACHE_DIR = path.join(ROOT, ".cache/medium-images");
const CONFIG = JSON.parse(
  fs.readFileSync(path.join(ROOT, "scripts/medium-import.config.json"), "utf8")
);

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const POSTS = arg("--posts");
const ONLY = arg("--only");
const SKIP_IMAGES = args.includes("--skip-images");
if (!POSTS || !fs.existsSync(POSTS)) {
  console.error("Usage: node scripts/import-medium.mjs --posts <medium-export>/posts");
  process.exit(2);
}

const WIDTHS = [800, 1600];
const WEBP_QUALITY = 80;
const problems = [];
const problem = (slug, where, message, extra = {}) => {
  problems.push({ slug, where, message, ...extra });
  console.warn(`  ! ${slug} ${where}: ${message}`);
};

/* ---------------------------------------------------------------- text helpers */

const ALNUM = /[\p{L}\p{N}]/u;

export function escapeMd(text) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/[*_`[\]<>~|]/g, "\\$&")
    .replace(/&(?=#?\w+;)/g, "&amp;");
}

export function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const escapeAttr = (text) => escapeHtml(text).replace(/"/g, "&quot;");

function safeHref(href) {
  const h = (href ?? "").trim();
  if (/^(https?:|mailto:)/i.test(h)) return h;
  return null;
}

/** Line-start characters that would otherwise turn a paragraph into another block. */
function escapeBlockStart(md) {
  const num = /^(\d+)([.)])/.exec(md);
  if (num) return `${num[1]}\\${num[2]}${md.slice(num[0].length)}`;
  if (/^(#|>|-|\+|=)/.test(md)) return `\\${md}`;
  return md;
}

function normalizeText(t) {
  return t.replace(/\r?\n/g, " ");
}

/** Inline content → HTML using only strong/em/a/br/code. */
function inlineHtml(node) {
  let out = "";
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      out += escapeHtml(normalizeText(child.textContent));
      continue;
    }
    if (child.nodeType !== 1) continue;
    const tag = child.tagName.toLowerCase();
    const inner = inlineHtml(child);
    if (tag === "br") out += "<br>";
    else if (tag === "strong" || tag === "b")
      out += inner.trim() ? `<strong>${inner}</strong>` : inner;
    else if (tag === "em" || tag === "i") out += inner.trim() ? `<em>${inner}</em>` : inner;
    else if (tag === "code") out += `<code>${inner}</code>`;
    else if (tag === "a") {
      const href = safeHref(child.getAttribute("href"));
      out += href ? `<a href="${escapeAttr(href)}">${inner}</a>` : inner;
    } else out += inner;
  }
  return out;
}

function nextChar(node) {
  let n = node.nextSibling;
  while (n) {
    const t = n.textContent ?? "";
    if (t.length) return t[0];
    n = n.nextSibling;
  }
  return "";
}

/** Inline content → Markdown. Falls back to inline HTML where emphasis delimiters would not flank. */
function inlineMd(node) {
  let out = "";
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      out += escapeMd(normalizeText(child.textContent));
      continue;
    }
    if (child.nodeType !== 1) continue;
    const tag = child.tagName.toLowerCase();
    if (tag === "br") {
      out += "<br>";
      continue;
    }
    if (["strong", "b", "em", "i"].includes(tag)) {
      const inner = inlineMd(child);
      const lead = /^\s*/.exec(inner)[0];
      const trail = /\s*$/.exec(inner)[0];
      const core = inner.slice(lead.length, inner.length - trail.length);
      if (!core) {
        out += inner;
        continue;
      }
      const before = (out + lead).slice(-1);
      const after = trail ? " " : nextChar(child);
      const strong = tag === "strong" || tag === "b";
      const delim = strong ? "**" : "_";
      // CommonMark only treats `**`/`_` as emphasis when the run is flanking. A run that
      // touches punctuation or a symbol (e.g. after an emoji's variation selector, or `*.*`)
      // can fail to open or close, so only use delimiters when both edges are unambiguous.
      const opens = ALNUM.test(core[0]) || before === "" || /\s/.test(before);
      const closes = ALNUM.test(core.at(-1)) || after === "" || /\s/.test(after);
      if (ALNUM.test(before) || ALNUM.test(after) || core.includes("<br>") || !opens || !closes) {
        const t = strong ? "strong" : "em";
        out += `${lead}<${t}>${inlineHtml(child).trim()}</${t}>${trail}`;
      } else {
        out += `${lead}${delim}${core}${delim}${trail}`;
      }
      continue;
    }
    if (tag === "a") {
      const href = safeHref(child.getAttribute("href"));
      const inner = inlineMd(child);
      if (!href || !inner.trim()) {
        out += inner;
        continue;
      }
      const url = href.replace(/[()\s<>]/g, (c) => encodeURIComponent(c));
      out += `[${inner}](${url})`;
      continue;
    }
    if (tag === "code") {
      out += `\`${child.textContent}\``;
      continue;
    }
    out += inlineMd(child);
  }
  return out;
}

/* ---------------------------------------------------------------- metadata */

function slugify(text) {
  return (
    text
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-") || "untitled"
  );
}

function postIdFromUrl(url) {
  const m = /([0-9a-f]{10,12})(?:[?#].*)?$/.exec(url ?? "");
  return m ? m[1] : null;
}

function readCsv(file) {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [head, ...body] = rows.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

const statsById = new Map();
for (const r of readCsv(path.join(ROOT, "scripts/Medium_Stats_With_Scoring.csv"))) {
  const id = postIdFromUrl(r.URL);
  if (id) statsById.set(id, r);
}
const rankById = new Map();
for (const r of readCsv(path.join(ROOT, "scripts/Medium_Top15_Ranked.csv"))) {
  const id = postIdFromUrl(r.URL);
  if (id) rankById.set(id, Number(r.Rank));
}

function detectSeries(title) {
  for (const s of CONFIG.series) {
    const m = new RegExp(s.pattern, "i").exec(title);
    if (m) return { series: s.name, seriesPart: m[1] != null ? Number(m[1]) : undefined };
  }
  return {};
}

function fmValue(v) {
  if (Array.isArray(v)) return `[${v.map((x) => JSON.stringify(x)).join(", ")}]`;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

/* ---------------------------------------------------------------- images */

const fileSafe = (id) => id.replace(/[^\w.-]/g, "_");

async function fetchOriginal(imageId) {
  const cached = path.join(CACHE_DIR, fileSafe(imageId));
  if (fs.existsSync(cached) && fs.statSync(cached).size > 0) return fs.readFileSync(cached);
  const url = `https://miro.medium.com/v2/${imageId}`;
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "static-site-importer/1.0" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 100) throw new Error(`tiny response (${buf.length} bytes)`);
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(cached, buf);
      return buf;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 600 * attempt));
    }
  }
  throw lastErr;
}

function targetWidths(w) {
  if (w > WIDTHS[1]) return WIDTHS;
  if (w > WIDTHS[0]) return [WIDTHS[0], w];
  return [w];
}

async function processImage(entry, slug) {
  const buf = await fetchOriginal(entry.imageId);
  const meta = await sharp(buf, { animated: true }).metadata();
  const width = meta.width;
  const height = meta.pageHeight ?? meta.height;
  entry.original = {
    url: entry.sourceUrl,
    format: meta.format,
    width,
    height,
    bytes: buf.length,
    sha256: createHash("sha256").update(buf).digest("hex"),
    animated: (meta.pages ?? 1) > 1,
  };
  if (entry.declaredWidth && width < entry.declaredWidth) {
    problem(
      slug,
      `image ${entry.position}`,
      `original is ${width}px, Medium declared ${entry.declaredWidth}px`
    );
    entry.lowResolution = true;
  }
  const dir = path.join(PUBLIC_DIR, slug);
  fs.mkdirSync(dir, { recursive: true });
  entry.files = [];
  for (const w of targetWidths(width)) {
    const name = `${String(entry.position).padStart(2, "0")}-${fileSafe(entry.imageId).replace(/\.\w+$/, "")}-${w}.webp`;
    const out = path.join(dir, name);
    if (!fs.existsSync(out)) {
      await sharp(buf, { animated: entry.original.animated })
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY, effort: 5 })
        .toFile(out);
    }
    entry.files.push({ width: w, path: `/writing/${slug}/${name}`, bytes: fs.statSync(out).size });
  }
  entry.width = width;
  entry.height = height;
  entry.status = "ok";
}

async function pool(items, size, fn) {
  let i = 0;
  const workers = Array.from({ length: size }, async () => {
    while (i < items.length) {
      const item = items[i++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}

function figureHtml(entry) {
  const layout = entry.layout;
  const caption = entry.captionHtml ? `\n<figcaption>${entry.captionHtml}</figcaption>` : "";
  if (entry.status !== "ok") {
    return [
      `<figure class="medium-figure medium-figure--missing" data-layout="${layout}">`,
      `<a class="medium-figure__missing" href="${escapeAttr(entry.sourceUrl)}">Image could not be recovered — view the original on Medium</a>${caption}`,
      `</figure>`,
    ].join("\n");
  }
  const largest = entry.files[entry.files.length - 1];
  const srcset = entry.files.map((f) => `${f.path} ${f.width}w`).join(", ");
  const sizes =
    layout === "fill"
      ? "100vw"
      : layout === "outset"
        ? "(min-width: 1100px) 1040px, 100vw"
        : "(min-width: 800px) 720px, 100vw";
  return [
    `<figure class="medium-figure" data-layout="${layout}">`,
    `<img src="${largest.path}" srcset="${srcset}" sizes="${sizes}" width="${entry.width}" height="${entry.height}" alt="${escapeAttr(entry.alt)}" loading="lazy" decoding="async">${caption}`,
    `</figure>`,
  ].join("\n");
}

/* ---------------------------------------------------------------- conversion */

function convertPost(file) {
  const html = fs.readFileSync(file, "utf8");
  const doc = new JSDOM(html).window.document;
  const body = doc.querySelector('section[data-field="body"]');
  const titleGraf = body?.querySelector(".graf--title");
  if (!body || !titleGraf) return null;

  const title = (doc.querySelector("h1.p-name")?.textContent ?? titleGraf.textContent).trim();
  const canonical = doc.querySelector("a.p-canonical")?.getAttribute("href") ?? "";
  const id = postIdFromUrl(canonical) ?? postIdFromUrl(path.basename(file, ".html"));
  const published = doc.querySelector("time.dt-published")?.getAttribute("datetime") ?? "";
  const summary = doc.querySelector('section[data-field="subtitle"]')?.textContent.trim() ?? "";
  const subtitleGraf = body.querySelector(".graf--subtitle");
  const kickerGraf = body.querySelector(".graf--kicker");
  const subtitle = subtitleGraf?.textContent.trim() || undefined;
  const mediumTags = [...doc.querySelectorAll("footer a.p-tag")].map((a) => a.textContent.trim());

  const translationOfId = CONFIG.translations[id];
  const slug = slugify(title) === "untitled" || translationOfId ? `medium-${id}` : slugify(title);

  const blocks = [];
  const images = [];
  let listAlt = 0;
  let prevWasList = null;

  const sections = [...body.querySelectorAll(":scope > section.section")];
  sections.forEach((section, si) => {
    if (si > 0 && blocks.length) blocks.push("* * *");
    for (const inner of section.querySelectorAll(".section-inner")) {
      for (const g of inner.children) {
        const tag = g.tagName.toLowerCase();
        const cls = g.className || "";
        if (/graf--(title|subtitle|kicker)\b/.test(cls)) continue;
        const isList = tag === "ul" || tag === "ol";
        if (!isList) prevWasList = null;

        if (tag === "figure") {
          const img = g.querySelector("img");
          const iframe = g.querySelector("iframe");
          const cap = g.querySelector("figcaption");
          const layout = /layoutFillWidth/.test(cls)
            ? "fill"
            : /layoutOutset/.test(cls)
              ? "outset"
              : "inset";
          if (img) {
            const imageId = img.getAttribute("data-image-id");
            if (!imageId) {
              problem(slug, "figure", "img without data-image-id", {
                src: img.getAttribute("src"),
              });
              continue;
            }
            const entry = {
              position: images.length + 1,
              imageId,
              sourceUrl: `https://miro.medium.com/v2/${imageId}`,
              exportSrc: img.getAttribute("src"),
              declaredWidth: Number(img.getAttribute("data-width")) || null,
              declaredHeight: Number(img.getAttribute("data-height")) || null,
              alt: (img.getAttribute("alt") ?? "").trim(),
              captionHtml: cap ? inlineHtml(cap).trim() : "",
              captionText: cap ? cap.textContent.trim() : "",
              layout,
              blockIndex: blocks.length,
              status: "pending",
            };
            images.push(entry);
            blocks.push({ image: entry });
          } else if (iframe) {
            const src = iframe.getAttribute("src") ?? "";
            const yt = /(?:youtube\.com\/embed\/|youtu\.be\/)([\w-]{6,})/.exec(src);
            if (yt) {
              blocks.push(
                [
                  `<figure class="medium-figure medium-embed" data-layout="${layout}">`,
                  `<iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}" title="${escapeAttr(cap?.textContent.trim() || "Embedded video")}" loading="lazy" allowfullscreen></iframe>${cap ? `\n<figcaption>${inlineHtml(cap).trim()}</figcaption>` : ""}`,
                  `</figure>`,
                ].join("\n")
              );
            } else {
              problem(slug, "embed", "unsupported iframe embed kept as link", { src });
              blocks.push(`[Embedded content](${src})`);
            }
          } else {
            problem(slug, "figure", "figure without img or iframe");
          }
          continue;
        }

        if (tag === "pre") {
          const lang = g.getAttribute("data-code-block-lang") ?? "";
          const clone = g.cloneNode(true);
          clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
          const code = clone.textContent.replace(/\n+$/, "");
          const fence = code.includes("```") ? "~~~~" : "```";
          blocks.push(`${fence}${lang}\n${code}\n${fence}`);
          continue;
        }

        if (isList) {
          const ordered = tag === "ol";
          if (prevWasList === tag) listAlt++;
          prevWasList = tag;
          const marker = (n) =>
            ordered ? `${n}${listAlt % 2 ? ")" : "."} ` : listAlt % 2 ? "* " : "- ";
          const start = Number(g.getAttribute("start")) || 1;
          const items = [...g.children].filter((li) => li.tagName.toLowerCase() === "li");
          blocks.push(
            items.map((li, i) => `${marker(start + i)}${inlineMd(li).trim()}`).join("\n")
          );
          continue;
        }

        const text = g.textContent.replace(/ /g, " ").trim();
        if (!text) continue;

        if (tag === "h3" || tag === "h2" || tag === "h1") blocks.push(`## ${inlineMd(g).trim()}`);
        else if (tag === "h4" || tag === "h5" || tag === "h6")
          blocks.push(`### ${inlineMd(g).trim()}`);
        else if (tag === "blockquote" && /graf--pullquote/.test(cls))
          blocks.push(
            `<blockquote class="medium-pullquote"><p>${inlineHtml(g).trim()}</p></blockquote>`
          );
        else if (tag === "blockquote") blocks.push(`> ${escapeBlockStart(inlineMd(g).trim())}`);
        else if (tag === "p") blocks.push(escapeBlockStart(inlineMd(g).trim()));
        else {
          problem(slug, tag, "unknown graf type kept as paragraph");
          blocks.push(escapeBlockStart(inlineMd(g).trim()));
        }
      }
    }
  });

  const stats = statsById.get(id);
  const rank = rankById.get(id);
  const front = {
    title,
    ...(subtitle ? { subtitle } : {}),
    description: subtitle ?? summary,
    ...(kickerGraf ? { kicker: kickerGraf.textContent.trim() } : {}),
    date: published.slice(0, 10),
    tags: mediumTags,
    featured: rank != null && rank <= CONFIG.featuredTopN,
    ...(rank != null ? { rank } : {}),
    source: "medium",
    mediumId: id,
    mediumUrl: canonical,
    ...(stats?.Publication ? { collection: stats.Publication } : {}),
    ...detectSeries(title),
    lang: translationOfId ? "mr" : "en",
  };
  for (const k of Object.keys(front)) if (front[k] === undefined) delete front[k];

  // Fingerprint of the original body text (title/subtitle/kicker live in frontmatter).
  // tests/unit/mediumContent.test.ts recomputes it from the rendered Markdown, so any lost,
  // altered or invented text fails CI. Whitespace is ignored; every other character counts.
  const textBody = body.cloneNode(true);
  textBody
    .querySelectorAll(".graf--title, .graf--subtitle, .graf--kicker")
    .forEach((n) => n.remove());
  const sourceText = textBody.textContent.replace(/\s+/g, "");
  // Reading time and section headings come from the original text, so the listing index
  // (src/content/medium/index.json) never needs to download the article bodies.
  const words = textBody.textContent.split(/\s+/).filter(Boolean).length;
  front.readingMinutes = Math.max(1, Math.round(words / 220));
  const headings = [...textBody.querySelectorAll("h1, h2, h3, h4, h5, h6")]
    .map((h) => h.textContent.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const text = {
    chars: [...sourceText].length,
    sha256: createHash("sha256").update(sourceText).digest("hex"),
  };

  return {
    slug,
    id,
    translationOfId,
    file: path.basename(file),
    front,
    blocks,
    images,
    text,
    headings,
  };
}

/* ---------------------------------------------------------------- main */

const files = fs
  .readdirSync(POSTS)
  .filter((f) => f.endsWith(".html"))
  .sort();
const skipped = [];
const posts = [];
for (const f of files) {
  if (f.startsWith("draft")) {
    skipped.push({ file: f, reason: "unpublished draft" });
    continue;
  }
  const post = convertPost(path.join(POSTS, f));
  if (!post) {
    skipped.push({ file: f, reason: "no title graf (comment response)" });
    continue;
  }
  if (ONLY && post.slug !== ONLY) continue;
  posts.push(post);
}

// Translations take the English article's slug + "-marathi" and inherit its series.
const byId = new Map(posts.map((p) => [p.id, p]));
for (const p of posts) {
  if (!p.translationOfId) continue;
  const en = byId.get(p.translationOfId);
  if (!en) throw new Error(`Translation ${p.file} points at missing post ${p.translationOfId}`);
  p.slug = `${en.slug}-marathi`;
  p.front.translationOf = en.slug;
  if (en.front.series)
    Object.assign(p.front, { series: en.front.series, seriesPart: en.front.seriesPart });
}

const slugs = new Map();
for (const p of posts) {
  if (slugs.has(p.slug))
    throw new Error(`Duplicate slug ${p.slug}: ${slugs.get(p.slug)} and ${p.file}`);
  slugs.set(p.slug, p.file);
  // Slugs are global across both folders (the URL is /writing/<slug>), so a Medium post may
  // never shadow a hand-written article, and nothing hand-edited in medium/ is overwritten.
  if (fs.existsSync(path.join(HAND_WRITTEN_DIR, `${p.slug}.md`))) {
    throw new Error(`Slug ${p.slug} collides with hand-written article ${p.slug}.md`);
  }
  const existing = path.join(ARTICLES_DIR, `${p.slug}.md`);
  if (fs.existsSync(existing) && !fs.readFileSync(existing, "utf8").includes('source: "medium"')) {
    throw new Error(`Refusing to overwrite non-imported article medium/${p.slug}.md`);
  }
}

console.log(`Importing ${posts.length} articles (${skipped.length} files skipped)…`);
const allImages = posts.flatMap((p) => p.images.map((img) => ({ img, slug: p.slug })));
if (!SKIP_IMAGES) {
  let done = 0;
  await pool(allImages, 6, async ({ img, slug }) => {
    try {
      await processImage(img, slug);
    } catch (e) {
      img.status = "unrecoverable";
      img.error = String(e?.message ?? e);
      problem(slug, `image ${img.position}`, `could not recover ${img.sourceUrl}: ${img.error}`);
    }
    done++;
    if (done % 25 === 0 || done === allImages.length)
      console.log(`  images ${done}/${allImages.length}`);
  });
}

fs.mkdirSync(ARTICLES_DIR, { recursive: true });
fs.mkdirSync(MEDIUM_DIR, { recursive: true });
const manifest = { generatedFrom: "Medium export", widths: WIDTHS, articles: {} };
const index = [];

for (const p of posts) {
  const seen = new Map();
  for (const img of p.images) {
    if (seen.has(img.imageId)) {
      problem(
        p.slug,
        `image ${img.position}`,
        `same image as position ${seen.get(img.imageId)} (kept: it appears twice in the original)`
      );
    } else seen.set(img.imageId, img.position);
    if (!img.alt) img.altMissing = true;
  }
  const cover = p.images.find((i) => i.status === "ok");
  if (cover) {
    p.front.cover = cover.files[cover.files.length - 1].path;
    p.front.coverWidth = cover.width;
    p.front.coverHeight = cover.height;
  }
  const md = p.blocks.map((b) => (typeof b === "string" ? b : figureHtml(b.image))).join("\n\n");
  const fm = Object.entries(p.front)
    .map(([k, v]) => `${k}: ${fmValue(v)}`)
    .join("\n");
  fs.writeFileSync(path.join(ARTICLES_DIR, `${p.slug}.md`), `---\n${fm}\n---\n\n${md}\n`);

  manifest.articles[p.slug] = {
    mediumId: p.id,
    sourceFile: p.file,
    mediumUrl: p.front.mediumUrl,
    text: p.text,
    images: p.images.map(({ blockIndex: _b, ...rest }) => rest),
  };
  index.push({ slug: p.slug, ...p.front, headings: p.headings });
}

if (!ONLY) {
  fs.writeFileSync(
    path.join(MEDIUM_DIR, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  index.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  fs.writeFileSync(path.join(MEDIUM_DIR, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
  fs.writeFileSync(
    path.join(MEDIUM_DIR, "import-report.json"),
    `${JSON.stringify(
      {
        imported: posts.map((p) => ({ slug: p.slug, file: p.file, images: p.images.length })),
        skipped,
        problems,
        totals: {
          articles: posts.length,
          images: allImages.length,
          recovered: allImages.filter(({ img }) => img.status === "ok").length,
          unrecoverable: allImages.filter(({ img }) => img.status === "unrecoverable").length,
          missingAlt: allImages.filter(({ img }) => !img.alt).length,
        },
      },
      null,
      2
    )}\n`
  );
}

const bad = allImages.filter(({ img }) => img.status !== "ok");
console.log(
  `Done: ${posts.length} articles, ${allImages.length - bad.length}/${allImages.length} images recovered, ${problems.length} problems recorded.`
);
if (!SKIP_IMAGES && bad.length) process.exitCode = 1;
