import { describe, expect, it, vi } from "vitest";
import { htmlToText, parsePostMarkdown } from "@/utils/markdown";

describe("parsePostMarkdown", () => {
  it("parses markdown with defaults when frontmatter is absent", () => {
    const post = parsePostMarkdown("# Title\n\nParagraph.", "fallback-slug");
    expect(post.slug).toBe("fallback-slug");
    expect(post.title).toBe("Untitled");
    expect(post.description).toBe("");
    expect(post.featured).toBe(false);
    expect(post.readingMinutes).toBeGreaterThan(0);
    expect(post.html).toContain("<h1");
  });

  it("builds toc and heading ids for h2 and h3", () => {
    const raw = `---
title: Reliability
description: Notes
date: 2026-02-01
tags: [systems]
featured: true
readingMinutes: 4
---

## First Section
### Nested Point
## First Section
`;
    const post = parsePostMarkdown(raw, "reliability");
    expect(post.title).toBe("Reliability");
    expect(post.tags).toEqual(["systems"]);
    expect(post.featured).toBe(true);
    expect(post.readingMinutes).toBe(4);
    expect(post.toc).toHaveLength(3);
    expect(post.toc[0]).toMatchObject({ text: "First Section", level: 2 });
    expect(post.toc[1]).toMatchObject({ text: "Nested Point", level: 3 });
    expect(post.toc[2].id).toBe("first-section-2");
    expect(post.html).toContain('id="first-section"');
    expect(post.html).toContain('id="nested-point"');
  });

  it("estimates reading minutes when not provided", () => {
    const words = Array.from({ length: 440 }, (_, i) => `word${i}`).join(" ");
    const post = parsePostMarkdown(words, "long-post");
    expect(post.readingMinutes).toBe(2);
  });

  it("keeps headings without ids when toc levels do not align", () => {
    const raw = `---\ntitle: Mismatch\n---\n\n# Only H1\n`;
    const post = parsePostMarkdown(raw, "mismatch");
    expect(post.toc).toHaveLength(0);
    expect(post.html).toContain("<h1");
    expect(post.html).not.toContain('id="only-h1"');
  });

  it("warns when frontmatter slug mismatches file slug in dev", () => {
    if (!import.meta.env.DEV) return;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    parsePostMarkdown("---\nslug: other\n---\n\n## Hi", "file-slug");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("falls back to estimated reading time for invalid readingMinutes", () => {
    const raw = `---\nreadingMinutes: not-a-number\n---\n\nword `.repeat(50);
    const post = parsePostMarkdown(raw, "invalid-minutes");
    expect(post.readingMinutes).toBeGreaterThan(0);
  });

  it("uses section slug when heading text has no slug characters", () => {
    const raw = `---\ntitle: Punctuation\n---\n\n## !!!\n`;
    const post = parsePostMarkdown(raw, "punctuation");
    expect(post.toc[0].id).toBe("section");
    expect(post.html).toContain('id="section"');
  });

  // Regression: headings containing links or emphasis used to get no id and a raw-markdown TOC label.
  it("adds ids and plain-text toc labels to headings with inline markup", () => {
    const raw = `---\ntitle: Inline\n---\n\n## ✽ **Break the Chain**\n\n### 2. [The Feynman Technique](https://example.com/f)\n\n## Tom &amp; Jerry\n`;
    const post = parsePostMarkdown(raw, "inline");
    expect(post.toc).toEqual([
      { id: "break-the-chain", text: "✽ Break the Chain", level: 2 },
      { id: "2-the-feynman-technique", text: "2. The Feynman Technique", level: 3 },
      { id: "tom-jerry", text: "Tom & Jerry", level: 2 },
    ]);
    expect(post.html).toContain('<h2 id="break-the-chain">✽ <strong>Break the Chain</strong></h2>');
    expect(post.html).toContain(
      '<h3 id="2-the-feynman-technique">2. <a href="https://example.com/f">'
    );
  });

  it("adds no space where inline markup touches the next character", () => {
    const raw = "## 🔅 <strong>Welcome to reality.</strong>🔅\n\nA <em>b</em>c and<br>d.";
    const post = parsePostMarkdown(raw, "touching");
    expect(post.toc[0].text).toBe("🔅 Welcome to reality.🔅");
    expect(htmlToText(post.html)).toBe("🔅 Welcome to reality.🔅 A bc and d.");
  });

  it("ignores heading-like lines inside code fences", () => {
    const raw = "```\n## not a heading\n```\n\n## Real";
    const post = parsePostMarkdown(raw, "fence");
    expect(post.toc).toEqual([{ id: "real", text: "Real", level: 2 }]);
  });

  it("does not count figure markup toward reading time", () => {
    const img =
      '<figure><img src="/a.webp" alt="" srcset="/a-800.webp 800w, /a-1600.webp 1600w"></figure>\n\n';
    const post = parsePostMarkdown(img.repeat(300) + "one two three", "figures");
    expect(post.readingMinutes).toBe(1);
  });

  it("exposes Medium metadata and drops empty or invalid values", () => {
    const raw = `---\ntitle: M\nsource: "medium"\nseries: "Life"\nseriesPart: 2\nrank: nope\nsubtitle: ""\ncover: "/writing/m/01.webp"\ncoverWidth: 1600\n---\n\nBody`;
    const post = parsePostMarkdown(raw, "m");
    expect(post.source).toBe("medium");
    expect(post.series).toBe("Life");
    expect(post.seriesPart).toBe(2);
    expect(post.cover).toBe("/writing/m/01.webp");
    expect(post.coverWidth).toBe(1600);
    expect(post).not.toHaveProperty("rank");
    expect(post).not.toHaveProperty("subtitle");
    expect(post).not.toHaveProperty("kicker");
  });
});
