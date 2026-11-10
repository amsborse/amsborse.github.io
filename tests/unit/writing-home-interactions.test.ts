import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WritingPublication } from "@/components/writing/WritingPublication";
import type { ArticleSummary } from "@/utils/loadArticles";

const posts: ArticleSummary[] = [
  {
    slug: "stress",
    title: "Stress and growth",
    description: "",
    tags: ["Growth", "Stress"],
    date: "2026-01-01",
    readingMinutes: 2,
    featured: false,
    headings: [],
  },
  {
    slug: "systems",
    title: "Systems",
    description: "",
    tags: ["systems"],
    date: "2025-01-01",
    readingMinutes: 3,
    featured: false,
    headings: [],
  },
];
function HistoryControls() {
  const location = useLocation();
  const navigate = useNavigate();
  return createElement(
    "div",
    null,
    createElement("output", { id: "test-location" }, location.search),
    createElement("button", { onClick: () => navigate(-1) }, "Back"),
    createElement("button", { onClick: () => navigate(1) }, "Forward"),
    createElement("textarea", { id: "test-editor" })
  );
}
let container: HTMLDivElement;
let root: Root;
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("IntersectionObserver", undefined);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      createElement(
        MemoryRouter,
        { initialEntries: ["/arsenal/writing?stage=classic"] },
        createElement(WritingPublication, { posts }),
        createElement(HistoryControls)
      )
    );
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
async function click(element: Element | null) {
  expect(element).not.toBeNull();
  await act(async () => (element as HTMLElement).click());
}
function button(text: string) {
  return [...container.querySelectorAll("button")].find((element) => element.textContent === text)!;
}
function location() {
  return container.querySelector("#test-location")!.textContent;
}

describe("reading-room interaction", () => {
  it("toggles themes, filters instantly, and restores selection through back / forward", async () => {
    const growth = [...container.querySelectorAll(".reading-theme")].find((element) =>
      element.textContent?.includes("Growth")
    )!;
    await click(growth);
    expect(location()).toBe("?stage=classic&theme=growth");
    expect(container.querySelectorAll(".reading-row")).toHaveLength(1);
    expect(growth.getAttribute("aria-pressed")).toBe("true");
    await click(button("Back"));
    expect(location()).toBe("?stage=classic");
    expect(container.querySelectorAll(".reading-row")).toHaveLength(2);
    await click(button("Forward"));
    expect(growth.getAttribute("aria-pressed")).toBe("true");
    await click(growth);
    expect(location()).toBe("?stage=classic");
    expect(growth.getAttribute("aria-pressed")).toBe("false");
  });

  it("takes the reader to the filtered archive when a theme is chosen, not when cleared", async () => {
    const scrolled: Element[] = [];
    // jsdom has no layout, so it ships without scrollIntoView; record the requests instead.
    HTMLElement.prototype.scrollIntoView = function (this: HTMLElement) {
      scrolled.push(this);
    };
    const growth = [...container.querySelectorAll(".reading-theme")].find((element) =>
      element.textContent?.includes("Growth")
    )!;
    await click(growth);
    expect(scrolled).toEqual([container.querySelector("#reading-archive")]);
    await click(growth);
    expect(scrolled).toHaveLength(1);
    delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
  });

  it("writes search to the URL, announces results, and clears query and theme together", async () => {
    const search = container.querySelector<HTMLInputElement>("#writing-search")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        search,
        "stress"
      );
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(location()).toBe("?stage=classic&q=stress");
    expect(container.querySelector('[role="status"]')?.textContent).toContain("1 essay");
    expect(container.querySelectorAll(".reading-row")).toHaveLength(1);
    await click(button("Clear search"));
    expect(search.value).toBe("");
    expect(document.activeElement).toBe(search);
    expect(container.querySelectorAll(".reading-row")).toHaveLength(2);
    await click(container.querySelectorAll(".reading-theme")[3]);
    await click(button("Clear filters"));
    expect(location()).toBe("?stage=classic");
    expect(container.querySelectorAll(".reading-row")).toHaveLength(2);
  });

  it("focuses with slash, ignores editors and modifiers, and removes its listener on unmount", async () => {
    const search = container.querySelector<HTMLInputElement>("#writing-search")!;
    const editor = container.querySelector<HTMLTextAreaElement>("#test-editor")!;
    editor.focus();
    const typing = new KeyboardEvent("keydown", { key: "/", bubbles: true, cancelable: true });
    editor.dispatchEvent(typing);
    expect(document.activeElement).toBe(editor);
    expect(typing.defaultPrevented).toBe(false);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "/", ctrlKey: true }));
    expect(document.activeElement).toBe(editor);
    const slash = new KeyboardEvent("keydown", { key: "/", cancelable: true });
    window.dispatchEvent(slash);
    expect(document.activeElement).toBe(search);
    expect(slash.defaultPrevented).toBe(true);
    await act(async () => root.render(null));
    const after = new KeyboardEvent("keydown", { key: "/", cancelable: true });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });
});
