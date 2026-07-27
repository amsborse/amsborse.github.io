import fs from "node:fs";
import path from "node:path";
import { loadConfig, resolveMode, ROOT } from "./config.ts";
import { ReviewCache } from "./cache.ts";
import { buildScope, writeScopeReport } from "./scope-builder.ts";
import { closeBrowserSession, openScopedBrowser } from "./browser-runner.ts";
import { captureScopedScreenshots } from "./screenshot-runner.ts";
import { inferInteractions, runInteractions } from "./interaction-runner.ts";
import { runDeterministicChecks } from "./deterministic-checks.ts";
import { runVisualCritic } from "./visual-review.ts";
import { runAnimationReview } from "./animation-review.ts";
import { applyHighConfidenceRepairs, planRepairs } from "./repair-planner.ts";
import { evaluateQualityGates } from "./quality-gates.ts";
import { collectScopeFingerprint, writeScopeFingerprint } from "./agent-finish.ts";
import {
  mergeFindings,
  writeReports,
  deriveFinalStatus,
  detectGitState,
  buildFileChangeTable,
  printAgentSummary,
} from "./report.ts";
import {
  buildCheckPlan,
  parseChecksFlag,
  recommendOptionalChecks,
  type CheckPlan,
} from "./check-plan.ts";
import {
  needsBuildCheck,
  runRelatedTests,
  runScopedLint,
  runScopedPrettier,
  runScopedTypecheck,
} from "./static-checks.ts";
import { readSession } from "./session.ts";
import { loadRouteMap } from "./route-scope.ts";
import { initAgentMemory } from "./memory/init.ts";
import { retrieveMemory } from "./memory/retrieve.ts";
import { addFeedbackFromFile } from "./memory/feedback.ts";
import { runAdvancedVisualSuite } from "./visual/orchestrator.ts";
import { DEFAULT_VISUAL_THRESHOLDS } from "./visual/types.ts";
import { filesNeedAnimationReview } from "./animation-review.ts";
import type { CheckResult, Finding, ReviewMode, ReviewReport, ScreenshotRecord } from "./types.ts";

function inferComponentsFromFiles(files: string[]): string[] {
  const names = new Set<string>();
  for (const file of files) {
    const base = path.posix.basename(file).replace(/\.(tsx?|jsx?)$/, "");
    if (/^[A-Z]/.test(base) || /(Card|Button|Panel|Modal|Layout|Hero|Nav)/.test(base)) {
      names.add(base);
    }
  }
  return [...names];
}

