import fs from "node:fs";
import path from "node:path";
import type { Page } from "playwright";
import { ROOT, joinAppUrl } from "./config.ts";
import type { AutoreviewConfig, ScopeResult, ScreenshotRecord, Viewport } from "./types.ts";

export async function captureScopedScreenshots(options: {
  page: Page;
  config: AutoreviewConfig;
  scope: ScopeResult;
  budget: number;
}): Promise<ScreenshotRecord[]> {
  const { page, config, scope, budget } = options;
  const dir = path.join(ROOT, ".autoreview", "screenshots");
  fs.mkdirSync(dir, { recursive: true });

  const records: ScreenshotRecord[] = [];
  const viewports = config.browser.viewports;
  const routes = scope.affectedRoutes;

  for (const route of routes) {
    for (const viewport of viewports) {
      if (records.length >= budget) {
        return records;
      }
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const url = joinAppUrl(config, route);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => null);

      const id = `${sanitize(route)}_${viewport.name}_${records.length}`;
      const filePath = path.join(dir, `${id}.png`);

      // Prefer element-level screenshot of main content when present
      const main = page.locator("main, [role='main'], #root").first();
      try {
        if (await main.count()) {
          await main.screenshot({ path: filePath });
        } else {
          await page.screenshot({ path: filePath, fullPage: false });
        }
      } catch {
        await page.screenshot({ path: filePath, fullPage: false }).catch(() => null);
      }

      const changedSourceFile = scope.changedFiles.find((f) => /\.(tsx|jsx|css)$/.test(f));
      records.push({
        id,
        path: path.relative(ROOT, filePath).replace(/\\/g, "/"),
        changedSourceFile,
        component: scope.affectedComponents[0],
        route,
        selector: "main, [role='main'], #root",
        viewport,
        reason: `Scoped visual evidence for changed task surface on ${route} @ ${viewport.name}`,
      });
    }
  }

  return records;
}

function sanitize(route: string): string {
  return route.replace(/[^\w.-]+/g, "_") || "root";
}

export function enforceScreenshotBudget(
  desired: Array<{ route: string; viewport: Viewport }>,
  budget: number
): { included: typeof desired; excluded: typeof desired } {
  return {
    included: desired.slice(0, budget),
    excluded: desired.slice(budget),
  };
}
