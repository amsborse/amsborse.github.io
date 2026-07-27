import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { filterSessionChanges } from "../src/git-scope.ts";
import { normalizeRepoPath } from "../src/session.ts";
import { buildForwardDeps, buildReverseDeps } from "../src/dependency-scope.ts";
import { loadRouteMap, routesForChangedFiles, parseRoutesFromSource } from "../src/route-scope.ts";
import { selectRelatedTests } from "../src/test-selector.ts";
import { enforceScreenshotBudget } from "../src/screenshot-runner.ts";
import { planRepairs } from "../src/repair-planner.ts";
import { evaluateQualityGates } from "../src/quality-gates.ts";
import { ReviewCache } from "../src/cache.ts";
import { joinAppUrl, defaultConfig } from "../src/config.ts";
import { renderMarkdown, mergeFindings } from "../src/report.ts";
import type { Finding, ReviewReport, TaskSession } from "../src/types.ts";
import fs from "node:fs";

const FIXTURE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("task-session change isolation", () => {
  it("excludes preexisting dirty files with unchanged hashes", () => {
    const session: TaskSession = {
      task: "Improve showcase cards",
      startedAt: new Date().toISOString(),
      commit: "abc",
      baseBranch: "master",
      stagedFiles: [],
      unstagedFiles: ["src/pages/Unrelated.tsx"],
      untrackedFiles: [],
      fileHashes: {
        "src/pages/Unrelated.tsx": "hash-unrelated",
      },
    };

    const result = filterSessionChanges({
      session,
      currentDirtyFiles: ["src/pages/Unrelated.tsx", "src/components/ShowcaseCard.tsx"],
      currentHashes: {
        "src/pages/Unrelated.tsx": "hash-unrelated",
        "src/components/ShowcaseCard.tsx": "hash-new",
      },
    });

    expect(result.changedFiles).toEqual(["src/components/ShowcaseCard.tsx"]);
    expect(result.excludedPreexisting).toEqual(["src/pages/Unrelated.tsx"]);
  });

  it("includes preexisting files when their hash changes during the task", () => {
    const session: TaskSession = {
      task: "t",
      startedAt: new Date().toISOString(),
      commit: "abc",
      baseBranch: "master",
      stagedFiles: [],
      unstagedFiles: ["a.ts"],
      untrackedFiles: [],
      fileHashes: { "a.ts": "old" },
    };
    const result = filterSessionChanges({
      session,
      currentDirtyFiles: ["a.ts"],
      currentHashes: { "a.ts": "new" },
    });
    expect(result.changedFiles).toEqual(["a.ts"]);
  });
});

describe("windows path handling", () => {
  it("normalizes backslashes", () => {
    expect(normalizeRepoPath("src\\components\\Card.tsx")).toBe("src/components/Card.tsx");
  });
});

describe("dependency traversal limits", () => {
  it("respects forward depth and reverse depth on fixtures", () => {
    const seed = ["src/pages/Components.tsx"];
    const forward = buildForwardDeps(seed, 2, FIXTURE_ROOT);
    expect(forward.deps.some((d) => d.includes("ShowcaseCard"))).toBe(true);

    const reverse = buildReverseDeps(
      ["src/components/ShowcaseCard.tsx"],
      1,
      FIXTURE_ROOT,
      undefined,
      ["src"]
    );
    expect(reverse.deps.some((d) => d.includes("Components.tsx"))).toBe(true);

    const shallow = buildForwardDeps(seed, 0, FIXTURE_ROOT);
    expect(shallow.deps.length).toBe(0);
  });
});

describe("route mapping", () => {
  it("maps changed component route and excludes unrelated", () => {
    const appSource = fs.readFileSync(path.join(FIXTURE_ROOT, "src/App.tsx"), "utf8");
    const parsed = parseRoutesFromSource(appSource);
    expect(parsed.map((r) => r.path)).toContain("/components");
    expect(parsed.map((r) => r.path)).toContain("/unrelated");

    const routes = loadRouteMap(FIXTURE_ROOT, "src/App.tsx");
    const match = routesForChangedFiles(
      ["src/pages/Components.tsx", "src/components/ShowcaseCard.tsx"],
      routes,
      2
    );
    expect(match.included).toContain("/components");
    expect(match.included).not.toContain("/unrelated");
  });
});

describe("related test selection", () => {
  it("finds colocated / named tests without selecting everything", () => {
    const result = selectRelatedTests(["src/utils/markdown.ts"], {
      root: process.cwd(),
      maxTests: 5,
    });
    expect(result.tests.some((t) => t.includes("markdown"))).toBe(true);
    expect(result.tests.length).toBeLessThanOrEqual(5);
  });
});