export async function runReview(options: {
  mode?: string;
  checks?: string;
  files?: string[];
  skipBrowser?: boolean;
  startServer?: boolean;
}): Promise<ReviewReport> {
  const startedAt = new Date().toISOString();
  const reviewStarted = Date.now();
  const config = await loadConfig();
  // Default is always fast unless --mode thorough|deterministic is explicit.
  // Targeted --checks never escalate to thorough.
  const mode: ReviewMode = resolveMode(config, options.mode || "fast");
  const checksProfile = parseChecksFlag(options.checks);
  const cache = new ReviewCache();

  initAgentMemory();

  const scope = buildScope({
    config,
    mode: mode === "thorough" ? "thorough" : "fast",
    explicitFiles: options.files,
    cache,
  });
  writeScopeReport(scope);

  const checkPlan: CheckPlan = buildCheckPlan({ mode, profile: checksProfile, scope });
  if (checkPlan.maxScreenshots != null) {
    scope.budgetsApplied.maxScreenshots = Math.min(
      scope.budgetsApplied.maxScreenshots,
      checkPlan.maxScreenshots
    );
  }
  if (checkPlan.maxAiCriticCalls != null) {
    scope.budgetsApplied.maxAiCriticCalls = checkPlan.maxAiCriticCalls;
  }
  // Thorough repair iterations only when thorough explicitly requested
  if (mode !== "thorough") {
    scope.budgetsApplied.maxRepairIterations = Math.min(
      scope.budgetsApplied.maxRepairIterations,
      2
    );
  }

  const checksSkipped: Array<{ name: string; reason: string }> = [];
  const checkResults: CheckResult[] = [];
  let findings: Finding[] = [];
  let screenshots: ScreenshotRecord[] = [];
  let interactionsExecuted: string[] = [];
  let testsExecuted: string[] = [];
  let aiCallsUsed = 0;
  const repairsApplied: ReviewReport["repairsApplied"] = [];
  let budgetExhausted = false;

  // Always record expensive modes as skipped when not requested
  if (mode !== "thorough" && checksProfile !== "cross-browser") {
    checksSkipped.push({
      name: "Firefox",
      reason: "Cross-browser mode not requested",
    });
    checksSkipped.push({
      name: "WebKit",
      reason: "Cross-browser mode not requested",
    });
  }
  if (mode !== "thorough") {
    checksSkipped.push({
      name: "Thorough animation trace / video",
      reason: "Thorough mode not requested",
    });
  }
  if (
    !scope.changedFiles.some((f) =>
      /App\.tsx|main\.tsx|vite\.config|RootLayout|index\.css/i.test(f)
    )
  ) {
    checksSkipped.push({
      name: "Full test suite",
      reason: "Change was component-scoped (global entrypoints unchanged)",
    });
  }

  const components = inferComponentsFromFiles([...scope.changedFiles, ...scope.affectedComponents]);
  const memory = retrieveMemory({
    components,
    routes: scope.affectedRoutes,
    files: scope.changedFiles,
    task: scope.task,
    tags: scope.changedFiles.some((f) => /animat|motion|framer/i.test(f))
      ? ["animation"]
      : undefined,
  });

  const memorySection: NonNullable<ReviewReport["memory"]> = {
    rulesLoaded: memory.rules.map((r) => `${r.id}: ${r.rule}`),
    historicalDecisionsApplied: memory.decisions.map((d) => `${d.id}: ${d.summary}`),
    newFeedbackCaptured: [],
    rulesCreated: [],
    rulesUpdated: [],
    rejectedPatternsAdded: [],
    conflictsDetected: [],
    rulesRequiringConfirmation: [],
    memoryTokensUsed: memory.tokensUsed,
    applicableByComponent: memory.applicableByComponent,
  };

  let estimatedTokens = memory.tokensUsed;

  // Optional agent-generated feedback ingestion during review
  const feedbackFile = path.join(ROOT, ".autoreview", "feedback", "current.json");
  if (fs.existsSync(feedbackFile)) {
    try {
      const captured = addFeedbackFromFile(feedbackFile);
      memorySection.newFeedbackCaptured.push(captured.feedback.id);
      memorySection.rulesCreated.push(...captured.report.rulesCreated);
      memorySection.rulesUpdated.push(...captured.report.rulesUpdated);
      memorySection.rejectedPatternsAdded.push(...captured.report.rejectedPatternsAdded);
      memorySection.conflictsDetected.push(...captured.report.conflictsDetected);
      memorySection.rulesRequiringConfirmation.push(...captured.report.rulesRequiringConfirmation);
    } catch (err) {
      checksSkipped.push({
        name: "memory-feedback",
        reason: `Failed to ingest ${feedbackFile}: ${String(err)}`,
      });
    }
  }

  // Static — skip heavy suites for targeted visual/animation/a11y-only when profile restricts
  let lint: CheckResult = {
    name: "eslint",
    passed: true,
    skipped: true,
    skipReason: "not run",
  };
  let typecheck: CheckResult = {
    name: "typecheck",
    passed: true,
    skipped: true,
    skipReason: "not run",
  };
  let related: CheckResult = {
    name: "vitest",
    passed: true,
    skipped: true,
    skipReason: "not run",
  };
  const runStatic =
    checksProfile === "default" || checksProfile === "accessibility" || mode === "thorough";
  if (runStatic) {
    lint = runScopedLint(scope.changedFiles);
    checkResults.push(lint);
    findings.push(...(lint.findings ?? []));
    if (lint.skipped) checksSkipped.push({ name: lint.name, reason: lint.skipReason || "" });

    const prettier = runScopedPrettier(scope.changedFiles);
    checkResults.push(prettier);
    findings.push(...(prettier.findings ?? []));

    typecheck = runScopedTypecheck(scope.changedFiles);
    checkResults.push(typecheck);
    findings.push(...(typecheck.findings ?? []));

    related = runRelatedTests(scope.affectedTests, false, scope.budgetsApplied.maxTestExecutionMs);
    checkResults.push(related);
    findings.push(...(related.findings ?? []));
    if (!related.skipped) testsExecuted = [...scope.affectedTests];
    else checksSkipped.push({ name: "vitest", reason: related.skipReason || "" });
  } else {
    checksSkipped.push({
      name: "static-checks",
      reason: `Skipped for targeted --checks ${checksProfile}`,
    });
  }

  if (needsBuildCheck(scope.changedFiles)) {
    checksSkipped.push({
      name: "full-build",
      reason:
        "Build-sensitive files changed; prefer `npm run build` separately — not auto-run in fast scoped loop",
    });
  }

  const uiTouched = checkPlan.runBrowser;

  let openedRoutes: string[] = [];
  let runtimeErrors = false;
  let failedNetwork = false;
  let brokenAssets = false;
  let primaryInteractionBroken = false;
  let visualQuality: ReviewReport["visualQuality"];
  let hardFeedbackDelayed = false;
  let animationFinalStateJump = false;
  let stuckAnimation = false;
  let unexpectedLayoutShift = false;
  let baselineRegression = false;
  let missingReducedMotion = false;
  let decorativeLineCollision = false;
  let contentEdgeCollision = false;
  let clippedFocus = false;
  let zIndexObstruction = false;

  if (options.skipBrowser || !uiTouched || mode === "deterministic") {
    checksSkipped.push({
      name: "browser",
      reason: options.skipBrowser
        ? "Browser review skipped by flag"
        : mode === "deterministic"
          ? "Deterministic mode skips browser"
          : "No UI files in scope / check plan disables browser",
    });
  } else {
    let iteration = 0;
    const maxIter = scope.budgetsApplied.maxRepairIterations;
    let stale = new Set<string>([
      "browser",
      "deterministic",
      "screenshots",
      "interactions",
      "animation",
    ]);

    while (iteration <= maxIter) {
      const { session, result } = await openScopedBrowser(config, scope, {
        startServer: options.startServer !== false,
      });
      checkResults.push(result);
      findings.push(...(result.findings ?? []));
      openedRoutes = session.openedRoutes || [];
      runtimeErrors = (session.consoleErrors?.length || 0) + (session.pageErrors?.length || 0) > 0;
      failedNetwork = (session.failedRequests?.length || 0) > 0;
      brokenAssets = (result.findings ?? []).some((f) => f.category === "asset-path");

      if (!session.page || !session.browser) {
        await closeBrowserSession(session);
        break;
      }

      if (stale.has("deterministic")) {
        for (const route of scope.affectedRoutes) {
          const urlOk = openedRoutes.includes(route);
          if (!urlOk) continue;
          try {
            const det = await runDeterministicChecks(session.page, route);
            findings.push(...det.findings);
          } catch {
            /* ignore */
          }
        }
      }

      if (uiTouched) {
        try {
          const advanced = await runAdvancedVisualSuite({
            page: session.page,
            config,
            scope,
            mode,
            screenshotBudget: scope.budgetsApplied.maxScreenshots,
            thresholds: DEFAULT_VISUAL_THRESHOLDS,
            checkPlan,
          });
          findings.push(...advanced.findings);
          if (stale.has("screenshots") || !screenshots.length) {
            screenshots = advanced.screenshots.length ? advanced.screenshots : screenshots;
          }
          visualQuality = {
            projectsExecuted: advanced.report.projectsExecuted,
            routesOpened: advanced.report.routesOpened,
            routesSkipped: advanced.report.routesSkipped,
            componentsInspected: advanced.report.componentsInspected,
            statesInspected: advanced.report.statesInspected,
            geometryFindingCount: advanced.report.geometryFindings.length,
            decorativeLineFindingCount: advanced.report.decorativeLineFindings.length,
            typographyFindingCount: advanced.report.typographyFindings.length,
            animationTiming: advanced.report.animationTiming.map((t) => ({
              interactionId: t.interactionId,
              warnings: t.warnings,
            })),
            longTasks: advanced.report.longTasks,
            layoutShifts: advanced.report.layoutShifts,
            crossBrowserDifferences: advanced.report.crossBrowserDifferences,
            baselineComparisons: advanced.report.baselineComparisons.map((b) => ({
              baselineId: b.baselineId,
              classification: b.classification,
              details: b.details,
            })),
            flakyEvidence: advanced.report.flakyEvidence,
            retriesUsed: advanced.report.retriesUsed,
            traces: advanced.report.traces,
          };
          openedRoutes = [...new Set([...openedRoutes, ...advanced.report.routesOpened])];

          hardFeedbackDelayed = advanced.findings.some(
            (f) =>
              f.category === "interaction" &&
              f.severity === "high" &&
              /hard|feedback|latency/i.test(f.explanation)
          );
          animationFinalStateJump = advanced.findings.some((f) =>
            /final-state jump/i.test(f.explanation)
          );
          stuckAnimation = advanced.findings.some((f) => /stuck after/i.test(f.explanation));
          unexpectedLayoutShift = advanced.findings.some((f) =>
            /layout shift/i.test(f.explanation)
          );
          baselineRegression = advanced.report.baselineComparisons.some(
            (b) =>
              b.classification === "unexpected-regression" ||
              b.classification === "requires-human-review"
          );
          decorativeLineCollision = advanced.report.decorativeLineFindings.some(
            (f) => f.severity === "high" || f.severity === "critical"
          );
          contentEdgeCollision = advanced.report.geometryFindings.some(
            (f) => /content-edge collision/i.test(f.explanation) && f.severity !== "low"
          );
          clippedFocus = advanced.findings.some(
            (f) => f.category === "focus" && /clip/i.test(f.explanation)
          );
          zIndexObstruction = advanced.report.zIndexFindings.some(
            (f) => f.severity === "high" || f.severity === "critical"
          );
          if (
            filesNeedAnimationReview(scope.changedFiles).length &&
            mode === "thorough" &&
            !advanced.report.projectsExecuted.includes("reduced-motion")
          ) {
            missingReducedMotion = true;
          }
        } catch (err) {
          checksSkipped.push({
            name: "advanced-visual",
            reason: `Advanced visual suite error: ${String(err)}`,
          });
        }
      } else if (stale.has("screenshots")) {
        screenshots = await captureScopedScreenshots({
          page: session.page,
          config,
          scope,
          budget: scope.budgetsApplied.maxScreenshots,
        });
      }

      if (stale.has("interactions") && checksProfile !== "baseline") {
        const specs = inferInteractions(scope);
        const ix = await runInteractions({
          page: session.page,
          config,
          interactions: specs,
          budget: scope.budgetsApplied.maxBrowserInteractions,
        });
        checkResults.push(ix.result);
        findings.push(...(ix.result.findings ?? []));
        interactionsExecuted = ix.executed;
        primaryInteractionBroken = (ix.result.findings ?? []).some(
          (f) => f.severity === "high" || f.severity === "critical"
        );
      }

      if (
        stale.has("animation") &&
        (checkPlan.runAnimation || filesNeedAnimationReview(scope.changedFiles).length)
      ) {
        const anim = await runAnimationReview(session.page, scope);
        findings.push(...anim.findings);
      } else if (stale.has("animation") && !checkPlan.runAnimation) {
        checksSkipped.push({
          name: "animation-review",
          reason: "Animation checks not enabled for this mode/profile",
        });
      }

      if (checkPlan.runVisualCritic) {
        const critic = await runVisualCritic({
          config,
          mode,
          scope,
          screenshots,
          deterministic: findings.filter((f) => f.source === "deterministic"),
          cache,
          aiCallsUsed,
          aiBudget: scope.budgetsApplied.maxAiCriticCalls,
          applicableMemory: memory.applicableByComponent,
        });
        aiCallsUsed = critic.aiCallsUsed;
        estimatedTokens += critic.estimatedTokens;
        findings.push(...critic.findings);
        if (critic.skipped) checksSkipped.push({ name: "ai-critic", reason: critic.skipped });
      } else {
        checksSkipped.push({
          name: "ai-critic",
          reason: "Visual critic disabled for this check profile",
        });
      }

      findings = mergeFindings(findings);

      const plan = planRepairs(findings, scope.budgetsApplied.maxRepairIterations, iteration);
      if (!plan.actions.length) {
        await closeBrowserSession(session);
        break;
      }

      const applied = applyHighConfidenceRepairs(plan.actions, scope);
      repairsApplied.push(...applied);
      const anyApplied = applied.some((a) => a.applied);
      if (!anyApplied) {
        await closeBrowserSession(session);
        if (iteration >= maxIter) budgetExhausted = true;
        break;
      }

      stale = new Set(plan.staleEvidence.length ? plan.staleEvidence : ["deterministic"]);
      iteration += 1;
      if (iteration > maxIter) {
        budgetExhausted = true;
        await closeBrowserSession(session);
        break;
      }
      await closeBrowserSession(session);
    }
  }

  findings = mergeFindings(findings);
  const gates = evaluateQualityGates({
    scope,
    findings,
    relatedTestsPassed: related.passed || Boolean(related.skipped),
    lintPassed: lint.passed || Boolean(lint.skipped),
    typecheckPassed: typecheck.passed,
    runtimeErrors,
    failedNetwork,
    brokenAssets,
    primaryInteractionBroken,
    hardFeedbackDelayed,
    animationFinalStateJump,
    stuckAnimation,
    unexpectedLayoutShift,
    baselineRegression,
    missingReducedMotion,
    decorativeLineCollision,
    contentEdgeCollision,
    clippedFocus,
    zIndexObstruction,
  });

  const allRoutes = loadRouteMap().map((r) => r.path);
  const routesNotOpened = allRoutes.filter((r) => !openedRoutes.includes(r));
  const recommendedOptionalChecks = recommendOptionalChecks(scope);
  const session = readSession();
  const browsersUsed = [
    ...new Set(
      (visualQuality?.projectsExecuted || checkPlan.projects).map((p) => {
        if (p.startsWith("chromium") || p === "reduced-motion") return "chromium";
        if (p.startsWith("firefox")) return "firefox";
        if (p.startsWith("webkit")) return "webkit";
        return p;
      })
    ),
  ];
  const viewportsTested = [
    ...new Set(
      (visualQuality?.projectsExecuted || checkPlan.projects)
        .filter((p) => p.includes("mobile") || p.includes("desktop"))
        .map((p) => (p.includes("mobile") ? "mobile" : "desktop"))
    ),
  ];

  const report: ReviewReport = {
    wording: "Verification completed for the current task scope.",
    task: scope.task,
    mode,
    checksProfile,
    session,
    isolationWarning: scope.isolationWarning,
    startedAt: session?.startedAt || startedAt,
    baseBranch: session?.baseBranch || config.baseBranch,
    gitState: detectGitState(),
    fileChangeTable: buildFileChangeTable(scope.changedFiles),
    changedFiles: scope.changedFiles,
    componentsReviewed: scope.affectedComponents,
    routesReviewed: openedRoutes.length ? openedRoutes : scope.affectedRoutes,
    routesNotOpened,
    inclusionReasons: scope.inclusionReasons,
    excludedFiles: scope.excludedFiles,
    excludedRoutes: scope.excludedFiles
      .filter((f) => f.startsWith("route:"))
      .map((f) => f.replace(/^route:/, "").replace(/\s.*/, "")),
    testsExecuted,
    checksSkipped,
    interactionsExecuted,
    viewportsTested,
    browsersUsed,
    statesTested: visualQuality?.statesInspected,
    screenshots,
    issuesFound: findings,
    repairsApplied,
    remainingIssues: findings.filter((f) => !f.repaired),
    riskBasedExpansion: Object.entries(scope.expansionReasons).map(([k, v]) => `${k}: ${v}`),
    recommendedOptionalChecks,
    cache: cache.stats,
    screenshotUsage: {
      used: screenshots.length,
      budget: scope.budgetsApplied.maxScreenshots,
    },
    aiCallsUsed: {
      used: aiCallsUsed,
      budget: scope.budgetsApplied.maxAiCriticCalls,
    },
    estimatedTokenUsage: estimatedTokens,
    testDurationMs: Date.now() - reviewStarted,
    gates: gates.gates,
    gatesPassed: gates.passed,
    budgetExhausted,
    completedAt: new Date().toISOString(),
    checkResults,
    memory: memorySection,
    visualQuality,
  };

  report.finalStatus = deriveFinalStatus(report);
  writeReports(report);
  writeScopeFingerprint(collectScopeFingerprint(report.changedFiles, report.session?.id));
  printAgentSummary(report);
  return report;
}

export function printScopeSummary(scope: ReturnType<typeof buildScope>): void {
  console.log(`Task: ${scope.task}`);
  console.log(`Mode: ${scope.mode}`);
  if (scope.isolationWarning) console.warn(`Warning: ${scope.isolationWarning}`);
  console.log(`Changed files (${scope.changedFiles.length}):`);
  for (const f of scope.changedFiles) console.log(`  - ${f}`);
  console.log(`Affected routes (${scope.affectedRoutes.length}):`);
  for (const r of scope.affectedRoutes) console.log(`  - ${r}`);
  console.log(`Excluded (${scope.excludedFiles.length}):`);
  for (const f of scope.excludedFiles.slice(0, 20)) console.log(`  - ${f}`);
}

// Ensure reports dir exists for module consumers
fs.mkdirSync(path.join(ROOT, ".autoreview", "reports"), { recursive: true });
