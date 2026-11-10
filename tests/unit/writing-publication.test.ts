import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { formatArticleDate } from "@/components/writing/formatArticleDate";
import { WritingPublication } from "@/components/writing/WritingPublication";
import type { ArticleSummary } from "@/utils/loadArticles";

const posts: ArticleSummary[] = [
  {
    slug: "older-feature",
    title: "An Older Feature",
    description: "An older essay.",
    date: "2025-04-30",
    tags: ["writing", "culture"],
    featured: true,
    readingMinutes: 4,
    headings: [],
  },
  {
    slug: "recent-essay",
    title: "A Recent Essay",
    description: "The most recent essay.",
    date: "2025-11-12",
    tags: ["systems", "reliability"],
    featured: false,
    readingMinutes: 6,
    headings: [],
  },
  {
    slug: "newest-feature",
    title: "The Newest Feature",
    description: "The newest featured essay.",
    date: "2025-10-02",
    tags: ["APIs", "design"],
    featured: true,
    readingMinutes: 5,
    headings: [],
    cover: "/writing/newest.webp",
    coverWidth: 1600,
    coverHeight: 900,
    kicker: "Engineering",
  },
  {
    slug: "translation",
    title: "अनुवाद",
    description: "",
    date: "2025-10-03",
    tags: ["APIs"],
    featured: true,
    readingMinutes: 5,
    headings: [],
    lang: "mr",
    translationOf: "newest-feature",
  },
];

function renderPublication(url = "/arsenal/writing") {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: [url] },
      createElement(WritingPublication, { posts })
    )
  );
}
function parse(markup: string) {
  const element = document.createElement("div");
  element.innerHTML = markup;
  return element;
}

describe("writing publication index", () => {
  it("leads with the newest primary feature and includes every original once in the full archive", () => {
    const dom = parse(renderPublication());
    expect(dom.querySelector(".reading-feature--lead h3")?.textContent).toBe("The Newest Feature");
    expect(dom.querySelectorAll(".reading-feature")).toHaveLength(2);
    const archive = dom.querySelector(".reading-rows")!;
    expect([...archive.querySelectorAll("h4")].map((heading) => heading.textContent)).toEqual([
      "A Recent Essay",
      "The Newest Feature",
      "An Older Feature",
    ]);
    expect(archive.querySelectorAll('a[href="/arsenal/writing/newest-feature"]')).toHaveLength(1);
    expect(archive.querySelectorAll('a[href="/arsenal/writing/older-feature"]')).toHaveLength(1);
    expect(archive.querySelectorAll('a[href="/arsenal/writing/recent-essay"]')).toHaveLength(1);
    expect(archive.textContent).not.toContain("अनुवाद");
    expect(dom.querySelector(".reading-translations a")?.getAttribute("href")).toBe(
      "/arsenal/writing/translation"
    );
    expect(dom.querySelector('.reading-translations [lang="mr"]')?.textContent).toBe("मराठी");
  });

  it("preserves readable and machine dates, reading time, theme labels and cover dimensions", () => {
    const markup = renderPublication();
    const dom = parse(markup);
    expect(formatArticleDate("2025-11-12")).toBe("12 November 2025");
    expect(markup).toContain('<time dateTime="2025-11-12">12 November 2025</time>');
    expect(markup).toContain("5 min read");
    expect(markup).toContain("Read essay");
    expect(dom.querySelector(".reading-row__themes")?.textContent).toContain("Engineering");
    const lead = dom.querySelector(".reading-feature--lead img")!;
    expect(lead.getAttribute("width")).toBe("1600");
    expect(lead.getAttribute("height")).toBe("900");
    expect(lead.getAttribute("alt")).toBe("");
    expect(lead.getAttribute("loading")).toBe("eager");
    expect(dom.querySelector(".reading-row img")?.getAttribute("loading")).toBe("lazy");
  });

  it("reads query filters immediately and offers an accessible empty state", () => {
    const dom = parse(renderPublication("/arsenal/writing?theme=growth&q=unmatched"));
    expect(dom.querySelector<HTMLInputElement>("#writing-search")?.value).toBe("unmatched");
    expect(dom.querySelector('[role="status"]')?.textContent).toContain("0 essays");
    expect(dom.querySelector('[role="status"]')?.getAttribute("aria-live")).toBe("polite");
    expect(dom.querySelector(".reading-theme[aria-pressed=true]")?.textContent).toContain("Growth");
    expect(dom.querySelector(".reading-empty")?.textContent).toContain("Nothing matched.");
    expect(dom.querySelector(".reading-empty button")?.textContent).toBe("Clear filters");
    expect(dom.querySelectorAll(".reading-row")).toHaveLength(0);
  });
});
