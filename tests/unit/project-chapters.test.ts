import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectCard } from "@/components/ProjectCard";
import { SelectedWork } from "@/components/SelectedWork";
import { projects, showcase } from "@/data";
import { ThemeProvider } from "@/theme/ThemeProvider";

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
});

afterEach(() => vi.unstubAllGlobals());

describe("project chapters and case files", () => {
  it("renders the case file disclosure with only the project's stack as sketch nodes", () => {
    const project = projects[0];
    const markup = renderToStaticMarkup(createElement(ProjectCard, { project }));
    const document = new DOMParser().parseFromString(markup, "text/html");
    const disclosure = document.querySelector("details");

    expect(disclosure?.querySelector("summary")?.textContent).toContain(project.title);
    expect(disclosure?.querySelector("summary")?.textContent).toContain(project.summary);
    expect(disclosure?.textContent).toContain(project.problem);
    expect(disclosure?.textContent).toContain(project.impact);
    expect(
      Array.from(disclosure?.querySelectorAll(".project-architecture__node") ?? []).map(
        (node) => node.textContent
      )
    ).toEqual(project.stack);
    for (const link of project.links) {
      expect(disclosure?.querySelector(`a[href="${link.href}"]`)?.textContent).toContain(
        link.label
      );
    }
  });

  it("keeps the Sutra hero and renders every project's existing content with a unique emblem", () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(ThemeProvider, null, createElement(SelectedWork, { embedded: true }))
      )
    );
    const document = new DOMParser().parseFromString(markup, "text/html");
    expect(document.querySelectorAll(".sutra-embed")).toHaveLength(1);
    expect(document.querySelector(".hero-scene")?.getAttribute("src")).toContain(
      "projects/sutra-dawn.webp"
    );
    expect(document.querySelector(".showcase-grid img")).toBeNull();
    expect(document.querySelectorAll(".showcase-grid article")).toHaveLength(showcase.length);
    const signatures = new Set<string>();
    for (const project of showcase) {
      const card = document.querySelector(`article[aria-labelledby="showcase-${project.id}"]`);
      expect(card?.querySelector("h3")?.textContent).toBe(project.title);
      expect(card?.querySelector(".showcase-card__summary")?.textContent).toBe(project.summary);
      expect(Array.from(card?.querySelectorAll("li") ?? [], (tag) => tag.textContent)).toEqual(
        project.tags
      );
      expect(card?.querySelector(".showcase-card__status")?.textContent).toBe(project.status);
      const emblem = card?.querySelector("svg");
      expect(emblem?.getAttribute("aria-hidden")).toBe("true");
      expect(emblem?.querySelectorAll("path")).toHaveLength(2);
      signatures.add(emblem?.innerHTML ?? "");
      for (const link of project.links) {
        const anchor = card?.querySelector(`a[href="${link.href}"]`);
        expect(anchor?.textContent).toContain(link.label);
        expect(anchor?.getAttribute("target")).toBe("_blank");
        expect(anchor?.getAttribute("rel")).toContain("noreferrer");
      }
    }
    expect(signatures.size).toBe(showcase.length);
  });
});
