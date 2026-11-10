import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArticleReader } from "@/components/writing/article/ArticleReader";
import {
  ArticleContents,
  ArticleReadingProgress,
  fitContents,
  railSections,
  railStopFor,
  timeLeftLabel,
  wordsRemaining,
} from "@/components/writing/article/ReadingTools";
import { useReadingFocus } from "@/components/writing/article/useReadingFocus";
import {
  articleLanguageLabel,
  articlePresentation,
  articleProgress,
  articleSections,
  articleTranslations,
  isReadingShortcut,
  primaryArticleTheme,
} from "@/components/writing/article/articleHelpers";
import { getArticleSummaries, getPostBySlug } from "@/utils/loadArticles";
import type { ParsedPost } from "@/utils/markdown";
import { categoriesFor, relatedArticles } from "@/utils/writingCatalog";
import { toSummary } from "@/utils/loadArticles";

const fixture: ParsedPost = {
  slug: "fixture",
  title: "An essay",
  description: "Description",
  date: "2025-01-01",
  tags: ["systems"],
  featured: false,
  readingMinutes: 3,
  html: "<p>Body</p>",
  toc: [],
};

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  );
});

describe("article presentation helpers", () => {
  it("takes the first catalog theme without inventing one for unknown tags", () => {
    expect(primaryArticleTheme({ tags: ["Psychology", "Consciousness"] })).toBe("consciousness");
    expect(primaryArticleTheme({ tags: ["unknown"] })).toBeUndefined();
    expect(primaryArticleTheme({ tags: [], collection: "New Earth Consciousness" })).toBe(
      "consciousness"
    );
  });

  it("hides only the matching first figure in place and preserves its alt, caption and srcset", () => {
    const figure =
      '<figure class="medium-figure" data-layout="fill"><img src="/cover.webp" alt="Source alt" width="800" height="400" srcset="/small.webp 400w" loading="lazy"><figcaption>Source caption</figcaption></figure>';
    const html = `<p>Before</p>${figure}<p>After</p>${figure}`;
    const result = articlePresentation({ html, cover: "/cover.webp" });
    expect(result.bodyHtml).toBe(
      html.replace('class="medium-figure"', 'class="medium-figure article-figure--duplicate"')
    );
    expect(result.coverHtml).toBe(figure.replace('loading="lazy"', 'loading="eager"'));
    expect(result.bodyHtml.match(/article-figure--duplicate/g)).toHaveLength(1);
  });

  it("leaves differing covers, later matches, and images outside figures alone", () => {
    for (const html of [
      '<figure><img src="/different.webp"></figure><figure><img src="/cover.webp"></figure>',
      '<p><img src="/cover.webp"></p><figure><img src="/cover.webp"></figure>',
      '<figure><img data-src="/cover.webp" src="/different.webp"></figure>',
      "<p>No images</p>",
    ]) {
      expect(articlePresentation({ html, cover: "/cover.webp" })).toEqual({
        bodyHtml: html,
        coverHtml: undefined,
      });
    }
    const html = '<figure><img src="/cover.webp"></figure>';
    expect(articlePresentation({ html }).bodyHtml).toBe(html);
  });

  it("handles single-quoted attributes and marks only genuinely tall images", () => {
    const html =
      "<figure data-layout='inset'><img class='source' src='/a?x=1&amp;y=2' width='100' height='141' alt=''></figure><img width='100' height='140'><img height='400'>";
    const result = articlePresentation({ html, cover: "/a?x=1&y=2" });
    expect(result.coverHtml).toContain("class='source article-image--portrait'");
    expect(result.bodyHtml.match(/article-image--portrait/g)).toHaveLength(1);
    expect(result.bodyHtml).toContain(
      "<figure data-layout='inset' class=\"article-figure--duplicate\">"
    );
  });

  it("uses real article loaders for themes, cover duplication, and unchanged source text", async () => {
    const summaries = await getArticleSummaries();
    for (const summary of summaries) {
      const post = (await getPostBySlug(summary.slug))!;
      expect(primaryArticleTheme(post)).toBe(categoriesFor(summary)[0]?.id);
      const presented = articlePresentation(post);
      const source = document.createElement("div");
      source.innerHTML = post.html;
      const output = document.createElement("div");
      output.innerHTML = presented.bodyHtml;
      expect(output.textContent, summary.slug).toBe(source.textContent);
      expect(Array.from(output.querySelectorAll("img"), (img) => img.getAttribute("alt"))).toEqual(
        Array.from(source.querySelectorAll("img"), (img) => img.getAttribute("alt"))
      );
      if (source.querySelector("figure img")?.getAttribute("src") === post.cover && post.cover) {
        expect(output.querySelectorAll(".article-figure--duplicate"), summary.slug).toHaveLength(1);
        expect(presented.coverHtml).toContain(post.cover);
      }
    }
    const time = (await getPostBySlug("i-dont-have-time"))!;
    const result = articlePresentation(time);
    expect(result.bodyHtml.startsWith("<p>")).toBe(true);
    expect(result.coverHtml).toContain("article-image--portrait");
    expect(result.bodyHtml.indexOf("article-figure--duplicate")).toBeGreaterThan(
      result.bodyHtml.indexOf("<h2")
    );
    const engineering = (await getPostBySlug("designing-for-reliability"))!;
    expect(articlePresentation(engineering)).toEqual({
      bodyHtml: engineering.html,
      coverHtml: undefined,
    });
    // Parses every essay through jsdom (~2s alone); leave headroom when the whole suite runs in parallel.
  }, 20_000);

  it("finds real original / translation pairs without suggesting unrelated languages", async () => {
    const summaries = await getArticleSummaries();
    const translated = summaries.filter((item) => item.translationOf);
    expect(translated.length).toBeGreaterThan(0);
    for (const item of translated) {
      const { original, translations } = articleTranslations(item, summaries);
      expect(original?.slug).toBe(item.translationOf);
      expect(translations).toEqual([]);
      expect(articleTranslations(original!, summaries).translations).toContain(item);
    }
    expect(
      articleTranslations({ slug: "missing", translationOf: "missing-too" }, summaries)
    ).toEqual({ original: undefined, translations: [] });
    expect(articleLanguageLabel("mr")).toBe("मराठी");
    expect(articleLanguageLabel("fr")).toBe("fr");
    expect(articleLanguageLabel(undefined)).toBeUndefined();
  });

  it("measures body geometry instead of document or element scrollTop", () => {
    expect(articleProgress(200, 2000, 800)).toBe(0);
    expect(articleProgress(0, 2000, 800)).toBe(0);
    expect(articleProgress(-600, 2000, 800)).toBe(0.5);
    expect(articleProgress(-1200, 2000, 800)).toBe(1);
    expect(articleProgress(-2000, 2000, 800)).toBe(1);
    expect(articleProgress(100, 400, 800)).toBe(0);
    expect(articleProgress(0, 400, 800)).toBe(1);
  });
});

