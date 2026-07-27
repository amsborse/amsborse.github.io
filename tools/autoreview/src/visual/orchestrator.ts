import fs from "node:fs";
import path from "node:path";
import type { Page } from "playwright";
import { firefox, webkit } from "playwright";
import { ROOT, joinAppUrl } from "../config.ts";
import type {
  AutoreviewConfig,
  Finding,
  ReviewMode,
  ScopeResult,
  ScreenshotRecord,
} from "../types.ts";
import {
  DEFAULT_VISUAL_THRESHOLDS,
  projectDefinitions,
  projectsForMode,
  type VisualQualityReport,
  type VisualThresholds,
} from "./types.ts";
import { selectReviewSurfaces } from "./surface.ts";
import { runLayoutGeometryValidation } from "./geometry.ts";
import { runTypographyValidation } from "./typography.ts";
import { runDecorativeLineValidation } from "./decorative-lines.ts";
import { runZIndexValidation } from "./z-index.ts";
import { buildStateMatrix, statesToCapture } from "./state-matrix.ts";
import { measureInteractionTiming } from "./interaction-timing.ts";
import {
  instrumentAnimationSmoothness,
  runAnimationInteractionTests,
  smoothnessToFindings,
} from "./animation-instrument.ts";
import { measureVisualStability } from "./stability.ts";
import { runDesignTokenConsistency } from "./tokens.ts";
import { captureStableElementScreenshot } from "./screenshot-stable.ts";
import { runScopedA11yChecks } from "./a11y.ts";
import { runGitHubPagesValidation } from "./pages-assets.ts";
import { diffAgainstBaselines } from "./baselines.ts";
import { withFlakeControl } from "./flake.ts";
import { filesNeedAnimationReview } from "../animation-review.ts";
import type { CheckPlan } from "../check-plan.ts";

