import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  InteractiveCardFooter,
  InteractiveCardHeader,
  InteractiveCardTags,
} from "@/components/InteractiveCard";

// Hub cards (Learning, Writing, Arsenal) used dark-theme text colours in light mode,
// leaving badges and calls to action faint on paper. Each must carry a light-theme colour.
const LIGHT_TEXT = "[[data-theme=light]_&amp;]:text-";

describe("interactive card text in light mode", () => {
  for (const status of ["active", "sandbox", "coming-soon", "default"] as const) {
    it(`status badge "${status}" has a light-theme text colour`, () => {
      expect(renderToStaticMarkup(createElement(InteractiveCardHeader, { status }))).toContain(
        LIGHT_TEXT
      );
    });
  }

  it("launch and research-phase footers have a light-theme text colour", () => {
    for (const status of ["active", "coming-soon"] as const) {
      expect(
        renderToStaticMarkup(createElement(InteractiveCardFooter, { href: "/x", status }))
      ).toContain(LIGHT_TEXT);
    }
  });

  it("tags have a light-theme text colour", () => {
    expect(renderToStaticMarkup(createElement(InteractiveCardTags, { tags: ["a"] }))).toContain(
      LIGHT_TEXT
    );
  });
});
