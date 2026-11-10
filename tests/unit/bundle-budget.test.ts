import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain .mjs build script without type declarations
import { articleSlugs, measure } from "../../scripts/check-bundle-size.mjs";

describe("bundle budget", () => {
  it("counts essay chunks as article content and everything else as code", () => {
    const slugs = articleSlugs() as Set<string>;
    expect(slugs.has("i-dont-have-time")).toBe(true);
    expect(slugs.has("designing-for-reliability")).toBe(true);
    const totals = measure(
      [
        { name: "i-dont-have-time-Df7lu-uB.js", size: 100 },
        { name: "designing-for-reliability-AbCd_123.js", size: 10 },
        { name: "loadArticles-z3fa81nf.js", size: 7 },
        { name: "index-emWnsJMi.js", size: 5 },
        { name: "index-emWnsJMi.css", size: 1000 },
      ],
      slugs
    );
    expect(totals).toEqual({ code: 12, articles: 110 });
  });
});