export async function runAdvancedVisualSuite(options: {
  page: Page;
  config: AutoreviewConfig;
  scope: ScopeResult;
  mode: ReviewMode;
  screenshotBudget: number;
  thresholds?: VisualThresholds;
  checkPlan?: CheckPlan;
}): Promise<{
  report: VisualQualityReport;
  findings: Finding[];
  screenshots: ScreenshotRecord[];
}> {
  const thresholds = options.thresholds || DEFAULT_VISUAL_THRESHOLDS;
  const plan = options.checkPlan;
  const projects = projectsForMode(options.mode, plan?.projects);
  const surfaces = selectReviewSurfaces(options.scope);
  const stateMatrices = plan && !plan.runStateMatrix ? [] : buildStateMatrix(options.scope);
  const statesInspected = stateMatrices.length
    ? stateMatrices.flatMap((m) => statesToCapture(m))
    : ["default"];

  const report: VisualQualityReport = {
    projectsExecuted: projects,
    routesOpened: [],
    routesSkipped: [],
    surfaces,
    componentsInspected: [...new Set(surfaces.map((s) => s.component).filter(Boolean) as string[])],
    statesInspected,
    geometryFindings: [],
    decorativeLineFindings: [],
    typographyFindings: [],
    zIndexFindings: [],
    animationTiming: [],
    animationSmoothness: [],
    longTasks: 0,
    layoutShifts: 0,
    crossBrowserDifferences: [],
    baselineComparisons: [],
    flakyEvidence: [],
    traces: [],
    retriesUsed: 0,
    tokenFindings: runDesignTokenConsistency(options.scope.changedFiles),
    a11yFindings: [],
    pagesFindings: [],
  };

  const screenshots: ScreenshotRecord[] = [];
  const allFindings: Finding[] = [...report.tokenFindings];

  // Only open affected routes from surfaces
  const routes = [...new Set(surfaces.map((s) => s.route))];
  report.routesOpened = routes;
  report.routesSkipped = []; // intentionally none beyond scope

  for (const surface of surfaces.slice(0, 6)) {
    const url = joinAppUrl(options.config, surface.route);
    await options.page
      .goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 })
      .catch(() => null);

    const flake = await withFlakeControl(async () => {
      const findings: Finding[] = [];
      if (!plan || plan.runGeometry) {
        const geom = await runLayoutGeometryValidation(
          options.page,
          surface.route,
          surface.selector,
          thresholds
        );
        findings.push(...geom.findings);
        report.geometryFindings.push(...geom.findings);
      }

      if (!plan || plan.runTypography) {
        const type = await runTypographyValidation(
          options.page,
          surface.route,
          surface.selector,
          thresholds
        );
        findings.push(...type);
        report.typographyFindings.push(...type);
      }

      if (!plan || plan.runDecorativeLines) {
        const deco = await runDecorativeLineValidation(
          options.page,
          surface.route,
          surface.selector,
          thresholds
        );
        findings.push(...deco.findings);
        report.decorativeLineFindings.push(...deco.findings);
      }

      if (!plan || plan.runZIndex) {
        const z = await runZIndexValidation(options.page, surface.route, surface.selector);
        findings.push(...z);
        report.zIndexFindings.push(...z);
      }

      if (!plan || plan.runA11y) {
        const a11y = await runScopedA11yChecks(options.page, surface.route, surface.selector);
        findings.push(...a11y);
        report.a11yFindings.push(...a11y);
      }

      const pages = await runGitHubPagesValidation(options.page, surface.route, options.config);
      findings.push(...pages);
      report.pagesFindings.push(...pages);

      return { findings };
    });

    report.retriesUsed += flake.retriesUsed;
    report.flakyEvidence.push(...flake.flakyEvidence);
    allFindings.push(...flake.result.findings);

    // Screenshots for required states (budgeted)
    for (const state of statesInspected.slice(0, 4)) {
      if (screenshots.length >= options.screenshotBudget) break;
      await applyState(options.page, state);
      const id = `${sanitize(surface.route)}_${state}_${screenshots.length}`;
      const filePath = path.join(ROOT, ".autoreview", "screenshots", `${id}.png`);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      const kind = await captureStableElementScreenshot(options.page, surface.selector, filePath, {
        fullPageFallback: surface.kind === "full-route",
      });
      if (kind === "failed") continue;
      screenshots.push({
        id,
        path: path.relative(ROOT, filePath).replace(/\\/g, "/"),
        changedSourceFile: surface.changedFile,
        component: surface.component,
        route: surface.route,
        selector: surface.selector,
        viewport: {
          name: state === "mobile" ? "mobile" : "desktop",
          width: state === "mobile" ? 390 : 1440,
          height: state === "mobile" ? 844 : 900,
        },
        reason: `Scoped ${surface.kind} capture for state=${state}: ${surface.reason}`,
      });
    }

    // Interaction timing + animation if relevant
    const needsAnim =
      (plan?.runAnimation ?? true) &&
      filesNeedAnimationReview(options.scope.changedFiles).length > 0;
    const runTiming = !plan || plan.runAnimation || plan.profile === "default";
    const btn = options.page.locator("button, [role='button']").first();
    if (runTiming && (await btn.count())) {
      const timing = await measureInteractionTiming(
        options.page,
        `${surface.component || "ui"}-click`,
        async () => {
          await btn.click({ timeout: 3000 }).catch(() => undefined);
        },
        thresholds
      );
      report.animationTiming.push(timing);
      for (const w of timing.warnings) {
        const hard =
          timing.inputToFeedbackMs != null && timing.inputToFeedbackMs > thresholds.hardFeedbackMs;
        allFindings.push({
          id: `timing-${allFindings.length}`,
          severity: hard ? "high" : "medium",
          confidence: 0.7,
          category: "interaction",
          route: surface.route,
          explanation: w,
          recommendedFix: "Reduce input-to-feedback latency for primary interactions.",
          source: "deterministic",
        });
      }

      if (needsAnim) {
        const smooth = await instrumentAnimationSmoothness(
          options.page,
          `${surface.component || "ui"}-anim`,
          async () => {
            await btn.click({ timeout: 3000 }).catch(() => undefined);
          }
        );
        report.animationSmoothness.push(smooth);
        report.longTasks += smooth.longTasksAbove50ms;
        report.layoutShifts += smooth.layoutShiftCount;
        allFindings.push(...smoothnessToFindings(smooth, surface.route));
      }

      const stability = await measureVisualStability(
        options.page,
        surface.route,
        async () => {
          await btn.click({ timeout: 2000 }).catch(() => undefined);
        },
        thresholds
      );
      report.layoutShifts += stability.cls > 0 ? 1 : 0;
      allFindings.push(...stability.findings);
    }

    if (needsAnim) {
      allFindings.push(...(await runAnimationInteractionTests(options.page, options.scope)));
    }
  }

  // Cross-browser only when thorough or explicit cross-browser check — never auto
  const runCross = (plan?.runCrossBrowser || options.mode === "thorough") && routes[0];
  if (runCross && routes[0]) {
    const defs = projectDefinitions().filter((d) => projects.includes(d.name));
    const baselineTitle = await options.page.title().catch(() => "");
    for (const def of defs) {
      if (def.browser === "chromium") continue;
      try {
        const browserType = def.browser === "firefox" ? firefox : webkit;
        const b = await browserType.launch({ headless: true });
        const ctx = await b.newContext({
          viewport: { width: def.viewport.width, height: def.viewport.height },
          reducedMotion: def.reducedMotion ? "reduce" : undefined,
        });
        const p = await ctx.newPage();
        await p.goto(joinAppUrl(options.config, routes[0]), {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });
        const title = await p.title();
        if (baselineTitle && title && title !== baselineTitle) {
          report.crossBrowserDifferences.push(
            `${def.name}: title "${title}" differs from chromium "${baselineTitle}"`
          );
        }
        await b.close();
      } catch (err) {
        report.crossBrowserDifferences.push(`${def.name}: skipped (${String(err).slice(0, 120)})`);
      }
    }

    // reduced-motion chromium project
    if (projects.includes("reduced-motion")) {
      await options.page.emulateMedia({ reducedMotion: "reduce" });
      await options.page
        .goto(joinAppUrl(options.config, routes[0]), {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        })
        .catch(() => null);
      if (filesNeedAnimationReview(options.scope.changedFiles).length) {
        allFindings.push({
          id: `reduced-motion-check`,
          severity: "medium",
          confidence: 0.6,
          category: "animation",
          route: routes[0],
          explanation:
            "Reduced-motion project executed for newly changed animation code — verify substantial motion is muted.",
          recommendedFix: "Honor prefers-reduced-motion for substantial animations.",
          source: "deterministic",
        });
      }
      await options.page.emulateMedia({ reducedMotion: "no-preference" });
    }
  }

  // Baseline comparisons only when thorough / baseline check / explicitly enabled
  if (!plan || plan.runBaseline || options.mode === "thorough") {
    report.baselineComparisons = diffAgainstBaselines(
      screenshots.map((s) => ({
        component: s.component,
        route: s.route,
        selector: s.selector,
        state: s.reason.includes("state=")
          ? s.reason.split("state=")[1]?.split(/[:\s]/)[0]
          : "default",
        viewport: s.viewport.name,
        screenshotPath: path.join(ROOT, s.path),
        taskChanged: true,
      }))
    );
    for (const diff of report.baselineComparisons) {
      if (
        diff.classification === "unexpected-regression" ||
        diff.classification === "requires-human-review"
      ) {
        allFindings.push({
          id: `baseline-${diff.baselineId}`,
          severity: "high",
          confidence: 0.85,
          category: "layout",
          explanation: `Baseline ${diff.baselineId}: ${diff.details}`,
          recommendedFix:
            "Inspect regression or update baseline via review:baseline:approve after explicit approval.",
          source: "deterministic",
        });
      }
    }
  }

  writeVisualReport(report);
  return { report, findings: allFindings, screenshots };
}

async function applyState(page: Page, state: string): Promise<void> {
  if (state === "mobile") {
    await page.setViewportSize({ width: 390, height: 844 });
  } else if (state === "desktop") {
    await page.setViewportSize({ width: 1440, height: 900 });
  } else if (state === "reduced-motion") {
    await page.emulateMedia({ reducedMotion: "reduce" });
  } else if (state === "hover") {
    const t = page.locator("button, a, [data-testid]").first();
    if (await t.count()) await t.hover().catch(() => undefined);
  } else if (state === "focus-visible") {
    await page.keyboard.press("Tab").catch(() => undefined);
  }
}

function sanitize(route: string): string {
  return route.replace(/[^\w.-]+/g, "_") || "root";
}

function writeVisualReport(report: VisualQualityReport): void {
  const dir = path.join(ROOT, ".autoreview", "reports");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "visual-quality.json"), JSON.stringify(report, null, 2), "utf8");
}
