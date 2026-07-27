import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../config.ts";
import type { ScopeResult } from "../types.ts";
import type { ReviewSurface, SurfaceKind } from "./types.ts";

/**
 * Prefer the smallest meaningful changed surface.
 * Order: storybook → preview → showcase → harness → section → full route
 */
export function selectReviewSurfaces(scope: ScopeResult, root = ROOT): ReviewSurface[] {
  const surfaces: ReviewSurface[] = [];
  const uiFiles = scope.changedFiles.filter((f) => /\.(tsx|jsx|css|scss)$/.test(f));

  if (!uiFiles.length && !scope.affectedRoutes.length) return [];

  for (const file of uiFiles.slice(0, 8)) {
    const component = path.posix.basename(file).replace(/\.(tsx|jsx|css|scss)$/, "");
    const story = findSibling(root, file, [
      `${component}.stories.tsx`,
      `${component}.stories.ts`,
      `${component}.story.tsx`,
    ]);
    if (story) {
      surfaces.push({
        kind: "storybook",
        route: scope.affectedRoutes[0] || "/",
        selector: `[data-testid='${kebab(component)}'], .${kebab(component)}, main`,
        component,
        changedFile: file,
        reason: `Storybook/story file present: ${story}`,
      });
      continue;
    }

    const preview = findInRepo(root, [
      `src/**/previews/${component}*`,
      `src/components/**/${component}Preview*`,
    ]);
    if (preview) {
      surfaces.push({
        kind: "component-preview",
        route: scope.affectedRoutes[0] || "/",
        selector: `[data-testid='${kebab(component)}'], main`,
        component,
        changedFile: file,
        reason: `Component preview found: ${preview}`,
      });
      continue;
    }

    if (
      /showcase|components/i.test(file) ||
      scope.affectedRoutes.some((r) => /component/i.test(r))
    ) {
      surfaces.push({
        kind: "showcase-route",
        route:
          scope.affectedRoutes.find((r) => /component/i.test(r)) || scope.affectedRoutes[0] || "/",
        selector: `[data-testid='${kebab(component)}'], article, main`,
        component,
        changedFile: file,
        reason: "Showcase / components route surface",
      });
      continue;
    }

    const harness = findInRepo(root, [
      `tools/autoreview/tests/fixtures/**/${component}*`,
      `tests/fixtures/**/${component}*`,
    ]);
    if (harness) {
      surfaces.push({
        kind: "test-harness",
        route: scope.affectedRoutes[0] || "/",
        selector: `[data-testid='${kebab(component)}'], main`,
        component,
        changedFile: file,
        reason: `Temporary/test harness: ${harness}`,
      });
      continue;
    }
  }

  for (const route of scope.affectedRoutes) {
    if (surfaces.some((s) => s.route === route && s.kind !== "full-route")) {
      surfaces.push({
        kind: "route-section",
        route,
        selector: "main, [role='main'], #root > *",
        component: scope.affectedComponents[0],
        changedFile: uiFiles[0],
        reason: "Scoped route section (smaller than full page when possible)",
      });
    } else {
      surfaces.push({
        kind: "full-route",
        route,
        selector: "main, [role='main'], #root",
        component: scope.affectedComponents[0],
        changedFile: uiFiles[0],
        reason: "Full affected route required (no smaller surface found)",
      });
    }
  }

  // Deduplicate by route+selector
  const seen = new Set<string>();
  return surfaces.filter((s) => {
    const key = `${s.route}|${s.selector}|${s.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function kebab(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function findSibling(root: string, file: string, names: string[]): string | null {
  const dir = path.dirname(path.join(root, file));
  for (const n of names) {
    const p = path.join(dir, n);
    if (fs.existsSync(p)) return path.relative(root, p).replace(/\\/g, "/");
  }
  return null;
}

function findInRepo(root: string, globs: string[]): string | null {
  // Lightweight discrete path probes (no full glob dependency)
  for (const g of globs) {
    const concrete = g.replace("**/", "").replace("*", "").replace(/\/+$/, "");
    const candidates = [
      path.join(root, concrete),
      path.join(root, "src/components", path.basename(concrete)),
      path.join(
        root,
        "tools/autoreview/tests/fixtures/src/components",
        path.basename(concrete) + ".tsx"
      ),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return path.relative(root, c).replace(/\\/g, "/");
    }
  }
  return null;
}

export function surfacePriority(kind: SurfaceKind): number {
  const order: SurfaceKind[] = [
    "storybook",
    "component-preview",
    "showcase-route",
    "test-harness",
    "route-section",
    "full-route",
  ];
  return order.indexOf(kind);
}
