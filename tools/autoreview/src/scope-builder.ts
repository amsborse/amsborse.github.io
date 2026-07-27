import fs from "node:fs";
import path from "node:path";
import { ROOT, budgetsForMode } from "./config.ts";
import type { AutoreviewConfig, ReviewMode, ScopeResult } from "./types.ts";
import { buildForwardDeps, buildReverseDeps, isHighRiskFile } from "./dependency-scope.ts";
import { loadRouteMap, routesForChangedFiles } from "./route-scope.ts";
import { selectRelatedTests } from "./test-selector.ts";
import { detectTaskChangedFiles, prioritizeFiles } from "./git-scope.ts";
import { ReviewCache } from "./cache.ts";

export function buildScope(options: {
  config: AutoreviewConfig;
  mode: ReviewMode;
  explicitFiles?: string[];
  cache?: ReviewCache;
  root?: string;
  appFile?: string;
  scanRoots?: string[];
}): ScopeResult {
  const { config, mode } = options;
  const root = options.root ?? ROOT;
  const cache = options.cache ?? new ReviewCache();
  const budgets = budgetsForMode(config, mode);

  const detection = detectTaskChangedFiles({
    explicitFiles: options.explicitFiles,
    baseBranch: config.baseBranch,
  });

  const prioritized = prioritizeFiles(detection.changedFiles, budgets.maxChangedSourceFiles);

  const changedFiles = prioritized.included;
  const excludedFiles = [
    ...prioritized.excluded,
    ...detection.excludedPreexisting.map(
      (f) => `${f} (pre-existing dirty file; unchanged during task)`
    ),
  ];

  const inclusionReasons: Record<string, string> = {};
  for (const f of changedFiles) {
    inclusionReasons[f] = detection.session
      ? "Created or modified during current task session"
      : "Detected via Git fallback scope";
  }

  const forward = buildForwardDeps(changedFiles, budgets.dependencyDepth, root, cache);
  const reverse = buildReverseDeps(
    changedFiles,
    budgets.reverseDependencyDepth,
    root,
    cache,
    options.scanRoots
  );

  const supportingFiles: string[] = [];
  for (const [file, reason] of Object.entries({ ...forward.reasons, ...reverse.reasons })) {
    if (changedFiles.includes(file)) continue;
    supportingFiles.push(file);
    inclusionReasons[file] = reason;
  }

  // Cap supporting transitive files
  const maxSupport = budgets.maxChangedSourceFiles * 2;
  const supportKept = supportingFiles.slice(0, maxSupport);
  for (const drop of supportingFiles.slice(maxSupport)) {
    excludedFiles.push(`${drop} (exceeded supporting-file budget)`);
    delete inclusionReasons[drop];
  }

  const allRelevant = [...changedFiles, ...supportKept];
  const routes = loadRouteMap(root, options.appFile ?? "src/App.tsx", cache);
  const routeMatch = routesForChangedFiles(allRelevant, routes, budgets.maxAffectedRoutes);

  const affectedRoutes = routeMatch.included;
  for (const [route, reason] of Object.entries(routeMatch.reasons)) {
    if (affectedRoutes.includes(route)) inclusionReasons[route] = reason;
  }
  for (const ex of routeMatch.excluded) {
    excludedFiles.push(`route:${ex} (exceeded route budget)`);
  }

  const tests = selectRelatedTests(changedFiles, {
    root,
    cache,
    maxTests: 15,
  });
  const affectedTests = tests.tests;
  for (const [t, reason] of Object.entries(tests.reasons)) {
    if (affectedTests.includes(t) && !inclusionReasons[t]) {
      inclusionReasons[t] = reason;
    }
  }

  const affectedComponents = allRelevant.filter(
    (f) => /\/(components|pages|layout)\//.test(f) || /\.(tsx|jsx)$/.test(f)
  );

  const affectedInteractions = inferInteractionIds(changedFiles, affectedRoutes);

  // Risk-based expansion
  const expandedScope: string[] = [];
  const expansionReasons: Record<string, string> = {};
  for (const file of changedFiles) {
    if (!isHighRiskFile(file)) continue;
    expansionReasons[file] = `High-risk shared surface: ${file}`;
    // Pick one extra representative route if budget allows
    const extras = routes
      .map((r) => r.path)
      .filter((p) => !affectedRoutes.includes(p) && !p.includes(":"))
      .slice(0, 1);
    for (const extra of extras) {
      if (affectedRoutes.length + expandedScope.length >= budgets.maxAffectedRoutes) break;
      if (!expandedScope.includes(extra)) {
        expandedScope.push(extra);
        expansionReasons[extra] = `Representative route after high-risk change to ${file}`;
        inclusionReasons[extra] = expansionReasons[extra];
      }
    }
  }

  return {
    task: detection.session?.task ?? "(no task session)",
    sessionPresent: Boolean(detection.session && !detection.session.finishedAt),
    isolationWarning: detection.isolationWarning,
    changedFiles,
    affectedComponents,
    affectedRoutes: [...affectedRoutes, ...expandedScope].slice(0, budgets.maxAffectedRoutes),
    affectedTests,
    affectedInteractions,
    supportingFiles: supportKept,
    excludedFiles,
    inclusionReasons,
    expandedScope,
    expansionReasons,
    budgetsApplied: budgets,
    mode,
  };
}

function inferInteractionIds(changedFiles: string[], routes: string[]): string[] {
  const ids: string[] = [];
  for (const file of changedFiles) {
    if (!/\.(tsx|jsx)$/.test(file)) continue;
    const base = path.posix.basename(file, path.extname(file));
    const route = routes[0] ?? "/";
    ids.push(`${base.toLowerCase()}-primary@${route}`);
  }
  return ids.slice(0, 10);
}

export function writeScopeReport(scope: ScopeResult, root = ROOT): string {
  const dir = path.join(root, ".autoreview", "reports");
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, "current-scope.json");
  const payload = {
    task: scope.task,
    changedFiles: scope.changedFiles,
    affectedComponents: scope.affectedComponents,
    affectedRoutes: scope.affectedRoutes,
    affectedTests: scope.affectedTests,
    affectedInteractions: scope.affectedInteractions,
    supportingFiles: scope.supportingFiles,
    excludedFiles: scope.excludedFiles,
    inclusionReasons: scope.inclusionReasons,
    expandedScope: scope.expandedScope,
    expansionReasons: scope.expansionReasons,
    isolationWarning: scope.isolationWarning,
  };
  fs.writeFileSync(out, JSON.stringify(payload, null, 2), "utf8");
  return out;
}
