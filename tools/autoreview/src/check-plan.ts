import type { ReviewMode, ScopeResult } from "./types.ts";
import type { PlaywrightProjectName } from "./visual/types.ts";

export type CheckProfile =
  | "default"
  | "visual"
  | "animation"
  | "accessibility"
  | "responsive"
  | "cross-browser"
  | "baseline";

export interface CheckPlan {
  profile: CheckProfile;
  mode: ReviewMode;
  runBrowser: boolean;
  runGeometry: boolean;
  runTypography: boolean;
  runDecorativeLines: boolean;
  runZIndex: boolean;
  runA11y: boolean;
  runAnimation: boolean;
  runResponsive: boolean;
  runCrossBrowser: boolean;
  runBaseline: boolean;
  runStateMatrix: boolean;
  runVisualCritic: boolean;
  runTraces: boolean;
  runVideos: boolean;
  projects: PlaywrightProjectName[];
  maxScreenshots?: number;
  maxAiCriticCalls?: number;
}

const HIGH_RISK =
  /RootLayout|index\.css|globals|vite\.config|App\.tsx|main\.tsx|router|BrowserRouter|HashRouter|sticky|fixed|framer-motion|gsap|@keyframes|three|canvas|webgl|drag|scroll|dropdown|modal|nav|VITE_BASE|\.github\/workflows/i;

export function parseChecksFlag(raw?: string): CheckProfile {
  if (!raw) return "default";
  const v = raw.toLowerCase().trim();
  if (
    v === "visual" ||
    v === "animation" ||
    v === "accessibility" ||
    v === "responsive" ||
    v === "cross-browser" ||
    v === "baseline"
  ) {
    return v;
  }
  return "default";
}

