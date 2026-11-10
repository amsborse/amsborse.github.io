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

  it("keeps every showcase screenshot's dimensions and its theme-aware source handling", () => {
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(ThemeProvider, null, createElement(SelectedWork, { embedded: true }))
      )
    );
    const document = new DOMParser().parseFromString(markup, "text/html");
    const images = Array.from(document.querySelectorAll(".showcase-image img"));

    // As before the revamp: the live Sutra hero stands in for Sutra's first screenshot,
    // and every other project leads with its first one.
    expect(images).toHaveLength(
      showcase.reduce(
        (count, project) => count + (project.id === "sutra" ? project.images.length - 1 : 1),
        0
      )
    );
    for (const image of images) {
      expect(image.getAttribute("width")).toBeTruthy();
      expect(image.getAttribute("height")).toBeTruthy();
      expect(image.getAttribute("loading")).toBe("lazy");
      expect(image.getAttribute("decoding")).toBe("async");
    }
    for (const project of showcase) {
      expect(document.body.textContent).toContain(project.title);
      expect(document.body.textContent).toContain(project.summary);
      for (const link of project.links) {
        expect(document.querySelector(`a[href="${link.href}"]`)).not.toBeNull();
      }
    }
    expect(document.querySelectorAll(".showcase-chapter")).toHaveLength(showcase.length);
  });
});
