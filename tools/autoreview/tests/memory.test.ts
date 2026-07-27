import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initAgentMemory } from "../src/memory/init.ts";
import { addFeedback } from "../src/memory/feedback.ts";
import { retrieveMemory } from "../src/memory/retrieve.ts";
import { extractFeedback } from "../src/memory/extract.ts";
import {
  promoteRule,
  shouldPromoteToComponentRule,
  shouldPromoteToRepositoryRule,
  countRelatedFeedback,
  userSaidEverywhere,
} from "../src/memory/promote.ts";
import { resolveContradiction, rulesConflict } from "../src/memory/contradict.ts";
import { compactMemory } from "../src/memory/compact.ts";
import { loadComponentMemory, rebuildIndex } from "../src/memory/index-builder.ts";
import { renderMarkdown } from "../src/report.ts";
import type { ReviewReport } from "../src/types.ts";
import type { FeedbackRecord, MemoryRule } from "../src/memory/types.ts";

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "agent-memory-"));
}

describe("feedback extraction", () => {
  it("classifies approval and rejection by meaning", () => {
    expect(extractFeedback({ feedback: "This looks good — keep this" }).classification).toBe(
      "approved"
    );
    expect(
      extractFeedback({ feedback: "Still overlapping the numbers on mobile" }).classification
    ).toMatch(/rejected|correction/);
    expect(
      extractFeedback({ feedback: "Do not change the forge sidebar" }).explicitConstraints.length
    ).toBeGreaterThan(0);
  });

  it("does not globalize task-specific feedback automatically", () => {
    const ex = extractFeedback({
      feedback: "The card badge overlaps the heading on mobile. Move it below the title.",
      component: "FeatureCard",
    });
    expect(ex.repositoryRules.length).toBe(0);
    expect(ex.needsUserConfirmation || ex.objectiveIssues.length > 0).toBe(true);
  });
});

