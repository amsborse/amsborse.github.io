import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../config.ts";
import type { ScopeResult } from "../types.ts";
import type { StateManifest, StateManifestEntry } from "./types.ts";

const ALL_STATES = [
  "default",
  "hover",
  "focus-visible",
  "active",
  "selected",
  "disabled",
  "loading",
  "empty",
  "error",
  "success",
  "long-content",
  "missing-asset",
  "slow-network",
  "mobile",
  "desktop",
  "reduced-motion",
] as const;

/**
 * Build a scoped UI state matrix for changed interactive components.
 * Skips irrelevant states.
 */
export function buildStateMatrix(scope: ScopeResult, root = ROOT): StateManifest[] {
  const manifests: StateManifest[] = [];
  const files = scope.changedFiles.filter((f) => /\.(tsx|jsx)$/.test(f));

  for (const file of files.slice(0, 10)) {
    const abs = path.join(root, file);
    if (!fs.existsSync(abs)) continue;
    let content = "";
    try {
      content = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const component = path.posix.basename(file).replace(/\.(tsx|jsx)$/, "");
    const interactive =
      /onClick|onSubmit|button|Button|disabled|aria-|hover:|focus-visible:|Animate|motion\.|framer-motion/.test(
        content
      );
    if (!interactive && !/Card|Modal|Form|Nav|Menu/.test(component)) continue;

    const states: StateManifestEntry[] = ALL_STATES.map((name) => {
      const probe = stateProbe(name, content, component);
      return probe;
    });

    manifests.push({
      component,
      sourceFiles: [file],
      states,
    });
  }

  const outPath = path.join(ROOT, ".autoreview", "reports", "state-matrix.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(manifests, null, 2), "utf8");
  return manifests;
}

function stateProbe(
  name: (typeof ALL_STATES)[number],
  content: string,
  component: string
): StateManifestEntry {
  switch (name) {
    case "default":
    case "mobile":
    case "desktop":
      return { name, required: true };
    case "hover":
      return {
        name,
        required: /hover:|onMouseEnter|whileHover/.test(content),
        reason: /hover:|onMouseEnter|whileHover/.test(content)
          ? undefined
          : "No hover styling/handlers detected",
      };
    case "focus-visible":
      return {
        name,
        required: /focus-visible:|tabIndex|button|a |input|onKeyDown/.test(content),
        reason: /focus-visible:|button|input/.test(content)
          ? undefined
          : "No focusable interactive controls detected",
      };
    case "active":
      return {
        name,
        required: /active:|onMouseDown|whileTap/.test(content),
        reason: /active:|onMouseDown|whileTap/.test(content)
          ? undefined
          : "No active press styling detected",
      };
    case "selected":
      return {
        name,
        required: /selected|aria-selected|isActive|isSelected/.test(content),
        reason: /selected|aria-selected|isActive|isSelected/.test(content)
          ? undefined
          : "Component has no selected state",
      };
    case "disabled":
      return {
        name,
        required: /disabled|aria-disabled|isDisabled/.test(content),
        reason: /disabled|aria-disabled|isDisabled/.test(content)
          ? undefined
          : "Component has no disabled state",
      };
    case "loading":
      return {
        name,
        required: /loading|isLoading|Spinner|skeleton/.test(content),
        reason: /loading|isLoading|Spinner|skeleton/.test(content)
          ? undefined
          : "Component has no loading state",
      };
    case "empty":
      return {
        name,
        required: /empty|no results|EmptyState|length === 0/.test(content),
        reason: /empty|EmptyState|length === 0/.test(content)
          ? undefined
          : "Component has no empty state",
      };
    case "error":
      return {
        name,
        required: /error|isError|aria-invalid|ErrorMessage/.test(content),
        reason: /error|isError|aria-invalid|ErrorMessage/.test(content)
          ? undefined
          : "Component has no error state",
      };
    case "success":
      return {
        name,
        required: /success|isSuccess|aria-live/.test(content),
        reason: /success|isSuccess/.test(content) ? undefined : "Component has no success state",
      };
    case "long-content":
      return {
        name,
        required: /title|description|children|Card/.test(content) || /Card/.test(component),
        reason: "Variable user content surfaces should sample long copy",
      };
    case "missing-asset":
      return {
        name,
        required: /<img|Image |backgroundImage|src=/.test(content),
        reason: /<img|Image |src=/.test(content) ? undefined : "No image/asset rendering detected",
      };
    case "slow-network":
      return {
        name,
        required: /fetch|useQuery|lazy\(|Suspense|loading/.test(content),
        reason: /fetch|lazy\(|Suspense|loading/.test(content)
          ? undefined
          : "No async network-bound UI detected",
      };
    case "reduced-motion":
      return {
        name,
        required: /motion\.|framer-motion|animate|@keyframes|transition/.test(content),
        reason: /motion\.|framer-motion|animate|@keyframes|transition/.test(content)
          ? undefined
          : "No substantial animation detected",
      };
    default:
      return { name, required: false, reason: "Not applicable" };
  }
}

export function statesToCapture(manifest: StateManifest): string[] {
  return manifest.states.filter((s) => s.required).map((s) => s.name);
}
