import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { AutoreviewConfig, BudgetConfig, ReviewMode } from "./types.ts";

const ROOT = process.cwd();

function fastBudgets(depth = 2): BudgetConfig {
  return {
    maxChangedSourceFiles: 20,
    maxAffectedRoutes: 2,
    maxScreenshots: 6,
    maxBrowserInteractions: 5,
    maxAiCriticCalls: 1,
    maxRepairIterations: 2,
    maxTestExecutionMs: 120_000,
    dependencyDepth: depth,
    reverseDependencyDepth: 1,
  };
}

function thoroughBudgets(depth = 3): BudgetConfig {
  return {
    maxChangedSourceFiles: 40,
    maxAffectedRoutes: 4,
    maxScreenshots: 12,
    maxBrowserInteractions: 10,
    maxAiCriticCalls: 3,
    maxRepairIterations: 4,
    maxTestExecutionMs: 300_000,
    dependencyDepth: depth,
    reverseDependencyDepth: 1,
  };
}

export function defaultConfig(): AutoreviewConfig {
  const inferred = inferFromRepo(ROOT);
  return {
    baseBranch: inferred.baseBranch,
    app: {
      devCommand: "npm run dev",
      buildCommand: "npm run build",
      previewCommand: "npm run preview",
      url: inferred.url,
      basePath: inferred.basePath,
      port: inferred.port,
    },
    scope: {
      dependencyDepth: 2,
      reverseDependencyDepth: 1,
      maxFiles: 20,
      maxRoutes: 2,
    },
    browser: {
      maxScreenshots: 6,
      maxInteractions: 5,
      viewports: [
        { name: "mobile", width: 390, height: 844 },
        { name: "desktop", width: 1440, height: 900 },
      ],
    },
    review: {
      mode: "fast",
      maxCriticCalls: 1,
      maxRepairIterations: 2,
      maxTestExecutionMs: 120_000,
      deterministicOnly: false,
    },
    githubPages: {
      enabled: true,
      validateBasePath: true,
      validateStaticAssets: true,
      usesHashRouter: false,
    },
    budgets: {
      fast: fastBudgets(2),
      thorough: thoroughBudgets(3),
    },
    ai: {
      enabled: false,
    },
  };
}

function inferFromRepo(root: string): {
  baseBranch: string;
  url: string;
  basePath: string;
  port: number;
} {
  let baseBranch = "main";
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as {
      name?: string;
    };
    if (pkg.name?.includes("github.io") || root.includes("amsborse.github.io")) {
      baseBranch = "master";
    }
  } catch {
    /* ignore */
  }

  for (const candidate of ["master", "main"]) {
    const head = path.join(root, ".git", "refs", "heads", candidate);
    if (fs.existsSync(head)) {
      baseBranch = candidate;
      break;
    }
  }

  let port = 1111;
  let basePath = "/";
  try {
    const vite = fs.readFileSync(path.join(root, "vite.config.ts"), "utf8");
    const portMatch = vite.match(/port:\s*(\d+)/);
    if (portMatch) port = Number(portMatch[1]);
    if (/VITE_BASE/.test(vite) && !/return\s+"\/"/.test(vite)) {
      /* keep default / for user pages */
    }
  } catch {
    /* ignore */
  }

  try {
    const envProd = path.join(root, ".env.production");
    if (fs.existsSync(envProd)) {
      const text = fs.readFileSync(envProd, "utf8");
      const m = text.match(/VITE_BASE\s*=\s*([^\s#]+)/);
      if (m) {
        let b = m[1].trim();
        if (!b.startsWith("/")) b = `/${b}`;
        if (!b.endsWith("/")) b = `${b}/`;
        basePath = b;
      }
    }
  } catch {
    /* ignore */
  }

  return {
    baseBranch,
    url: `http://localhost:${port}`,
    basePath,
    port,
  };
}

function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const out = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const current = (out as Record<string, unknown>)[key];
      (out as Record<string, unknown>)[key] = deepMerge(
        (current && typeof current === "object" ? current : {}) as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else if (value !== undefined) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

export async function loadConfig(root = ROOT): Promise<AutoreviewConfig> {
  const defaults = defaultConfig();
  const configPath = path.join(root, "autoreview.config.ts");
  if (!fs.existsSync(configPath)) {
    return defaults;
  }

  try {
    const mod = await import(pathToFileURL(configPath).href + `?t=${Date.now()}`);
    const user = (mod.default ?? mod) as Partial<AutoreviewConfig>;
    return deepMerge(
      defaults as unknown as Record<string, unknown>,
      user as Record<string, unknown>
    ) as unknown as AutoreviewConfig;
  } catch (err) {
    console.warn(
      `[autoreview] failed to load autoreview.config.ts, using defaults: ${String(err)}`
    );
    return defaults;
  }
}

export function budgetsForMode(config: AutoreviewConfig, mode: ReviewMode): BudgetConfig {
  if (mode === "thorough") return { ...config.budgets.thorough };
  const fast = { ...config.budgets.fast };
  if (mode === "deterministic") {
    fast.maxAiCriticCalls = 0;
  }
  return fast;
}

export function resolveMode(config: AutoreviewConfig, cliMode?: string): ReviewMode {
  if (cliMode === "fast" || cliMode === "thorough" || cliMode === "deterministic") {
    return cliMode;
  }
  if (config.review.deterministicOnly) return "deterministic";
  // Never escalate to thorough implicitly — default agent completion mode is fast.
  return "fast";
}

export function joinAppUrl(config: AutoreviewConfig, routePath: string): string {
  const base = config.app.url.replace(/\/$/, "");
  const basePath = config.app.basePath === "/" ? "" : config.app.basePath.replace(/\/$/, "");
  const route = routePath.startsWith("/") ? routePath : `/${routePath}`;
  if (config.githubPages.usesHashRouter) {
    return `${base}${basePath}/#${route}`;
  }
  return `${base}${basePath}${route}`;
}

export { ROOT };