describe("screenshot and AI budgets", () => {
  it("enforces screenshot budget", () => {
    const desired = Array.from({ length: 10 }, (_, i) => ({
      route: `/r${i}`,
      viewport: { name: "mobile", width: 390, height: 844 },
    }));
    const { included, excluded } = enforceScreenshotBudget(desired, 6);
    expect(included).toHaveLength(6);
    expect(excluded).toHaveLength(4);
  });

  it("plans repairs and terminates when iteration budget exhausted", () => {
    const findings: Finding[] = [
      {
        id: "1",
        severity: "high",
        confidence: 0.9,
        category: "overflow",
        explanation: "overflow",
        recommendedFix: "fix width",
        source: "deterministic",
      },
    ];
    const exhausted = planRepairs(findings, 2, 2);
    expect(exhausted.actions).toHaveLength(0);
    const active = planRepairs(findings, 2, 0);
    expect(active.actions.length).toBeGreaterThan(0);
  });
});

describe("GitHub Pages base-path handling", () => {
  it("joins urls with base path and supports hash router", () => {
    const cfg = defaultConfig();
    cfg.app.url = "http://localhost:4173";
    cfg.app.basePath = "/repository-name/";
    expect(joinAppUrl(cfg, "/components")).toBe("http://localhost:4173/repository-name/components");
    cfg.githubPages.usesHashRouter = true;
    expect(joinAppUrl(cfg, "/components")).toBe(
      "http://localhost:4173/repository-name/#/components"
    );
  });

  it("root user site uses plain paths", () => {
    const cfg = defaultConfig();
    cfg.app.url = "http://localhost:1111";
    cfg.app.basePath = "/";
    expect(joinAppUrl(cfg, "/about")).toBe("http://localhost:1111/about");
  });
});

describe("quality gates and report accuracy", () => {
  it("fails on unresolved high-confidence findings", () => {
    const scope = {
      task: "t",
      sessionPresent: true,
      changedFiles: ["a.tsx"],
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
      mode: "fast" as const,
    };
    const { passed, gates } = evaluateQualityGates({
      scope,
      findings: [
        {
          id: "x",
          severity: "high",
          confidence: 0.9,
          category: "overlap",
          explanation: "overlap",
          source: "deterministic",
        },
      ],
      relatedTestsPassed: true,
      lintPassed: true,
      typecheckPassed: true,
      runtimeErrors: false,
      failedNetwork: false,
      brokenAssets: false,
      primaryInteractionBroken: false,
    });
    expect(passed).toBe(false);
    expect(gates.find((g) => g.name === "unresolved-high-confidence")?.passed).toBe(false);
  });

  it("renders scoped wording and never entire-app claim", () => {
    const report = {
      wording: "Verification completed for the current task scope.",
      task: "Improve component showcase cards",
      mode: "fast",
      session: null,
      changedFiles: ["src/components/ShowcaseCard.tsx"],
      componentsReviewed: ["src/components/ShowcaseCard.tsx"],
      routesReviewed: ["/components"],
      routesNotOpened: ["/unrelated"],
      inclusionReasons: {
        "src/components/ShowcaseCard.tsx": "Created or modified during current task session",
      },
      excludedFiles: ["src/pages/Unrelated.tsx (pre-existing dirty file; unchanged during task)"],
      excludedRoutes: ["/unrelated"],
      testsExecuted: [],
      checksSkipped: [],
      interactionsExecuted: [],
      screenshots: [],
      issuesFound: [],
      repairsApplied: [],
      remainingIssues: [],
      riskBasedExpansion: [],
      cache: { hits: 1, misses: 0, keys: ["abc"] },
      screenshotUsage: { used: 2, budget: 6 },
      aiCallsUsed: { used: 0, budget: 1 },
      estimatedTokenUsage: 0,
      gates: [],
      gatesPassed: true,
      budgetExhausted: false,
      completedAt: new Date().toISOString(),
      checkResults: [],
    } as ReviewReport;

    const md = renderMarkdown(report);
    expect(md).toContain("Verification completed for the current task scope.");
    expect(md).not.toContain("The entire application has been verified.");
    expect(md).toContain("/components");
    expect(md).toContain("/unrelated");
  });

  it("merges duplicate findings", () => {
    const merged = mergeFindings([
      {
        id: "1",
        severity: "high",
        confidence: 0.7,
        category: "overlap",
        selector: "x",
        explanation: "same",
        source: "deterministic",
      },
      {
        id: "2",
        severity: "high",
        confidence: 0.9,
        category: "overlap",
        selector: "x",
        explanation: "same",
        source: "deterministic",
      },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].confidence).toBe(0.9);
  });
});

describe("cache reuse", () => {
  it("returns cached dependency graphs", () => {
    const dir = path.join(process.cwd(), ".autoreview", "cache");
    fs.mkdirSync(dir, { recursive: true });
    const cache = new ReviewCache(dir);
    const key = cache.key({ kind: "test", n: 1 });
    cache.set(key, { ok: true });
    expect(cache.get<{ ok: boolean }>(key)).toEqual({ ok: true });
    expect(cache.stats.hits).toBeGreaterThan(0);
  });
});

describe("risk-based expansion", () => {
  it("flags high-risk files via isHighRiskFile contract in dependency module", async () => {
    const { isHighRiskFile } = await import("../src/dependency-scope.ts");
    expect(isHighRiskFile("src/App.tsx")).toBe(true);
    expect(isHighRiskFile("src/components/ShowcaseCard.tsx")).toBe(false);
  });
});