describe("memory capture and retrieval", () => {
  let root: string;

  beforeEach(() => {
    root = tempRoot();
    initAgentMemory(root);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("creates component feedback and a rejected pattern", () => {
    const captured = addFeedback(
      {
        feedback: "The action badge overlaps the title on mobile. Move it below the title.",
        component: "FeatureCard",
        route: "/components",
        source: "user-screenshot-feedback",
        task: "Improve component showcase cards",
        viewport: "mobile",
        tags: ["card", "mobile", "overlap"],
        fixApplied: "Place the badge in normal layout flow below the title.",
        filesChanged: ["src/components/FeatureCard.tsx"],
        verificationPassed: true,
        category: "overlap",
        rootCause: "Absolute positioning without reserved layout space.",
      },
      root
    );

    expect(captured.feedback.scope.components).toContain("FeatureCard");
    expect(captured.feedback.scope.repositoryWide).toBe(false);
    expect(captured.decision).toBeTruthy();

    const mem = loadComponentMemory("FeatureCard", root);
    expect(mem.rules.length).toBeGreaterThan(0);
    expect(mem.rules[0].level).not.toBe("repository-rule");

    const anti = fs.readFileSync(path.join(root, ".agent-memory", "anti-patterns.md"), "utf8");
    expect(anti).toMatch(/overlap|badge|Avoid:/i);
  });

  it("retrieves FeatureCard rules and excludes unrelated UnrelatedCard memory", () => {
    addFeedback(
      {
        feedback: "Do not place badges over variable-length titles on FeatureCard.",
        component: "FeatureCard",
        route: "/components",
        verificationPassed: true,
        fixApplied: "Reserve layout space for badges.",
        userApproved: true,
        tags: ["overlap", "card"],
      },
      root
    );
    addFeedback(
      {
        feedback: "Keep forge sparks dramatic and continuous.",
        component: "ForgeCanvas",
        route: "/arsenal/anomaly-matrix",
        userApproved: true,
        tags: ["animation", "forge"],
        fixApplied: "Use continuous spark trails.",
      },
      root
    );

    const scoped = retrieveMemory(
      {
        components: ["FeatureCard"],
        routes: ["/components"],
        tags: ["card", "overlap"],
        task: "Improve FeatureCard",
      },
      root
    );

    expect(scoped.rules.every((r) => !r.component || r.component === "FeatureCard")).toBe(true);
    expect(
      scoped.excluded.some((e) => /ForgeCanvas|unrelated/i.test(e)) ||
        scoped.rules.every((r) => r.component !== "ForgeCanvas")
    ).toBe(true);
    expect(scoped.rules.some((r) => /badge|title|overlap/i.test(r.rule))).toBe(true);
    expect(scoped.tokensUsed).toBeLessThanOrEqual(4000);
  });

  it("promotes to component-rule after repeated corrections", () => {
    const a = addFeedback(
      {
        feedback: "Badge overlaps title on FeatureCard mobile",
        component: "FeatureCard",
        verificationPassed: true,
        fixApplied: "Flow layout for badge",
        tags: ["overlap"],
      },
      root
    );
    addFeedback(
      {
        feedback: "Badge still overlaps title on FeatureCard at narrow width",
        component: "FeatureCard",
        verificationPassed: true,
        fixApplied: "Flow layout for badge",
        tags: ["overlap"],
      },
      root
    );

    const mem = loadComponentMemory("FeatureCard", root);
    const rule = mem.rules.find((r) => r.id === a.decision?.ruleIds[0]) || mem.rules[0];
    const feedbackList = fs
      .readdirSync(path.join(root, ".agent-memory", "feedback", "processed"))
      .map(
        (f) =>
          JSON.parse(
            fs.readFileSync(path.join(root, ".agent-memory", "feedback", "processed", f), "utf8")
          ) as FeedbackRecord
      );
    const count = countRelatedFeedback(feedbackList, "FeatureCard", rule.rule);
    expect(count).toBeGreaterThanOrEqual(2);
    expect(shouldPromoteToComponentRule({ ...rule, level: "observation" }, count)).toBe(true);
    const promoted = promoteRule(rule, "component-rule", "repeated");
    expect(promoted.level).toBe("component-rule");
  });

  it("does not promote to repository-rule from a single component task", () => {
    expect(
      shouldPromoteToRepositoryRule({
        userSaidEverywhere: false,
        confirmedAcrossDistinctComponents: 1,
        confirmedAcrossDistinctTasks: 1,
      })
    ).toBe(false);
    expect(userSaidEverywhere("apply this everywhere across the site")).toBe(true);
  });

  it("handles contradictions without silent overwrite", () => {
    const repo: MemoryRule = {
      id: "repo-min-anim",
      rule: "Prefer minimal animation site-wide",
      reason: "historical",
      confidence: 0.8,
      level: "repository-rule",
      category: "repository-preference",
      tags: ["animation"],
      status: "active",
      supersedes: [],
      createdAt: "",
      updatedAt: "",
    };
    const forge: MemoryRule = {
      id: "forge-dramatic",
      rule: "Prefer dramatic continuous motion in the forge visualization",
      reason: "user: forge should feel alive",
      confidence: 0.95,
      level: "component-rule",
      category: "animation-preference",
      component: "ForgeCanvas",
      tags: ["animation", "forge"],
      status: "active",
      supersedes: [],
      createdAt: "",
      updatedAt: "",
    };
    expect(rulesConflict(repo, forge)).toBe(true);
    const result = resolveContradiction({
      existing: repo,
      incoming: forge,
      task: "Forge motion",
      explicitRecent: true,
    });
    expect(result.conflicting).toBe(true);
    expect(result.resolution).toMatch(/prefer-specific|prefer-recent-explicit/);
  });

  it("compacts duplicate rules while preserving history references", () => {
    addFeedback(
      {
        feedback: "Too crowded FeatureCard text",
        component: "FeatureCard",
        userApproved: true,
        fixApplied: "Reduce descriptive copy",
        tags: ["density"],
      },
      root
    );
    addFeedback(
      {
        feedback: "Too crowded FeatureCard text",
        component: "FeatureCard",
        userApproved: true,
        fixApplied: "Reduce descriptive copy",
        tags: ["density"],
      },
      root
    );
    const report = compactMemory(root);
    expect(report.keptRawReferences.length).toBeGreaterThan(0);
    rebuildIndex(root);
  });
});

describe("memory-aware report", () => {
  it("includes memory section wording", () => {
    const report = {
      wording: "Verification completed for the current task scope.",
      task: "Improve FeatureCard",
      mode: "fast",
      session: null,
      changedFiles: ["src/components/FeatureCard.tsx"],
      componentsReviewed: ["FeatureCard"],
      routesReviewed: ["/components"],
      routesNotOpened: ["/unrelated"],
      inclusionReasons: {},
      excludedFiles: [],
      excludedRoutes: [],
      testsExecuted: [],
      checksSkipped: [],
      interactionsExecuted: [],
      screenshots: [],
      issuesFound: [],
      repairsApplied: [],
      remainingIssues: [],
      riskBasedExpansion: [],
      cache: { hits: 0, misses: 0, keys: [] },
      screenshotUsage: { used: 2, budget: 6 },
      aiCallsUsed: { used: 0, budget: 1 },
      estimatedTokenUsage: 120,
      gates: [],
      gatesPassed: true,
      budgetExhausted: false,
      completedAt: new Date().toISOString(),
      checkResults: [],
      memory: {
        rulesLoaded: ["feature-card-002: Do not overlay badges on titles"],
        historicalDecisionsApplied: ["decision-1: badge flow layout"],
        newFeedbackCaptured: ["feedback-1"],
        rulesCreated: ["feature-card-002"],
        rulesUpdated: [],
        rejectedPatternsAdded: ["anti-1"],
        conflictsDetected: [],
        rulesRequiringConfirmation: [],
        memoryTokensUsed: 220,
        applicableByComponent: {
          FeatureCard: [
            "Keep interactive previews dominant",
            "Do not overlay badges on variable-length titles",
          ],
        },
      },
    } as ReviewReport;

    const md = renderMarkdown(report);
    expect(md).toContain("Repository memory");
    expect(md).toContain("Do not overlay badges");
    expect(md).toContain("Verification completed for the current task scope.");
  });
});
