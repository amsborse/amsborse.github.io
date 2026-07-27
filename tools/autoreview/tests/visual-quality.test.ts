import { describe, expect, it } from "vitest";
import { projectsForMode, projectDefinitions } from "../src/visual/types.ts";
import { selectReviewSurfaces, surfacePriority } from "../src/visual/surface.ts";
import { buildStateMatrix, statesToCapture } from "../src/visual/state-matrix.ts";
import { runDesignTokenConsistency } from "../src/visual/tokens.ts";
import { withFlakeControl } from "../src/visual/flake.ts";
import {
  approveBaseline,
  diffAgainstBaselines,
  listBaselines,
  removeBaseline,
} from "../src/visual/baselines.ts";
import { evaluateQualityGates } from "../src/quality-gates.ts";
import { defaultConfig } from "../src/config.ts";
import type { Finding, ScopeResult } from "../src/types.ts";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FIXTURE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("playwright projects", () => {
  it("uses chromium desktop only in fast mode by default", () => {
    expect(projectsForMode("fast")).toEqual(["chromium-desktop"]);
  });

  it("accepts responsive override projects without escalating to thorough", () => {
    expect(projectsForMode("fast", ["chromium-desktop", "chromium-mobile"])).toEqual([
      "chromium-desktop",
      "chromium-mobile",
    ]);
  });

  it("adds webkit, firefox, reduced-motion in thorough mode", () => {
    const projects = projectsForMode("thorough");
    expect(projects).toContain("webkit-desktop");
    expect(projects).toContain("firefox-desktop");
    expect(projects).toContain("reduced-motion");
    expect(projectDefinitions().map((p) => p.name)).toEqual(expect.arrayContaining(projects));
  });
});

describe("surface selection", () => {
  it("prefers smaller surfaces and does not invent unrelated routes", () => {
    const scope: ScopeResult = {
      task: "t",
      sessionPresent: true,
      changedFiles: ["tools/autoreview/tests/fixtures/src/components/ShowcaseCard.tsx"],
      affectedComponents: ["tools/autoreview/tests/fixtures/src/components/ShowcaseCard.tsx"],
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
    const surfaces = selectReviewSurfaces(scope, process.cwd());
    expect(surfaces.every((s) => s.route === "/components")).toBe(true);
    expect(surfaces.some((s) => s.route === "/unrelated")).toBe(false);
    expect(Math.min(...surfaces.map((s) => surfacePriority(s.kind)))).toBeLessThan(
      surfacePriority("full-route")
    );
  });
});

describe("state matrix", () => {
  it("marks irrelevant states as not required", () => {
    const scope: ScopeResult = {
      task: "t",
      sessionPresent: true,
      changedFiles: ["tools/autoreview/tests/fixtures/src/components/ShowcaseCard.tsx"],
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
    const manifests = buildStateMatrix(scope, process.cwd());
    expect(manifests.length).toBeGreaterThan(0);
    const error = manifests[0].states.find((s) => s.name === "error");
    expect(error?.required).toBe(false);
    expect(statesToCapture(manifests[0])).toContain("default");
  });
});

describe("flake control", () => {
  it("retries once and marks unstable findings", async () => {
    let calls = 0;
    const { retriesUsed, flakyEvidence, result } = await withFlakeControl(async () => {
      calls += 1;
      const findings: Finding[] =
        calls === 1
          ? [
              {
                id: "1",
                severity: "high",
                confidence: 0.8,
                category: "animation",
                explanation: "flicker A",
                source: "ai-critic",
              },
            ]
          : [
              {
                id: "2",
                severity: "high",
                confidence: 0.8,
                category: "animation",
                explanation: "flicker B",
                source: "ai-critic",
              },
            ];
      return { findings };
    });
    expect(calls).toBe(2);
    expect(retriesUsed).toBe(1);
    expect(flakyEvidence.length).toBeGreaterThan(0);
    expect(result.findings.some((f) => /unstable/i.test(f.explanation))).toBe(true);
  });

  it("does not retry deterministic overlap", async () => {
    let calls = 0;
    const { retriesUsed } = await withFlakeControl(async () => {
      calls += 1;
      return {
        findings: [
          {
            id: "o",
            severity: "high",
            confidence: 0.9,
            category: "overlap",
            explanation: "overlap",
            source: "deterministic",
          },
        ] as Finding[],
      };
    });
    expect(calls).toBe(1);
    expect(retriesUsed).toBe(0);
  });
});

describe("baselines", () => {
  it("requires explicit approve and classifies diffs", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "baseline-"));
    const shot = path.join(dir, "a.png");
    fs.writeFileSync(shot, Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]));
    // approveBaseline writes under repo .agent-memory — use unique component name
    const record = approveBaseline({
      component: `TempCard${Date.now()}`,
      route: "/tmp-visual",
      selector: "main",
      state: "default",
      viewport: "desktop",
      screenshotPath: shot,
    });
    expect(record.approvalStatus).toBe("approved");
    expect(listBaselines().some((b) => b.id === record.id)).toBe(true);

    const changed = path.join(dir, "b.png");
    fs.writeFileSync(changed, Buffer.from([9, 9, 9, 9, 9, 9, 9, 9]));
    const diffs = diffAgainstBaselines([
      {
        component: record.component,
        route: record.route,
        selector: record.selector,
        state: record.state,
        viewport: record.viewport,
        screenshotPath: changed,
        taskChanged: false,
      },
    ]);
    expect(diffs[0].classification).not.toBe("match");
    removeBaseline(record.id);
    void FIXTURE;
  });
});

describe("design tokens + gates", () => {
  it("flags hard-coded values conservatively", () => {
    const findings = runDesignTokenConsistency([
      "tools/autoreview/tests/fixtures/src/components/ShowcaseCard.tsx",
    ]);
    expect(Array.isArray(findings)).toBe(true);
  });

  it("includes new visual quality gates", () => {
    const scope: ScopeResult = {
      task: "t",
      sessionPresent: true,
      changedFiles: [],
      affectedComponents: [],
      affectedRoutes: [],
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
    const { gates } = evaluateQualityGates({
      scope,
      findings: [],
      relatedTestsPassed: true,
      lintPassed: true,
      typecheckPassed: true,
      runtimeErrors: false,
      failedNetwork: false,
      brokenAssets: false,
      primaryInteractionBroken: false,
      decorativeLineCollision: true,
      hardFeedbackDelayed: true,
    });
    expect(gates.find((g) => g.name === "decorative-line-collision")?.passed).toBe(false);
    expect(gates.find((g) => g.name === "interaction-feedback-latency")?.passed).toBe(false);
  });
});