function renderReader(
  post: ParsedPost,
  summaries: Awaited<ReturnType<typeof getArticleSummaries>>
) {
  const markup = renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(ArticleReader, { post, summaries }))
  );
  const output = document.createElement("div");
  output.innerHTML = markup;
  return output;
}

describe("article reader markup", () => {
  it("renders actual metadata, preserves Part 0, and uses compact related reading", async () => {
    const summaries = await getArticleSummaries();
    const post = (await getPostBySlug("alchemy-of-the-mind-0-the-art-of-thought-transformation"))!;
    const output = renderReader(post, summaries);
    expect(output.querySelector("h1")?.textContent).toBe(post.title);
    expect(
      output.querySelector('[href="/arsenal/writing?q=Alchemy%20of%20the%20Mind"]')?.textContent
    ).toContain("Part 0");
    expect(output.querySelector(".article-source-links a")?.getAttribute("rel")).toBe("noopener");
    expect(output.querySelector(".article-source-links a")?.getAttribute("target")).toBe("_blank");
    expect(
      Array.from(output.querySelectorAll(".article-related__title"), (node) => node.textContent)
    ).toEqual(relatedArticles(toSummary(post), summaries).map((item) => item.title));
    expect(output.querySelectorAll(".article-related__link")).toHaveLength(3);
    expect(output.querySelector(".article-cover img")?.getAttribute("src")).toBe(post.cover);
    expect(output.querySelector(".article-focus-toggle")?.getAttribute("aria-pressed")).toBe(
      "false"
    );
  });

  it("shows kicker/subtitle as supplied and links every theme", async () => {
    const summaries = await getArticleSummaries();
    const post = (await getPostBySlug("a-note-to-myself-clarity"))!;
    const output = renderReader(post, summaries);
    expect(output.querySelector(".article-kicker")?.textContent).toBe(post.kicker);
    expect(output.querySelector(".article-subtitle")?.textContent).toBe(post.subtitle);
    for (const theme of categoriesFor(post))
      expect(output.querySelector(`[href="/arsenal/writing?theme=${theme.id}"]`)?.textContent).toBe(
        theme.label
      );
  });

  it("sets Marathi lang and provides both directions of translation navigation", async () => {
    const summaries = await getArticleSummaries();
    const translation = summaries.find((item) => item.lang === "mr" && item.translationOf)!;
    const translated = (await getPostBySlug(translation.slug))!;
    const output = renderReader(translated, summaries);
    expect(output.querySelector("article")?.lang).toBe("mr");
    expect(
      output.querySelector(`[href="/arsenal/writing/${translation.translationOf}"]`)?.textContent
    ).toBe("Read in English");
    const english = renderReader((await getPostBySlug(translation.translationOf!))!, summaries);
    expect(
      english.querySelector(`[href="/arsenal/writing/${translation.slug}"]`)?.textContent
    ).toBe("Also in मराठी");
  });

  it("puts main sections on the dot rail and folds subsections into the section above", () => {
    const items = [
      { id: "a", text: "A", level: 2 as const },
      { id: "a1", text: "A1", level: 3 as const },
      { id: "b", text: "B", level: 2 as const },
      { id: "c", text: "C", level: 2 as const },
    ];
    const stops = railSections(items);
    expect(stops).toEqual([
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
    ]);
    expect(railStopFor(items, stops, "a1")).toBe("a");
    expect(railStopFor(items, stops, "c")).toBe("c");
    expect(railStopFor(items, stops, undefined)).toBe("a");
    // Too few main sections: every heading becomes a stop.
    expect(railSections(items.slice(0, 3)).map((stop) => stop.id)).toEqual(["a", "a1", "b"]);
  });

  it("keeps absent metadata absent and hides the TOC below three headings", () => {
    const output = renderReader(fixture, []);
    expect(output.querySelector(".article-kicker")).toBeNull();
    expect(output.querySelector(".article-cover")).toBeNull();
    expect(output.querySelector(".article-contents")).toBeNull();
    expect(output.querySelector(".article-subtitle")?.textContent).toBe(fixture.description);
    const items = [
      { id: "a", text: "A", level: 2 as const },
      { id: "b", text: "B", level: 3 as const },
    ];
    expect(renderToStaticMarkup(createElement(ArticleContents, { items }))).toBe("");
    expect(
      renderToStaticMarkup(
        createElement(ArticleContents, { items: [...items, { id: "c", text: "C", level: 2 }] })
      )
    ).toContain("On this page");
  });
});

