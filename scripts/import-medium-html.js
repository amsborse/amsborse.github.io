/**
 * Convert Medium GDPR export HTML → markdown in src/content/articles/
 *
 * Does not rewrite prose — only HTML→Markdown structure (Turndown) and wrapper removal.
 *
 * Usage:
 *   node scripts/import-medium-html.js "C:/path/to/medium-export/posts"
 *   node scripts/import-medium-html.js "C:/path/to/posts" --update-index
 *   node scripts/import-medium-html.js "C:/path/to/posts" --only inference-vs-belief
 *
 * Options:
 *   --update-index   Append new slugs to src/data/articleIndex.ts
 *   --only <slug>    Import a single file whose derived slug contains this substring
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const outDir = path.join(projectRoot, "src", "content", "articles");

function deriveSlug(filename) {
  let s = filename.replace(/\.html$/i, "");
  s = s.replace(/^draft_/, "");
  s = s.replace(/^\d{4}-\d{2}-\d{2}_/, "");
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "article"
  );
}

function escapeYaml(s) {
  if (s == null) return '""';
  const t = String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${t}"`;
}

function wordCount(md) {
  return md.trim().split(/\s+/).filter(Boolean).length;
}

function estimateReadTimeLabel(md) {
  const w = wordCount(md);
  const mins = Math.max(1, Math.round(w / 220));
  return `${mins} min`;
}

function buildTurndown() {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
  });

  td.addRule("figure", {
    filter: "figure",
    replacement(_content, node) {
      const el = node;
      const img = el.querySelector("img");
      if (!img) return "\n\n";
      const alt = img.getAttribute("alt") || "";
      const src = img.getAttribute("src") || "";
      return `\n\n![${alt}](${src})\n\n`;
    },
  });

  td.addRule("removeEmptyParagraph", {
    filter(node) {
      return node.nodeName === "P" && !(node.textContent || "").trim();
    },
    replacement: () => "",
  });

  return td;
}

function extractFromHtml(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const titleEl = doc.querySelector("title");
  const h1 = doc.querySelector("h1.p-name, header h1");
  const title = (h1?.textContent || titleEl?.textContent || "Untitled").trim();

  const sub = doc.querySelector('section[data-field="subtitle"]');
  /** Whitespace-only normalization for YAML description — does not touch article body. */
  const description = (sub?.textContent || "").trim().replace(/\s+/g, " ");

  const bodyRoot = doc.querySelector('section[data-field="body"]');
  if (!bodyRoot) {
    throw new Error("Missing section[data-field=body]");
  }

  bodyRoot.querySelectorAll(".section-divider, hr.section-divider").forEach((el) => el.remove());

  const inners = bodyRoot.querySelectorAll(".section-inner");
  let htmlChunk = "";
  if (inners.length > 0) {
    inners.forEach((el) => {
      htmlChunk += el.innerHTML + "\n";
    });
  } else {
    htmlChunk = bodyRoot.innerHTML;
  }

  const timeEl = doc.querySelector("time.dt-published");
  let date = "";
  if (timeEl?.getAttribute("datetime")) {
    const d = new Date(timeEl.getAttribute("datetime"));
    if (!Number.isNaN(d.getTime())) {
      date = d.toISOString().slice(0, 10);
    }
  }

  let canonicalUrl = "";
  const canon = doc.querySelector("a.p-canonical");
  if (canon?.getAttribute("href")) {
    canonicalUrl = canon.getAttribute("href").trim();
  }

  const td = buildTurndown();
  let markdown = td.turndown(htmlChunk);
  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();

  return { title, description, date, canonicalUrl, markdown };
}

function appendSlugToArticleIndex(slug) {
  const p = path.join(projectRoot, "src", "data", "articleIndex.ts");
  let text = fs.readFileSync(p, "utf8");
  if (text.includes(`"${slug}"`)) {
    console.warn(`[import] slug already in articleIndex: ${slug}`);
    return;
  }
  const lines = text.split(/\r?\n/);
  const idx = lines.findIndex((l) => l.trim() === "] as const;");
  if (idx === -1) {
    console.warn("[import] could not find ] as const; in articleIndex.ts — add slug manually");
    return;
  }
  lines.splice(idx, 0, `  "${slug}",`);
  fs.writeFileSync(p, lines.join("\n") + (text.endsWith("\n") ? "\n" : ""));
  console.log(`[import] appended "${slug}" to articleIndex.ts`);
}

function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--update-index");
  const updateIndex = process.argv.includes("--update-index");
  const onlyIdx = args.findIndex((a) => a === "--only");
  let onlySub = "";
  if (onlyIdx !== -1) {
    onlySub = args[onlyIdx + 1] || "";
    args.splice(onlyIdx, 2);
  }

  const inputDir = args[0];
  if (!inputDir || !fs.existsSync(inputDir)) {
    console.error("Usage: node scripts/import-medium-html.js <posts-folder> [--update-index] [--only partial-slug]");
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const files = fs.readdirSync(inputDir).filter((f) => f.endsWith(".html"));
  let n = 0;

  for (const file of files) {
    const slug = deriveSlug(file);
    if (onlySub && !slug.includes(onlySub)) continue;

    const full = path.join(inputDir, file);
    const raw = fs.readFileSync(full, "utf8");

    let extracted;
    try {
      extracted = extractFromHtml(raw);
    } catch (e) {
      console.warn(`[import] skip ${file}: ${e.message}`);
      continue;
    }

    const draft = /^draft_/i.test(file);
    const readTime = estimateReadTimeLabel(extracted.markdown);

    const fm = [
      "---",
      `title: ${escapeYaml(extracted.title)}`,
      `slug: "${slug}"`,
      `date: "${extracted.date}"`,
      `description: ${escapeYaml(extracted.description)}`,
      "tags: []",
      `readTime: "${readTime}"`,
      "featured: false",
      'source: "Medium"',
      `canonicalUrl: ${escapeYaml(extracted.canonicalUrl)}`,
      'coverImage: ""',
      `draft: ${draft}`,
      "---",
      "",
      extracted.markdown,
      "",
    ].join("\n");

    const outPath = path.join(outDir, `${slug}.md`);
    fs.writeFileSync(outPath, fm, "utf8");
    console.log(`[import] wrote ${path.relative(projectRoot, outPath)}`);
    n += 1;
    if (updateIndex && !draft) {
      appendSlugToArticleIndex(slug);
    }
  }

  console.log(`[import] done. ${n} file(s).`);
}

main();