export function responsiveUiChanged(changedFiles: string[], rootContentHints?: string[]): boolean {
  if (changedFiles.some((f) => /responsive|mobile|breakpoint|media/i.test(f))) return true;
  for (const hint of rootContentHints || []) {
    if (/@media|sm:|md:|lg:|xl:|max-w-|min-w-|viewport/i.test(hint)) return true;
  }
  // CSS/layout pages often imply responsive review
  return changedFiles.some((f) => /\.(css|scss)$/.test(f) || /layout\//i.test(f));
}

export function buildCheckPlan(input: {
  mode: ReviewMode;
  profile: CheckProfile;
  scope: ScopeResult;
  responsiveChanged?: boolean;
}): CheckPlan {
  const { mode, profile, scope } = input;
  const responsive = input.responsiveChanged ?? responsiveUiChanged(scope.changedFiles);
  const uiTouched = scope.changedFiles.some(
    (f) => /\.(tsx|jsx|css|scss)$/.test(f) || f.includes("/pages/") || f.includes("/components/")
  );
  const animTouched = scope.changedFiles.some((f) =>
    /animat|motion|framer|gsap|keyframes|transition/i.test(f)
  );

  if (profile === "visual") {
    return {
      profile,
      mode: "fast",
      runBrowser: true,
      runGeometry: true,
      runTypography: true,
      runDecorativeLines: true,
      runZIndex: true,
      runA11y: false,
      runAnimation: false,
      runResponsive: responsive,
      runCrossBrowser: false,
      runBaseline: false,
      runStateMatrix: false,
      runVisualCritic: true,
      runTraces: false,
      runVideos: false,
      projects: responsive ? ["chromium-desktop", "chromium-mobile"] : ["chromium-desktop"],
      maxScreenshots: 6,
      maxAiCriticCalls: 1,
    };
  }

  if (profile === "animation") {
    return {
      profile,
      mode: "fast",
      runBrowser: true,
      runGeometry: false,
      runTypography: false,
      runDecorativeLines: false,
      runZIndex: false,
      runA11y: false,
      runAnimation: true,
      runResponsive: false,
      runCrossBrowser: false,
      runBaseline: false,
      runStateMatrix: false,
      runVisualCritic: false,
      runTraces: false,
      runVideos: false,
      projects: ["chromium-desktop", "reduced-motion"],
      maxScreenshots: 4,
      maxAiCriticCalls: 0,
    };
  }

  if (profile === "accessibility") {
    return {
      profile,
      mode: "fast",
      runBrowser: true,
      runGeometry: false,
      runTypography: false,
      runDecorativeLines: false,
      runZIndex: false,
      runA11y: true,
      runAnimation: false,
      runResponsive: false,
      runCrossBrowser: false,
      runBaseline: false,
      runStateMatrix: false,
      runVisualCritic: false,
      runTraces: false,
      runVideos: false,
      projects: ["chromium-desktop"],
      maxAiCriticCalls: 0,
    };
  }

  if (profile === "responsive") {
    return {
      profile,
      mode: "fast",
      runBrowser: true,
      runGeometry: true,
      runTypography: true,
      runDecorativeLines: false,
      runZIndex: false,
      runA11y: false,
      runAnimation: false,
      runResponsive: true,
      runCrossBrowser: false,
      runBaseline: false,
      runStateMatrix: false,
      runVisualCritic: false,
      runTraces: false,
      runVideos: false,
      projects: ["chromium-desktop", "chromium-mobile"],
      maxAiCriticCalls: 0,
    };
  }

  if (profile === "cross-browser") {
    return {
      profile,
      mode: "fast",
      runBrowser: true,
      runGeometry: true,
      runTypography: false,
      runDecorativeLines: false,
      runZIndex: false,
      runA11y: false,
      runAnimation: false,
      runResponsive: false,
      runCrossBrowser: true,
      runBaseline: false,
      runStateMatrix: false,
      runVisualCritic: false,
      runTraces: false,
      runVideos: false,
      projects: ["chromium-desktop", "firefox-desktop", "webkit-desktop"],
      maxAiCriticCalls: 0,
    };
  }

  if (profile === "baseline") {
    return {
      profile,
      mode: "fast",
      runBrowser: true,
      runGeometry: false,
      runTypography: false,
      runDecorativeLines: false,
      runZIndex: false,
      runA11y: false,
      runAnimation: false,
      runResponsive: responsive,
      runCrossBrowser: false,
      runBaseline: true,
      runStateMatrix: false,
      runVisualCritic: false,
      runTraces: false,
      runVideos: false,
      projects: responsive ? ["chromium-desktop", "chromium-mobile"] : ["chromium-desktop"],
      maxAiCriticCalls: 0,
    };
  }

  // default / fast / thorough
  if (mode === "thorough") {
    return {
      profile: "default",
      mode,
      runBrowser: uiTouched,
      runGeometry: true,
      runTypography: true,
      runDecorativeLines: true,
      runZIndex: true,
      runA11y: true,
      runAnimation: true,
      runResponsive: true,
      runCrossBrowser: true,
      runBaseline: true,
      runStateMatrix: true,
      runVisualCritic: true,
      runTraces: true,
      runVideos: true,
      projects: [
        "chromium-desktop",
        "chromium-mobile",
        "webkit-desktop",
        "firefox-desktop",
        "reduced-motion",
      ],
    };
  }

  // fast default — Chromium only; mobile only if responsive changed
  return {
    profile: "default",
    mode: mode === "deterministic" ? "deterministic" : "fast",
    runBrowser: uiTouched && mode !== "deterministic",
    runGeometry: true,
    runTypography: true,
    runDecorativeLines: true,
    runZIndex: true,
    runA11y: true,
    runAnimation: animTouched,
    runResponsive: responsive,
    runCrossBrowser: false,
    runBaseline: false,
    runStateMatrix: false,
    runVisualCritic: mode !== "deterministic",
    runTraces: false,
    runVideos: false,
    projects: responsive ? ["chromium-desktop", "chromium-mobile"] : ["chromium-desktop"],
    maxScreenshots: 6,
    maxAiCriticCalls: mode === "deterministic" ? 0 : 1,
  };
}

export function recommendOptionalChecks(scope: ScopeResult): string[] {
  const recs: string[] = [];
  const files = scope.changedFiles.join("\n");
  if (/sticky|fixed|position:\s*fixed|position:\s*sticky/i.test(files) || HIGH_RISK.test(files)) {
    if (/sticky|fixed/i.test(files)) {
      recs.push(
        "Run `npm run review:cross-browser` because the task changed sticky/fixed positioning."
      );
    }
  }
  if (/framer-motion|gsap|@keyframes|scroll-driven|scroll\(/i.test(files)) {
    recs.push(
      "Run `npm run review:animation` because scroll-driven or substantial motion changed."
    );
  }
  if (/RootLayout|index\.css|vite\.config|App\.tsx|BrowserRouter|VITE_BASE/i.test(files)) {
    recs.push(
      "Run `npm run review:thorough` before a major release — shared layout/routing or Pages base path changed."
    );
  }
  if (/modal|dropdown|dialog|popover/i.test(files)) {
    recs.push(
      "Run `npm run review:accessibility` because shared overlay/focus behavior may be affected."
    );
  }
  if (responsiveUiChanged(scope.changedFiles)) {
    recs.push(
      "Run `npm run review:responsive` if additional breakpoints beyond mobile/desktop need coverage."
    );
  }
  if (/canvas|webgl|three|svg/i.test(files)) {
    recs.push(
      "Run `npm run review:visual` with extra attention on decorative-line / canvas collisions."
    );
  }
  // Deduplicate, keep short list
  return [...new Set(recs)].slice(0, 4);
}

export function detectHighRiskReasons(scope: ScopeResult): string[] {
  const reasons: string[] = [];
  for (const f of scope.changedFiles) {
    if (/RootLayout|layout\//i.test(f)) reasons.push(`Root/layout change: ${f}`);
    if (/index\.css|globals/i.test(f)) reasons.push(`Global CSS: ${f}`);
    if (/vite\.config|VITE_BASE|\.github\/workflows/i.test(f)) {
      reasons.push(`Build/Pages configuration: ${f}`);
    }
    if (/App\.tsx|Router|router/i.test(f)) reasons.push(`Router configuration: ${f}`);
    if (/framer-motion|gsap|three|canvas/i.test(f)) reasons.push(`Complex motion/graphics: ${f}`);
  }
  return reasons;
}
