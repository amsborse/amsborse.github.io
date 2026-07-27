import { spawn, type ChildProcess } from "node:child_process";
import { chromium, type Browser, type Page } from "playwright";
import { joinAppUrl } from "./config.ts";
import type { AutoreviewConfig, CheckResult, Finding, ScopeResult } from "./types.ts";

export interface BrowserSession {
  browser: Browser;
  page: Page;
  server?: ChildProcess;
  openedRoutes: string[];
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
}

async function waitForUrl(url: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok || res.status === 404) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

export async function ensureDevServer(
  config: AutoreviewConfig,
  startServer: boolean
): Promise<ChildProcess | undefined> {
  const ready = await waitForUrl(config.app.url, 2000);
  if (ready) return undefined;
  if (!startServer) return undefined;

  const [cmd, ...args] = config.app.devCommand.split(/\s+/);
  const server = spawn(cmd, args, {
    cwd: process.cwd(),
    shell: true,
    stdio: "pipe",
    env: { ...process.env },
  });
  const ok = await waitForUrl(config.app.url, 120_000);
  if (!ok) {
    server.kill();
    throw new Error(`Dev server did not become ready at ${config.app.url}`);
  }
  return server;
}

export async function openScopedBrowser(
  config: AutoreviewConfig,
  scope: ScopeResult,
  options?: { startServer?: boolean }
): Promise<{ session: BrowserSession; result: CheckResult }> {
  const openedRoutes: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const findings: Finding[] = [];

  let server: ChildProcess | undefined;
  try {
    server = await ensureDevServer(config, options?.startServer !== false);
  } catch (err) {
    return {
      session: {
        browser: null as unknown as Browser,
        page: null as unknown as Page,
        openedRoutes,
        consoleErrors,
        pageErrors,
        failedRequests,
      },
      result: {
        name: "browser-routes",
        passed: false,
        details: String(err),
        findings: [
          {
            id: "server-start-failed",
            severity: "critical",
            confidence: 1,
            category: "runtime",
            explanation: String(err),
            source: "runtime",
          },
        ],
      },
    };
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (config.githubPages.validateStaticAssets) {
      failedRequests.push(url);
    }
  });

  const routes = scope.affectedRoutes.slice(0, scope.budgetsApplied.maxAffectedRoutes);
  for (const route of routes) {
    const url = joinAppUrl(config, route);
    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      openedRoutes.push(route);
      if (response && response.status() >= 500) {
        findings.push({
          id: `http-${route}`,
          severity: "high",
          confidence: 0.95,
          category: "runtime",
          route,
          explanation: `Route ${route} returned HTTP ${response.status()}`,
          source: "runtime",
        });
      }
      // GitHub Pages base-path asset probe
      if (config.githubPages.validateBasePath) {
        const broken = await page.evaluate((basePath) => {
          const imgs = [...document.querySelectorAll("img")];
          return imgs
            .filter((img) => {
              const src = img.getAttribute("src") || "";
              if (!src || src.startsWith("data:") || src.startsWith("http")) return false;
              if (basePath !== "/" && src.startsWith("/") && !src.startsWith(basePath)) {
                return true;
              }
              return (img as HTMLImageElement).naturalWidth === 0 && src.length > 0;
            })
            .map((img) => img.getAttribute("src") || "");
        }, config.app.basePath);
        for (const src of broken) {
          findings.push({
            id: `asset-${src}`,
            severity: "high",
            confidence: 0.9,
            category: "asset-path",
            route,
            explanation: `Possible broken asset under GitHub Pages base path: ${src}`,
            recommendedFix: `Ensure assets respect base path ${config.app.basePath}`,
            source: "runtime",
          });
        }
      }
    } catch (err) {
      findings.push({
        id: `nav-${route}`,
        severity: "critical",
        confidence: 1,
        category: "runtime",
        route,
        explanation: `Failed to open route ${route}: ${String(err)}`,
        source: "runtime",
      });
    }
  }

  for (const err of [...consoleErrors, ...pageErrors].slice(0, 20)) {
    findings.push({
      id: `console-${findings.length}`,
      severity: "high",
      confidence: 0.85,
      category: "runtime",
      explanation: err,
      source: "runtime",
    });
  }

  for (const url of failedRequests.slice(0, 10)) {
    findings.push({
      id: `net-${findings.length}`,
      severity: "medium",
      confidence: 0.8,
      category: "network",
      explanation: `Failed network request: ${url}`,
      source: "runtime",
    });
  }

  const session: BrowserSession = {
    browser,
    page,
    server,
    openedRoutes,
    consoleErrors,
    pageErrors,
    failedRequests,
  };

  return {
    session,
    result: {
      name: "browser-routes",
      passed:
        findings.filter((f) => f.severity === "critical" || f.severity === "high").length === 0,
      details: `Opened routes: ${openedRoutes.join(", ") || "(none)"}`,
      findings,
    },
  };
}

export async function closeBrowserSession(session: BrowserSession): Promise<void> {
  try {
    if (session.browser) await session.browser.close();
  } catch {
    /* ignore */
  }
  if (session.server) {
    session.server.kill();
  }
}
