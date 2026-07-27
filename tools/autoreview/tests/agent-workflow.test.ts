import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  collectScopeFingerprint,
  writeScopeFingerprint,
  isReportStale,
  finishAgentTask,
} from "../src/agent-finish.ts";
import { bootstrapAgentTask, readCurrentTask } from "../src/agent-task.ts";
import { buildCheckPlan } from "../src/check-plan.ts";
import { projectsForMode } from "../src/visual/types.ts";
import { defaultConfig } from "../src/config.ts";
import type { ScopeResult } from "../src/types.ts";
import { ROOT } from "../src/config.ts";

describe("agent task bootstrap", () => {
  it("writes current-task.json and task-context.md", () => {
    const { manifest, printed } = bootstrapAgentTask(
      "Improve FeatureCard overlap on mobile",
      "master"
    );
    expect(manifest.thoroughModeAllowed).toBe(false);
    expect(manifest.crossBrowserAllowed).toBe(false);
    expect(manifest.requiredCompletionCommand).toBe("npm run review:run");
    expect(fs.existsSync(path.join(ROOT, ".autoreview", "current-task.json"))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, ".autoreview", "reports", "task-context.md"))).toBe(true);
    expect(readCurrentTask()?.sessionId).toBe(manifest.sessionId);
    expect(printed).toContain("npm run review:run");
    expect(printed).toContain("Optional checks require explicit request");
  });
});

describe("report freshness", () => {
  const tmp = path.join(os.tmpdir(), `autoreview-fp-${Date.now()}`);

  beforeEach(() => {
    fs.mkdirSync(path.join(tmp, ".autoreview", "reports"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "src"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("marks report stale after fingerprinted source changes", () => {
    const file = path.join(tmp, "src", "Card.tsx");
    fs.writeFileSync(file, "export const A = 1;\n", "utf8");
    const rel = "src/Card.tsx";
    const fp = collectScopeFingerprint([rel], "sess", tmp);
    writeScopeFingerprint(fp, tmp);
    fs.writeFileSync(
      path.join(tmp, ".autoreview", "reports", "latest.json"),
      JSON.stringify({ gatesPassed: true }),
      "utf8"
    );

    expect(isReportStale(tmp).stale).toBe(false);

    fs.writeFileSync(file, "export const A = 2;\n", "utf8");
    const stale = isReportStale(tmp);
    expect(stale.stale).toBe(true);
    expect(stale.changedSinceReport).toContain(rel);
  });
});

describe("agent finish refuses stale verification", () => {
  it("returns non-zero when no report fingerprint exists", () => {
    // Ensure latest may exist from prior runs but fingerprint miss → treated carefully.
    // finishAgentTask uses ROOT; wipe fingerprint only for this assertion via direct check.
    const reports = path.join(ROOT, ".autoreview", "reports");
    const fpPath = path.join(reports, "scope-fingerprint.json");
    const had = fs.existsSync(fpPath) ? fs.readFileSync(fpPath, "utf8") : null;
    try {
      if (fs.existsSync(fpPath)) fs.unlinkSync(fpPath);
      const result = finishAgentTask();
      // Either no session, or stale fingerprint
      expect(result.ok).toBe(false);
      expect(result.exitCode).toBe(1);
    } finally {
      if (had) fs.writeFileSync(fpPath, had, "utf8");
    }
  });
});

describe("fast mode never includes firefox/webkit", () => {
  it("projectsForMode fast excludes other browsers", () => {
    expect(projectsForMode("fast")).not.toContain("firefox-desktop");
    expect(projectsForMode("fast")).not.toContain("webkit-desktop");
  });

  it("cross-browser check plan includes them only when explicit", () => {
    const scope: ScopeResult = {
      task: "t",
      sessionPresent: true,
      changedFiles: ["src/components/Nav.tsx"],
      affectedComponents: [],
      affectedRoutes: ["/"],
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
    const plan = buildCheckPlan({
      mode: "fast",
      profile: "cross-browser",
      scope,
    });
    expect(plan.projects).toContain("firefox-desktop");
    expect(plan.projects).toContain("webkit-desktop");
    expect(plan.mode).toBe("fast");
  });
});
