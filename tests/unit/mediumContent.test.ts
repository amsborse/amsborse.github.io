/**
 * Guards the imported Medium articles (scripts/import-medium.mjs) against lost text and
 * broken or missing images. The Medium export itself is not in the repo, so the importer
 * records a fingerprint of each original body text and every image in
 * src/content/medium/manifest.json; these tests recompute everything from the committed
 * Markdown through the same parser the site uses.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { htmlToText, parsePostMarkdown } from "@/utils/markdown";

type ImageFile = { width: number; path: string; bytes: number };
type ManifestImage = {
  position: number;
  imageId: string;
  status: string;
  declaredWidth: number | null;
  width?: number;
  lowResolution?: boolean;
  files?: ImageFile[];
};
type ManifestArticle = {
  mediumId: string;
  mediumUrl: string;
  text: { chars: number; sha256: string };
  images: ManifestImage[];
};

const ROOT = process.cwd();
const ARTICLES_DIR = path.join(ROOT, "src/content/articles/medium");
const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src/content/medium/manifest.json"), "utf8")
) as { articles: Record<string, ManifestArticle> };
const entries = Object.entries(manifest.articles);

function readArticle(slug: string) {
  return fs.readFileSync(path.join(ARTICLES_DIR, `${slug}.md`), "utf8");
}

function publicFile(webPath: string) {
  return path.join(ROOT, "public", webPath.replace(/^\//, ""));
}

describe("imported Medium articles", () => {
  it("has a manifest entry for every Medium article and vice versa", () => {
    const mediumFiles = fs
      .readdirSync(ARTICLES_DIR)
      .filter((f) => f.endsWith(".md"))
      .filter((f) =>
        /^source: "medium"$/m.test(fs.readFileSync(path.join(ARTICLES_DIR, f), "utf8"))
      )
      .map((f) => f.slice(0, -3))
      .sort();
    expect(mediumFiles).toEqual(entries.map(([slug]) => slug).sort());
    expect(entries.length).toBeGreaterThan(0);
  });

  it.each(entries)("%s preserves the original text exactly", (slug, article) => {
    const post = parsePostMarkdown(readArticle(slug), slug);
    const text = htmlToText(post.html).replace(/\s+/g, "");
    expect([...text].length).toBe(article.text.chars);
    expect(createHash("sha256").update(text).digest("hex")).toBe(article.text.sha256);
  });

  it.each(entries)(
    "%s shows every image locally, in order, with no broken files",
    (slug, article) => {
      const raw = readArticle(slug);
      const post = parsePostMarkdown(raw, slug);
      expect(post.source).toBe("medium");
      expect(post.mediumUrl).toBe(article.mediumUrl);

      // No hotlinked Medium images anywhere in the article.
      expect(raw).not.toMatch(/miro\.medium\.com|cdn-images-\d\.medium\.com/);

      const positions = article.images.map((i) => i.position);
      expect(positions).toEqual(positions.map((_, i) => i + 1));

      for (const image of article.images) {
        expect(image.status, `image ${image.position} (${image.imageId})`).toBe("ok");
        expect(image.lowResolution, `image ${image.position} is low resolution`).not.toBe(true);
        expect(image.files?.length).toBeGreaterThan(0);
        for (const file of image.files ?? []) {
          expect(fs.existsSync(publicFile(file.path)), file.path).toBe(true);
          expect(fs.statSync(publicFile(file.path)).size).toBe(file.bytes);
        }
        // The largest variant is never narrower than the original allows.
        const largest = Math.max(...(image.files ?? []).map((f) => f.width));
        expect(largest).toBe(Math.min(image.width ?? 0, 1600));
      }

      // Rendered <img> tags appear in manifest order and point at the largest local variant.
      const srcs = [...post.html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
      expect(srcs).toEqual(article.images.map((i) => i.files?.at(-1)?.path));
      for (const srcset of post.html.matchAll(/\bsrcset="([^"]+)"/g)) {
        for (const candidate of srcset[1].split(",")) {
          const url = candidate.trim().split(/\s+/)[0];
          expect(fs.existsSync(publicFile(url)), url).toBe(true);
        }
      }

      if (post.cover) expect(fs.existsSync(publicFile(post.cover)), post.cover).toBe(true);
    }
  );
});
