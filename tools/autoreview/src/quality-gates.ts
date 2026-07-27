import type { Finding, GateResult, ScopeResult } from "./types.ts";

export function evaluateQualityGates(input: {
  scope: ScopeResult;
  findings: Finding[];
  relatedTestsPassed: boolean;
  lintPassed: boolean;
  typecheckPassed: boolean;
  runtimeErrors: boolean;
  failedNetwork: boolean;
  brokenAssets: boolean;
  primaryInteractionBroken: boolean;
  hardFeedbackDelayed?: boolean;
  animationFinalStateJump?: boolean;
  stuckAnimation?: boolean;
  unexpectedLayoutShift?: boolean;
  baselineRegression?: boolean;
  missingReducedMotion?: boolean;
  decorativeLineCollision?: boolean;
  contentEdgeCollision?: boolean;
  clippedFocus?: boolean;
  zIndexObstruction?: boolean;
  brokenVisualState?: boolean;
}): { gates: GateResult[]; passed: boolean } {
  void input.scope;
  const unresolvedCritical = input.findings.filter((f) => !f.repaired && f.severity === "critical");
  const unresolvedHighConfident = input.findings.filter(
    (f) => !f.repaired && f.severity === "high" && f.confidence >= 0.8
  );
  const overlap = input.findings.filter(
    (f) => !f.repaired && f.category === "overlap" && f.severity !== "low"
  );
  const clipping = input.findings.filter(
    (f) =>
      !f.repaired &&
      f.category === "clipping" &&
      (f.severity === "high" || f.severity === "critical")
  );
  const overflow = input.findings.filter(
    (f) => !f.repaired && f.category === "overflow" && f.severity !== "low"
  );
  const a11yCritical = input.findings.filter(
    (f) =>
      !f.repaired &&
      (f.category === "accessibility" || f.category === "focus") &&
      (f.severity === "critical" || (f.severity === "high" && f.confidence >= 0.9))
  );

  const gates: GateResult[] = [
    gate(
      "related-tests",
      input.relatedTestsPassed,
      input.relatedTestsPassed ? "Related tests passed" : "Related tests failed"
    ),
    gate(
      "scoped-typescript",
      input.typecheckPassed,
      input.typecheckPassed ? "No scoped TS errors signaled" : "Typecheck reported errors"
    ),
    gate(
      "scoped-lint",
      input.lintPassed,
      input.lintPassed ? "Lint clean on changed files" : "Lint errors on changed files"
    ),
    gate(
      "runtime-errors",
      !input.runtimeErrors,
      input.runtimeErrors
        ? "Runtime/console errors on affected routes"
        : "No runtime errors on affected routes"
    ),
    gate(
      "network-requests",
      !input.failedNetwork,
      input.failedNetwork
        ? "Relevant failed network requests detected"
        : "No relevant failed network requests"
    ),
    gate(
      "github-pages-assets",
      !input.brokenAssets,
      input.brokenAssets
        ? "Broken GitHub Pages asset paths detected"
        : "No broken GitHub Pages asset paths in scope"
    ),
    gate(
      "critical-a11y",
      a11yCritical.length === 0,
      a11yCritical.length === 0
        ? "No critical accessibility issues in scope"
        : `${a11yCritical.length} critical a11y issue(s)`
    ),
    gate(
      "no-visible-overlap",
      overlap.length === 0,
      overlap.length === 0
        ? "No visible overlap in changed surfaces"
        : `${overlap.length} overlap finding(s)`
    ),
    gate(
      "no-text-clipping",
      clipping.length === 0,
      clipping.length === 0
        ? "No high-severity text clipping in changed surfaces"
        : `${clipping.length} clipping finding(s)`
    ),
    gate(
      "no-horizontal-overflow",
      overflow.length === 0,
      overflow.length === 0
        ? "No horizontal overflow caused by changed code"
        : `${overflow.length} overflow finding(s)`
    ),
    gate(
      "primary-interaction",
      !input.primaryInteractionBroken,
      input.primaryInteractionBroken
        ? "Broken primary interaction"
        : "Primary scoped interactions OK"
    ),
    gate(
      "decorative-line-collision",
      !input.decorativeLineCollision,
      input.decorativeLineCollision
        ? "Text/controls crossed by unintended decorative lines"
        : "No unintended decorative-line collisions in scope"
    ),
    gate(
      "content-edge-collision",
      !input.contentEdgeCollision,
      input.contentEdgeCollision
        ? "Critical content-edge collisions detected"
        : "No critical content-edge collisions"
    ),
    gate(
      "clipped-focus",
      !input.clippedFocus,
      input.clippedFocus
        ? "Clipped focus indicators detected"
        : "No clipped focus indicators in scope"
    ),
    gate(
      "z-index-obstruction",
      !input.zIndexObstruction,
      input.zIndexObstruction
        ? "Unresolved z-index obstruction"
        : "No unresolved z-index obstruction"
    ),
    gate(
      "visual-state-matrix",
      !input.brokenVisualState,
      input.brokenVisualState
        ? "Broken visual state in applicable state matrix"
        : "Applicable visual states OK"
    ),
    gate(
      "interaction-feedback-latency",
      !input.hardFeedbackDelayed,
      input.hardFeedbackDelayed
        ? "Primary interaction feedback above hard latency threshold"
        : "Primary feedback latency within hard threshold"
    ),
    gate(
      "animation-final-state",
      !input.animationFinalStateJump,
      input.animationFinalStateJump
        ? "Animation final-state jump detected"
        : "No animation final-state jump"
    ),
    gate(
      "stuck-animation",
      !input.stuckAnimation,
      input.stuckAnimation
        ? "Stuck animation after repeated input"
        : "No stuck animation after repeated input"
    ),
    gate(
      "layout-shift",
      !input.unexpectedLayoutShift,
      input.unexpectedLayoutShift
        ? "Unexpected layout shift above configured threshold"
        : "Layout shift within threshold"
    ),
    gate(
      "baseline-regression",
      !input.baselineRegression,
      input.baselineRegression
        ? "Unexpected difference from approved component baseline"
        : "No unexpected approved-baseline regressions"
    ),
    gate(
      "reduced-motion",
      !input.missingReducedMotion,
      input.missingReducedMotion
        ? "Missing reduced-motion handling for new substantial animation"
        : "Reduced-motion handling OK or not applicable"
    ),
    gate(
      "unresolved-critical",
      unresolvedCritical.length === 0,
      unresolvedCritical.length === 0
        ? "No unresolved critical findings"
        : `${unresolvedCritical.length} unresolved critical finding(s)`
    ),
    gate(
      "unresolved-high-confidence",
      unresolvedHighConfident.length === 0,
      unresolvedHighConfident.length === 0
        ? "No unresolved high-severity finding with confidence ≥ 0.8"
        : `${unresolvedHighConfident.length} unresolved high-confidence finding(s)`
    ),
  ];

  return { gates, passed: gates.every((g) => g.passed) };
}

function gate(name: string, passed: boolean, details: string): GateResult {
  return { name, passed, details };
}
