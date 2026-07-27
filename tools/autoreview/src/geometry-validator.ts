/**
 * Thin public re-exports for the agent-workflow file map.
 * Implementations live under visual/ and related modules — do not duplicate logic.
 */
export { runLayoutGeometryValidation as validateGeometry } from "./visual/geometry.ts";
export { runLayoutGeometryValidation as validateOverlap } from "./visual/geometry.ts";
export { runLayoutGeometryValidation as validateClipping } from "./visual/geometry.ts";
export { runDecorativeLineValidation as validateDecorativeLines } from "./visual/decorative-lines.ts";
export { runScopedA11yChecks as validateAccessibility } from "./visual/a11y.ts";
export { runGitHubPagesValidation as validateAssets } from "./visual/pages-assets.ts";
export { runAnimationReview as validateAnimation } from "./animation-review.ts";
export { runVisualCritic as runVisualCriticReview } from "./visual-review.ts";
