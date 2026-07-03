import { describe, expect, it } from "vitest";
import { parseFrontmatter } from "@/utils/frontmatter";

describe("parseFrontmatter", () => {
  it("returns raw body when frontmatter is missing", () => {
    const raw = "# Hello\n\nWorld";
    const result = parseFrontmatter(raw);
    expect(result.data).toEqual({});
    expect(result.body).toBe(raw);
  });

  it("parses scalar fields and strips BOM", () => {
    const raw = `\uFEFF---\ntitle: "My Post"\ndescription: Summary\ndate: 2026-01-02\nslug: my-post\n---\n\nBody text`;
    const result = parseFrontmatter(raw);
    expect(result.data.title).toBe("My Post");
    expect(result.data.description).toBe("Summary");
    expect(result.data.date).toBe("2026-01-02");
    expect(result.data.slug).toBe("my-post");
    expect(result.body.trim()).toBe("Body text");
  });

  it("parses tags, featured, and readingMinutes", () => {
    const raw = `---\ntags: ["a", "b"]\nfeatured: true\nreadingMinutes: 7\n---\n\nContent`;
    const result = parseFrontmatter(raw);
    expect(result.data.tags).toEqual(["a", "b"]);
    expect(result.data.featured).toBe(true);
    expect(result.data.readingMinutes).toBe(7);
  });

  it("ignores malformed lines without a colon", () => {
    const raw = "---\nnot-a-field\n title: spaced\n---\n\nBody";
    const result = parseFrontmatter(raw);
    expect(result.data.title).toBe("spaced");
    expect(result.body.trim()).toBe("Body");
  });

  it("handles empty tag arrays", () => {
    const raw = "---\ntags: []\n---\n\nBody";
    expect(parseFrontmatter(raw).data.tags).toEqual([""]);
  });

  it("strips UTF-8 BOM before parsing", () => {
    const raw = `\uFEFF---\ntitle: BOM\n---\n\nok`;
    expect(parseFrontmatter(raw).data.title).toBe("BOM");
  });

  it("strips BOM from plain markdown without frontmatter", () => {
    const result = parseFrontmatter("\uFEFFHello");
    expect(result.body).toBe("Hello");
  });

  it("returns empty tags when tag syntax is not bracketed", () => {
    const raw = "---\ntags: plain\n---\n\nBody";
    expect(parseFrontmatter(raw).data.tags).toEqual([]);
  });
});
