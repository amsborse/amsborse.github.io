import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./config.ts";
import { normalizeRepoPath } from "./session.ts";
import { ReviewCache } from "./cache.ts";
import { resolveImport } from "./dependency-scope.ts";

export interface RouteMapping {
  path: string;
  componentFile?: string;
  componentName?: string;
  layout?: string;
}

const ROUTE_ELEMENT_RE = /<Route\s+([^>]*?)\/?>/gs;

/**
 * Parse React Router routes from App.tsx (or a fixture App).
 */
export function parseRoutesFromSource(source: string): RouteMapping[] {
  const routes: RouteMapping[] = [];
  let m: RegExpExecArray | null;
  ROUTE_ELEMENT_RE.lastIndex = 0;
  while ((m = ROUTE_ELEMENT_RE.exec(source)) !== null) {
    const attrs = m[1];
    if (/element=\{\s*<RootLayout/.test(attrs)) continue;

    const index = /\bindex\b/.test(attrs);
    const pathMatch = attrs.match(/\bpath=["']([^"']+)["']/);
    const elementMatch =
      attrs.match(/element=\{\s*<([A-Za-z0-9_]+)/) ||
      attrs.match(/element=\{\s*<([A-Za-z0-9_]+)\s*\/>/);

    const routePath = index ? "/" : pathMatch ? `/${pathMatch[1].replace(/^\//, "")}` : null;
    if (!routePath) continue;

    const componentName = elementMatch?.[1];
    routes.push({
      path: routePath.replace(/\/+/g, "/"),
      componentName,
      layout: "RootLayout",
    });
  }
  return routes;
}

function resolveComponentFile(
  componentName: string | undefined,
  appSource: string,
  appFile: string,
  root: string
): string | undefined {
  if (!componentName) return undefined;

  // lazy(() => import("@/pages/...")) or relative
  const lazyRe = new RegExp(
    `(?:const|let|var)\\s+${componentName}\\s*=\\s*lazy\\(\\s*\\(\\s*\\)\\s*=>\\s*import\\(["']([^"']+)["']\\)`,
    "m"
  );
  const lazyMatch = appSource.match(lazyRe);
  if (lazyMatch) {
    return resolveImport(appFile, lazyMatch[1], root) ?? resolveAlias(lazyMatch[1], root);
  }

  // import Home from "@/pages/Home"
  const staticRe = new RegExp(`import\\s+${componentName}\\s+from\\s+["']([^"']+)["']`, "m");
  const staticMatch = appSource.match(staticRe);
  if (staticMatch) {
    return resolveImport(appFile, staticMatch[1], root) ?? resolveAlias(staticMatch[1], root);
  }

  return undefined;
}

function resolveAlias(spec: string, root: string): string | undefined {
  let rel = spec;
  if (rel.startsWith("@/")) rel = `src/${rel.slice(2)}`;
  const candidates = [rel, `${rel}.tsx`, `${rel}.ts`, `${rel}.jsx`, `${rel}/index.tsx`];
  for (const c of candidates) {
    const n = normalizeRepoPath(c);
    if (fs.existsSync(path.join(root, n))) return n;
  }
  return normalizeRepoPath(rel.endsWith(".tsx") || rel.endsWith(".ts") ? rel : `${rel}.tsx`);
}

export function loadRouteMap(
  root = ROOT,
  appFile = "src/App.tsx",
  cache?: ReviewCache
): RouteMapping[] {
  const abs = path.join(root, appFile);
  if (!fs.existsSync(abs)) return [];
  const source = fs.readFileSync(abs, "utf8");
  const key = cache?.key({ kind: "routes", appFile, hash: source.length });
  if (cache && key) {
    const hit = cache.get<RouteMapping[]>(key);
    if (hit) return hit;
  }

  const routes = parseRoutesFromSource(source).map((r) => ({
    ...r,
    componentFile: resolveComponentFile(r.componentName, source, appFile, root),
  }));

  if (cache && key) cache.set(key, routes);
  return routes;
}

export function routesForChangedFiles(
  changedAndSupporting: string[],
  routes: RouteMapping[],
  maxRoutes: number
): {
  included: string[];
  excluded: string[];
  reasons: Record<string, string>;
  layouts: string[];
} {
  const normalized = new Set(changedAndSupporting.map(normalizeRepoPath));
  const reasons: Record<string, string> = {};
  const matched: string[] = [];
  const layouts = new Set<string>();

  for (const route of routes) {
    if (!route.componentFile) continue;
    const cf = normalizeRepoPath(route.componentFile);
    if (normalized.has(cf)) {
      matched.push(route.path);
      reasons[route.path] = `Route directly renders changed component ${cf}`;
      if (route.layout) layouts.add(route.layout);
      continue;
    }
    // Parent folder match: changed file under the same page module directory
    // (e.g. src/pages/learning-algorithms/SlidingWindow.tsx helpers), not all of src/pages/
    for (const file of normalized) {
      if (!file.startsWith("src/pages/") || file === cf) continue;
      const pageDir = path.posix.dirname(cf);
      // Only nest under a dedicated folder — never treat src/pages as a shared parent
      if (pageDir === "src/pages" || pageDir === "src\\pages") continue;
      if (file.startsWith(pageDir + "/") || file.startsWith(pageDir + "\\")) {
        matched.push(route.path);
        reasons[route.path] = `Changed page module ${file} shares page subtree with ${cf}`;
        break;
      }
    }
  }

  // If a component changed, find routes whose files import it — caller supplies via supporting files
  for (const file of normalized) {
    if (!file.includes("/components/")) continue;
    for (const route of routes) {
      if (!route.componentFile) continue;
      // If the route component file is in supporting set, already handled
      if (normalized.has(normalizeRepoPath(route.componentFile)) && !matched.includes(route.path)) {
        matched.push(route.path);
        reasons[route.path] = `Supporting render path includes ${route.componentFile}`;
      }
    }
    // Fallback: if no route yet, prefer home only when RootLayout changed
    if (file.includes("RootLayout") || file.includes("/layout/")) {
      if (!matched.includes("/")) {
        matched.push("/");
        reasons["/"] = `Layout change ${file} may affect primary route; representative sample`;
      }
    }
  }

  const unique = [...new Set(matched)];
  const included = unique.slice(0, maxRoutes);
  const excluded = unique.slice(maxRoutes);
  for (const ex of excluded) {
    reasons[ex] = `${reasons[ex] ?? "matched"} — excluded by route budget`;
  }

  return { included, excluded, reasons, layouts: [...layouts] };
}

export function prioritizeRoutes(
  routes: string[],
  max: number
): {
  included: string[];
  excluded: string[];
} {
  const score = (r: string) => {
    if (r === "/") return 100;
    if (!r.includes(":")) return 50;
    return 10;
  };
  const sorted = [...routes].sort((a, b) => score(b) - score(a));
  return {
    included: sorted.slice(0, max),
    excluded: sorted.slice(max),
  };
}
