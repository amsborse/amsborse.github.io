import { describe, expect, it, vi } from "vitest";
import { parsePostMarkdown } from "@/utils/markdown";

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
});
