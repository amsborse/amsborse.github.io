import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { formatArticleDate } from "@/components/writing/formatArticleDate";
import { WritingPublication } from "@/components/writing/WritingPublication";
import type { ParsedPost } from "@/utils/markdown";

const posts: ParsedPost[] = [
  {
    slug: "older-feature",
    title: "An Older Feature",
    description: "A description for the older featured essay.",
    date: "2025-04-30",
    tags: ["writing", "culture"],
    featured: true,
    readingMinutes: 4,
    html: "",
    toc: [],
  },
  {
    slug: "recent-essay",
    title: "A Recent Essay",
    description: "A description for the most recent essay.",
    date: "2025-11-12",
    tags: ["systems", "reliability"],
    featured: false,
    readingMinutes: 6,
    html: "",
    toc: [],
  },
  {
    slug: "newest-feature",
    title: "The Newest Feature",
    description: "A description for the newest featured essay.",
    date: "2025-10-02",
    tags: ["APIs", "design"],
    featured: true,
    readingMinutes: 5,
    html: "",
    toc: [],
  },
];

function renderPublication() {
  return renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(WritingPublication, { posts }))
  );
}

describe("writing publication index", () => {
  it("selects the most recent featured essay as the lead and lists every other essay once", () => {
    const markup = renderPublication();
    const leadPosition = markup.indexOf("The Newest Feature");
    const contentsPosition = markup.indexOf("Contents");

    expect(leadPosition).toBeGreaterThan(-1);
    expect(leadPosition).toBeLessThan(contentsPosition);
    expect(markup.match(/href="\/arsenal\/writing\/newest-feature"/g)).toHaveLength(1);
    expect(markup.match(/href="\/arsenal\/writing\/older-feature"/g)).toHaveLength(1);
    expect(markup.match(/href="\/arsenal\/writing\/recent-essay"/g)).toHaveLength(1);
    expect(markup).toContain(">01</span>");
    expect(markup).toContain(">02</span>");
  });

  it("renders readable dates with machine-readable values and comma-separated tags", () => {
    const markup = renderPublication();

    expect(formatArticleDate("2025-11-12")).toBe("12 November 2025");
    expect(markup).toContain('<time dateTime="2025-11-12">12 November 2025</time>');
    expect(markup).toContain("APIs, design");
    expect(markup).toContain("5 min read");
    expect(markup).toContain("Read essay");
  });
});
