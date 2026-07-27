import { describe, expect, it } from "vitest";
import { buildCheckPlan, parseChecksFlag, recommendOptionalChecks } from "../src/check-plan.ts";
import { resolveMode, defaultConfig } from "../src/config.ts";
import { deriveFinalStatus, renderMarkdown } from "../src/report.ts";
import type { ReviewReport, ScopeResult } from "../src/types.ts";

function scope(files: string[]): ScopeResult {
  return {
    task: "test task",
    sessionPresent: true,
    changedFiles: files,
    affectedComponents: [],
    affectedRoutes: ["/components"],
    affectedTests: [],
    affectedInteractions: [],
    supportingFiles: [],
    excludedFiles: [],
    inclusionReasons: {},
    expandedScope: [],
    expansionReasons: {},
    budgetsApplied: defaultConfig().budgets.fast,
    mode: "fast",
  };
}

describe("default mode", () => {
  it("resolveMode defaults to fast and never invents thorough", () => {
    const config = defaultConfig();
    config.review.mode = "thorough";
    expect(resolveMode(config)).toBe("fast");
    expect(resolveMode(config, "thorough")).toBe("thorough");
    expect(resolveMode(config, "fast")).toBe("fast");
  });
});

describe("check profiles", () => {
  it("parses --checks flags", () => {
    expect(parseChecksFlag("visual")).toBe("visual");
    expect(parseChecksFlag("cross-browser")).toBe("cross-browser");
    expect(parseChecksFlag("unknown")).toBe("default");
  });

  it("fast default uses chromium only and no cross-browser", () => {
    const plan = buildCheckPlan({
      mode: "fast",
      profile: "default",
      scope: scope(["src/components/Card.tsx"]),
      responsiveChanged: false,
    });
    expect(plan.runCrossBrowser).toBe(false);
    expect(plan.projects).toEqual(["chromium-desktop"]);
    expect(plan.maxAiCriticCalls).toBe(1);
  });

  it("adds mobile when responsive UI changed", () => {
    const plan = buildCheckPlan({
      mode: "fast",
      profile: "default",
      scope: scope(["src/styles/responsive.css"]),
      responsiveChanged: true,
    });
    expect(plan.projects).toContain("chromium-mobile");
  });

  it("cross-browser profile includes firefox and webkit without thorough mode", () => {
    const plan = buildCheckPlan({
      mode: "fast",
      profile: "cross-browser",
      scope: scope(["src/components/Nav.tsx"]),
    });
    expect(plan.runCrossBrowser).toBe(true);
    expect(plan.projects).toEqual(["chromium-desktop", "firefox-desktop", "webkit-desktop"]);
    expect(plan.mode).toBe("fast");
  });
});

describe("risk recommendations", () => {
  it("recommends but does not imply auto-run", () => {
    const recs = recommendOptionalChecks(scope(["src/components/StickyHeader.tsx"]));
    expect(recs.some((r) => /cross-browser/i.test(r))).toBe(true);
    expect(recs.every((r) => /Run `npm run/.test(r))).toBe(true);
  });
});

describe("task completion report", () => {
  it("uses Task Completion Report structure and scoped wording", () => {
    const report: ReviewReport = {
      wording: "Verification completed for the current task scope.",
      task: "Fix card overlap",
      mode: "fast",
      checksProfile: "default",
      finalStatus: "Passed",
      session: null,
      changedFiles: ["src/components/Card.tsx"],
      componentsReviewed: ["Card"],
      routesReviewed: ["/components"],
      routesNotOpened: ["/about"],
      inclusionReasons: { "src/components/Card.tsx": "changed" },
      excludedFiles: ["docs/readme.md — pre-existing dirty"],
      excludedRoutes: [],
      testsExecuted: [],
      checksSkipped: [{ name: "Firefox", reason: "Cross-browser mode not requested" }],
      interactionsExecuted: [],
      screenshots: [],
      issuesFound: [],
      repairsApplied: [],
      remainingIssues: [],
      riskBasedExpansion: [],
      recommendedOptionalChecks: [],
      cache: { hits: 0, misses: 0, keys: [] },
      screenshotUsage: { used: 0, budget: 6 },
      aiCallsUsed: { used: 0, budget: 1 },
      estimatedTokenUsage: 0,
      gates: [{ name: "Related tests pass", passed: true, details: "ok" }],
      gatesPassed: true,
      budgetExhausted: false,
      completedAt: new Date().toISOString(),
      checkResults: [],
    };
    const md = renderMarkdown(report);
    expect(md).toContain("# Task Completion Report");
    expect(md).toContain("## 15. Final status");
    expect(md).toContain("Verification completed for the current task scope.");
    expect(md).not.toContain("entire site is verified");
    expect(deriveFinalStatus(report)).toBe("Passed");
  });
});