let root: Root | undefined;
let host: HTMLDivElement | undefined;
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  host?.remove();
  root = undefined;
  host = undefined;
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function FocusHarness() {
  const [focused, toggle] = useReadingFocus();
  return createElement(
    "div",
    null,
    createElement("button", { onClick: toggle, "aria-pressed": focused }, "Focus"),
    createElement("input"),
    createElement(
      "div",
      { contentEditable: true, suppressContentEditableWarning: true },
      createElement("span", null, "Editable")
    )
  );
}

async function mountFocus() {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(createElement(FocusHarness)));
  return host;
}

describe("focus keyboard and persistence", () => {
  it("toggles by button/F, ignores inputs and modifiers, exits with Escape and cleans up", async () => {
    const host = await mountFocus();
    const button = host.querySelector("button")!;
    await act(async () => button.click());
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(localStorage.getItem("writing-focus")).toBe("true");
    await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(button.getAttribute("aria-pressed")).toBe("false");
    for (const target of [host.querySelector("input")!, host.querySelector("span")!]) {
      await act(async () =>
        target.dispatchEvent(new KeyboardEvent("keydown", { key: "f", bubbles: true }))
      );
      expect(button.getAttribute("aria-pressed")).toBe("false");
    }
    for (const modifier of ["ctrlKey", "metaKey", "altKey", "repeat", "isComposing"])
      expect(isReadingShortcut(new KeyboardEvent("keydown", { key: "f", [modifier]: true }))).toBe(
        false
      );
    await act(async () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "f" })));
    expect(document.body.dataset.articleFocus).toBe("true");
    await act(async () => root!.unmount());
    root = undefined;
    expect(document.body.dataset.articleFocus).toBeUndefined();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "f" }));
    expect(document.body.dataset.articleFocus).toBeUndefined();
  });

  it("restores visitor preference and works when localStorage throws", async () => {
    localStorage.setItem("writing-focus", "true");
    const host = await mountFocus();
    expect(host.querySelector("button")?.getAttribute("aria-pressed")).toBe("true");
    await act(async () => root!.unmount());
    root = undefined;
    host.remove();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const restricted = await mountFocus();
    await act(async () => restricted.querySelector("button")!.click());
    expect(restricted.querySelector("button")?.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("reading observer lifecycle", () => {
  function observers() {
    const intersections: {
      callback: IntersectionObserverCallback;
      disconnect: ReturnType<typeof vi.fn>;
    }[] = [];
    const resizeDisconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe = vi.fn();
        disconnect = vi.fn();
        constructor(callback: IntersectionObserverCallback) {
          intersections.push({ callback, disconnect: this.disconnect });
        }
      }
    );
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn();
        disconnect = resizeDisconnect;
      }
    );
    return { intersections, resizeDisconnect };
  }

  async function mount(element: ReturnType<typeof createElement>) {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root!.render(element));
    return host;
  }

  it("updates body progress, skips hidden-tab frames and disconnects on unmount", async () => {
    const { intersections, resizeDisconnect } = observers();
    let frame: FrameRequestCallback | undefined;
    const request = vi.fn((callback: FrameRequestCallback) => {
      frame = callback;
      return 1;
    });
    vi.stubGlobal("requestAnimationFrame", request);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const output = await mount(
      createElement(
        "div",
        null,
        createElement(ArticleReadingProgress),
        createElement("div", { id: "article-body" })
      )
    );
    vi.spyOn(document.getElementById("article-body")!, "getBoundingClientRect").mockReturnValue({
      top: -600,
      height: 2000,
    } as DOMRect);
    vi.stubGlobal("innerHeight", 800);
    intersections[0].callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
    expect(output.querySelector<HTMLElement>(".article-progress__fill")?.style.transform).toBe(
      "scaleX(0.5)"
    );
    window.dispatchEvent(new Event("scroll"));
    expect(request).toHaveBeenCalledOnce();
    frame!(0);
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    window.dispatchEvent(new Event("scroll"));
    expect(request).toHaveBeenCalledOnce();
    await act(async () => root!.unmount());
    root = undefined;
    expect(intersections[0].disconnect).toHaveBeenCalledOnce();
    expect(resizeDisconnect).toHaveBeenCalledOnce();
  });

  it("creates no progress observers under reduced motion", async () => {
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);
    const { intersections } = observers();
    await mount(createElement(ArticleReadingProgress));
    expect(intersections).toHaveLength(0);
  });

  it("follows the section being read on every scroll and releases its listeners", async () => {
    observers();
    const queued: FrameRequestCallback[] = [];
    const frames = vi.fn((callback: FrameRequestCallback) => queued.push(callback));
    vi.stubGlobal("requestAnimationFrame", frames);
    const items = ["one", "two", "three"].map((id) => ({ id, text: id, level: 2 as const }));
    const output = await mount(
      createElement(
        "div",
        { id: "article-body" },
        createElement(ArticleContents, { items }),
        ...items.map((item) => createElement("h2", { id: item.id, key: item.id }, item.text))
      )
    );
    vi.stubGlobal("innerHeight", 800);
    const tops = { one: -100, two: -100, three: 500 };
    items.forEach((item) =>
      vi
        .spyOn(document.getElementById(item.id)!, "getBoundingClientRect")
        .mockImplementation(() => ({ top: tops[item.id as keyof typeof tops] }) as DOMRect)
    );
    const railBounds = vi
      .spyOn(output.querySelector("#article-body")!, "getBoundingClientRect")
      .mockReturnValue({ top: 0, bottom: 2000 } as DOMRect);
    const scroll = () =>
      act(async () => {
        window.dispatchEvent(new Event("scroll"));
        queued.splice(0).forEach((callback) => callback(0));
      });
    const current = (selector: string) =>
      output.querySelector(`${selector} [aria-current="location"]`)?.getAttribute("href");
    await scroll();
    expect(output.querySelector("aside")?.dataset.visible).toBe("true");
    expect(current("aside")).toBe("#two");
    expect(output.querySelectorAll('aside [aria-current="location"]')).toHaveLength(1);
    // The dot rail on the other side follows the same section.
    expect(output.querySelectorAll(".chapter-rail a")).toHaveLength(3);
    expect(current(".chapter-rail")).toBe("#two");
    // A rail click glides "three" to rest just above the reading line (200px) without ever
    // crossing an observer band edge: the next scroll frame must still pick it up.
    tops.three = 192;
    await scroll();
    expect(current("aside")).toBe("#three");
    expect(current(".chapter-rail")).toBe("#three");
    railBounds.mockReturnValue({ top: -2000, bottom: 0 } as DOMRect);
    await scroll();
    expect(output.querySelector("aside")?.dataset.visible).toBe("false");
    await act(async () => root!.unmount());
    root = undefined;
    frames.mockClear();
    window.dispatchEvent(new Event("scroll"));
    expect(frames).not.toHaveBeenCalled();
  });

  it("keeps tracking headings that the article body re-renders after the tracker starts", async () => {
    observers();
    const queued: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
      queued.push(callback)
    );
    vi.stubGlobal("innerHeight", 800);
    const items = ["one", "two", "three"].map((id) => ({ id, text: id, level: 2 as const }));
    const output = await mount(
      createElement(
        "div",
        { id: "article-body" },
        createElement(ArticleContents, { items }),
        createElement("div", { className: "prose" })
      )
    );
    const prose = output.querySelector(".prose")!;
    const render = (tops: Record<string, number>) => {
      prose.replaceChildren(
        ...items.map((item) => {
          const heading = document.createElement("h2");
          heading.id = item.id;
          heading.getBoundingClientRect = () => ({ top: tops[item.id] }) as DOMRect;
          return heading;
        })
      );
    };
    // The tracker mounts before the body markup settles; the body then replaces its headings.
    render({ one: 0, two: 0, three: 0 });
    await act(async () => {});
    render({ one: -900, two: 192, three: 1400 });
    await act(async () => {
      window.dispatchEvent(new Event("scroll"));
      queued.splice(0).forEach((callback) => callback(0));
    });
    expect(output.querySelector('aside [aria-current="location"]')?.getAttribute("href")).toBe(
      "#two"
    );
    expect(
      output.querySelector('.chapter-rail [aria-current="location"]')?.getAttribute("href")
    ).toBe("#two");
  });

  it("fits the contents in one screen, folding subsections before falling back to a window", () => {
    const tried: string[] = [];
    const fitWhen = (ok: string) =>
      fitContents(
        (mode) => tried.push(mode),
        () => tried.at(-1) === ok
      );
    expect(fitWhen("roomy")).toBe("roomy");
    tried.length = 0;
    expect(fitWhen("sections")).toBe("sections");
    expect(tried).toEqual(["roomy", "compact", "sections"]);
    tried.length = 0;
    expect(fitWhen("never")).toBe("window");
    expect(tried).toEqual(["roomy", "compact", "sections", "dense", "window"]);
  });

  it("marks the section of a folded subsection and keeps it centred in the window", async () => {
    observers();
    const queued: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
      queued.push(callback)
    );
    vi.stubGlobal("innerHeight", 800);
    const items = [
      { id: "one", text: "one", level: 2 as const },
      { id: "two", text: "two", level: 2 as const },
      { id: "two-a", text: "two a", level: 3 as const },
      { id: "three", text: "three", level: 2 as const },
    ];
    const tops: Record<string, number> = { one: -900, two: -400, "two-a": 100, three: 900 };
    const output = await mount(
      createElement(
        "div",
        { id: "article-body" },
        createElement(ArticleContents, { items }),
        ...items.map((item) => createElement("h2", { id: item.id, key: item.id }, item.text))
      )
    );
    items.forEach((item) => {
      document.getElementById(item.id)!.getBoundingClientRect = () =>
        ({ top: tops[item.id] }) as DOMRect;
    });
    const aside = output.querySelector("aside")!;
    const nav = aside.querySelector("nav")!;
    const scrollTo = vi.fn();
    nav.scrollTo = scrollTo as typeof nav.scrollTo;
    const scroll = () =>
      act(async () => {
        window.dispatchEvent(new Event("scroll"));
        queued.splice(0).forEach((callback) => callback(0));
      });
    const marked = () => aside.querySelector('[aria-current="location"]')?.getAttribute("href");
    aside.dataset.fit = "roomy";
    await scroll();
    expect(marked()).toBe("#two-a");
    aside.dataset.fit = "sections";
    await scroll();
    expect(marked()).toBe("#two");
    expect(scrollTo).not.toHaveBeenCalled();
    aside.dataset.fit = "window";
    await scroll();
    expect(marked()).toBe("#two");
    expect(scrollTo).toHaveBeenCalledTimes(1);
    await scroll();
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("hides an essay's own written-in contents and leaves it out of the rails", async () => {
    const summaries = await getArticleSummaries();
    let found = 0;
    for (const summary of summaries) {
      const post = (await getPostBySlug(summary.slug))!;
      const own = post.toc.filter((item) => /table of contents/i.test(item.text));
      if (!own.length) continue;
      found += 1;
      expect(articleSections(post.toc), summary.slug).toEqual(
        post.toc.filter((item) => !own.includes(item))
      );
      const body = document.createElement("div");
      body.innerHTML = articlePresentation(post).bodyHtml;
      const heading = body.querySelector(`[id="${own[0].id}"]`)!;
      expect(heading.classList.contains("article-authored-contents"), summary.slug).toBe(true);
      // The list right under the heading goes with it; the essay's first section stays.
      const list = heading.nextElementSibling!;
      expect(list.tagName, summary.slug).toMatch(/^(OL|UL)$/);
      expect(list.classList.contains("article-authored-contents"), summary.slug).toBe(true);
      const firstSection = body.querySelector(`[id="${articleSections(post.toc)[0].id}"]`)!;
      expect(firstSection.classList.contains("article-authored-contents")).toBe(false);
      // A separator before and after the list collapses to one.
      const separators = Array.from(body.children).filter(
        (node) => node.tagName === "HR" && !node.classList.contains("article-authored-contents")
      );
      for (const [index, node] of separators.entries())
        expect(separators[index + 1] === node.nextElementSibling, summary.slug).toBe(false);
    }
    expect(found).toBeGreaterThanOrEqual(6);
  }, 20_000);

  it("counts down the minutes left from the words still below the reading line", () => {
    const blocks = [
      { top: -400, bottom: -100, words: 300 },
      { top: 100, bottom: 300, words: 200 },
      { top: 400, bottom: 900, words: 500 },
    ];
    expect(wordsRemaining(blocks, -500)).toBe(1000);
    expect(wordsRemaining(blocks, 200)).toBe(600);
    expect(wordsRemaining(blocks, 1000)).toBe(0);
    // It starts at the header's "N min read" and ends at "Finished".
    expect(timeLeftLabel(1000, 1000, 5)).toBe("5 min left");
    expect(timeLeftLabel(600, 1000, 5)).toBe("3 min left");
    expect(timeLeftLabel(20, 1000, 5)).toBe("1 min left");
    expect(timeLeftLabel(0, 1000, 5)).toBe("Finished");
  });
});
