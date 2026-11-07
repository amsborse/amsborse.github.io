import { createElement, act, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import About from "@/pages/About";
import ExperiencePage from "@/pages/Experience";
import Learning from "@/pages/Learning";
import WritingPage from "@/pages/Writing";
import { about, experience } from "@/data";
import { PageStage } from "@/components/stage/PageStage";

const sceneFactory = vi.hoisted(() => vi.fn());
vi.mock("@/components/stage/page-gpu.ts", () => ({ createPageScene: sceneFactory }));

function renderedPage(page: ComponentType) {
  const element = document.createElement("div");
  element.innerHTML = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(page)));
  return element;
}

describe("cinematic page stages", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    [About, about.pageTitle, "about"],
    [ExperiencePage, "Work history", "experience"],
    [WritingPage, "Essays", "writing"],
    [Learning, "Learning Lab", "learning"],
  ] as const)("renders %s heading inside its %s stage", (Page, title, motif) => {
    const stage = renderedPage(Page).querySelector(`.page-stage--${motif}`);
    expect(stage?.querySelector("h1")?.textContent).toBe(title);
  });

  it("keeps the original About, Experience, Writing, and Learning copy", () => {
    const pages = [About, ExperiencePage, WritingPage, Learning].map(
      (page) => renderedPage(page).textContent ?? ""
    );
    for (const paragraph of about.intro) expect(pages[0]).toContain(paragraph);
    expect(pages[1]).toContain("Roles and selected achievements.");
    expect(pages[1]).toContain("PDF and interactive view");
    expect(pages[2]).toContain("Notes on building systems that hold up");
    expect(pages[3]).toContain(
      "Explore complex concepts made tangible through interactive simulations."
    );
  });

  it("renders the static motif and does not import the scene with reduced motion", async () => {
    sceneFactory.mockClear();
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    Object.defineProperty(navigator, "gpu", { configurable: true, value: {} });
    const host = document.createElement("div");
    const root = createRoot(host);
    await act(async () => {
      root.render(
        createElement(PageStage, { motif: "about", eyebrow: "About", title: "Who I am" })
      );
    });
    expect(host.querySelector(".page-stage__static")).not.toBeNull();
    expect(host.querySelector(".page-stage")?.getAttribute("data-renderer")).toBe("static");
    expect(sceneFactory).not.toHaveBeenCalled();
    await act(async () => root.unmount());
    delete (navigator as Navigator & { gpu?: unknown }).gpu;
  });

  it("sets the Experience gate count from the experience data", () => {
    const stage = renderedPage(ExperiencePage).querySelector(".page-stage");
    expect(stage?.getAttribute("data-gate-count")).toBe(String(experience.length));
  });
});
