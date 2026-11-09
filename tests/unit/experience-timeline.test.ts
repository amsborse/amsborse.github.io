import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { experience } from "@/data";
import { ExperienceTimeline } from "@/components/experience/ExperienceTimeline";
import { splitExperienceSummary } from "@/components/experience/experience-summary";

describe("experience timeline", () => {
  it("splits the description and technologies while preserving unmatched summaries", () => {
    expect(splitExperienceSummary("Platform systems — Java · AWS · Lambda.")).toEqual({
      description: "Platform systems",
      technologies: ["Java", "AWS", "Lambda"],
    });
    expect(splitExperienceSummary("A summary without a technology separator")).toEqual({
      description: "A summary without a technology separator",
      technologies: [],
    });
    expect(splitExperienceSummary("A summary — without technology chips")).toEqual({
      description: "A summary — without technology chips",
      technologies: [],
    });
  });

  it("keeps all role content available and hides later outcomes behind a controlled region", () => {
    const markup = renderToStaticMarkup(createElement(ExperienceTimeline, { entries: experience }));
    const document = new DOMParser().parseFromString(markup, "text/html");
    const roles = [...document.querySelectorAll(".experience-stop")];

    expect(document.querySelectorAll("h2")).toHaveLength(1);
    expect(document.querySelectorAll("h3")).toHaveLength(experience.length);
    expect(roles).toHaveLength(experience.length);

    for (const [index, entry] of experience.entries()) {
      const role = roles[index];
      expect(role.textContent).toContain(entry.title);
      expect(role.textContent).toContain(entry.company);
      expect(role.textContent).toContain(entry.start);
      expect(role.textContent).toContain(entry.end);
      expect(role.textContent).toContain(entry.location);
      expect(role.querySelectorAll(".experience-outcomes__list")[0]?.children).toHaveLength(
        Math.min(3, entry.achievements.length)
      );
      expect(role.textContent).toContain(entry.achievements.at(-1));

      if (entry.achievements.length > 3) {
        const button = role.querySelector("button[aria-expanded='false']");
        const region = role.querySelector('[role="region"]');
        expect(button?.getAttribute("aria-controls")).toBe(region?.id);
        expect(button?.textContent).toBe(`Show ${entry.achievements.length - 3} more outcomes`);
        expect(region?.getAttribute("aria-hidden")).toBe("true");
      }
    }
  });

  it("draws one sketch per major role, each restating a single stated outcome", () => {
    const markup = renderToStaticMarkup(createElement(ExperienceTimeline, { entries: experience }));
    const document = new DOMParser().parseFromString(markup, "text/html");
    const sketches = [...document.querySelectorAll("figure[role='img']")];
    const outcomes = experience.flatMap((entry) => entry.achievements);

    expect(sketches).toHaveLength(2);
    for (const sketch of sketches) {
      const label = sketch.getAttribute("aria-label") ?? "";
      expect(outcomes.some((outcome) => label.endsWith(outcome))).toBe(true);
    }
    expect(sketches[0].textContent).toContain("135K+");
    expect(sketches[1].textContent).toContain("AWS Step Functions");
  });

  it("emphasizes metrics only, not bare counts or version numbers", () => {
    const markup = renderToStaticMarkup(createElement(ExperienceTimeline, { entries: experience }));
    const document = new DOMParser().parseFromString(markup, "text/html");
    const figures = [...document.querySelectorAll(".experience-outcomes__figure")].map(
      (figure) => figure.textContent
    );

    expect(figures).toContain("237K+");
    expect(figures).toContain("$28M");
    expect(figures).toContain("13%");
    expect(figures.every((figure) => /[$KMB%+]/.test(figure ?? ""))).toBe(true);
  });
});
