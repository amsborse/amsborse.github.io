#!/usr/bin/env node
/**
 * Validate .cursor/knowledge-graph/graph.json against the repo.
 * - Every node.file exists
 * - Every route.path appears in src/App.tsx (except /, *, :params)
 * - App.tsx routes are documented in graph (warning if missing)
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const GRAPH_PATH = join(ROOT, ".cursor/knowledge-graph/graph.json");
const APP_PATH = join(ROOT, "src/App.tsx");

function loadGraph() {
  const raw = readFileSync(GRAPH_PATH, "utf8");
  return JSON.parse(raw);
}

function normalizeRoute(path) {
  if (!path || path === "*" || path === "404") return null;
  const p = path.startsWith("/") ? path : `/${path}`;
  return p.replace(/\/+$/, "") || "/";
}

function extractAppRoutes(appSource) {
  const routes = new Set(["/"]);
  const re = /path="([^"]+)"/g;
  let m;
  while ((m = re.exec(appSource)) !== null) {
    const normalized = normalizeRoute(m[1]);
    if (normalized) routes.add(normalized);
  }
  return routes;
}

function main() {
  let failed = false;
  const graph = loadGraph();
  const appSource = readFileSync(APP_PATH, "utf8");
  const appRoutes = extractAppRoutes(appSource);

  const graphRoutePaths = new Set(
    graph.nodes
      .filter((n) => n.type === "route" && n.path && n.path !== "/*")
      .map((n) => normalizeRoute(n.path))
      .filter(Boolean)
  );

  const ids = new Set([...graph.nodes.map((n) => n.id), ...(graph.domains ?? []).map((d) => d.id)]);

  console.log(
    `Knowledge graph v${graph.meta?.version ?? "?"} — ${graph.nodes.length} nodes, ${graph.edges.length} edges\n`
  );

  for (const node of graph.nodes) {
    if (!node.file) continue;
    const abs = join(ROOT, node.file);
    if (!existsSync(abs)) {
      console.error(`✗ Missing file for ${node.id}: ${node.file}`);
      failed = true;
    }
  }

  for (const node of graph.nodes) {
    if (node.type !== "route" || !node.path || node.path === "/*") continue;
    if (node.path.includes(":")) continue;
    const normalized = normalizeRoute(node.path);
    if (!appRoutes.has(normalized)) {
      console.error(`✗ Route in graph but not in App.tsx: ${normalized} (${node.id})`);
      failed = true;
    }
  }

  for (const appPath of appRoutes) {
    if (appPath.includes(":")) continue;
    if (!graphRoutePaths.has(appPath) && appPath !== "/") {
      console.error(`✗ Route in App.tsx not in graph: ${appPath}`);
      failed = true;
    }
  }

  for (const edge of graph.edges) {
    if (!ids.has(edge.from)) {
      console.error(`✗ Edge from unknown node: ${edge.from}`);
      failed = true;
    }
    if (!ids.has(edge.to)) {
      console.error(`✗ Edge to unknown node: ${edge.to}`);
      failed = true;
    }
  }

  if (failed) {
    console.error("\n✗ Knowledge graph validation failed");
    process.exit(1);
  }

  console.log("✓ All graph files exist");
  console.log("✓ Route nodes match App.tsx");
  console.log("✓ Edge references valid");
  console.log("\n✓ verify:kg passed");
}

main();
