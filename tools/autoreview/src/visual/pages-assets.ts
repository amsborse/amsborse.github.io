import type { Page } from "playwright";
import type { AutoreviewConfig, Finding } from "../types.ts";
import { evidenceToFinding } from "./types.ts";

export async function runGitHubPagesValidation(
  page: Page,
  route: string,
  config: AutoreviewConfig
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const basePath = config.app.basePath || "/";

  const result = await page.evaluate((basePath) => {
    const issues: Array<{
      category: string;
      severity: string;
      confidence: number;
      selector: string;
      explanation: string;
      recommendedFix?: string;
    }> = [];

    const badRoot = (url: string) => {
      if (!url || url.startsWith("data:") || url.startsWith("http") || url.startsWith("blob:")) {
        return false;
      }
      if (basePath === "/" || basePath === "") return false;
      return url.startsWith("/") && !url.startsWith(basePath);
    };

    for (const el of document.querySelectorAll("img,script,link,source")) {
      const attr =
        el.getAttribute("src") || el.getAttribute("href") || el.getAttribute("srcset") || "";
      const first = attr.split(",")[0]?.trim().split(" ")[0] || "";
      if (badRoot(first)) {
        issues.push({
          category: "asset-path",
          severity: "high",
          confidence: 0.92,
          selector: el.tagName.toLowerCase(),
          explanation: `Asset path ${first} ignores GitHub Pages base path ${basePath}`,
          recommendedFix: `Prefix with base path ${basePath} or use import.meta.env.BASE_URL.`,
        });
      }
    }

    // CSS background URLs
    for (const el of [...document.querySelectorAll("*")].slice(0, 300) as HTMLElement[]) {
      const bg = getComputedStyle(el).backgroundImage;
      const m = /url\(["']?([^"')]+)["']?\)/.exec(bg);
      if (m && badRoot(m[1])) {
        issues.push({
          category: "asset-path",
          severity: "high",
          confidence: 0.85,
          selector: el.tagName.toLowerCase(),
          explanation: `CSS background url ${m[1]} ignores base path ${basePath}`,
          recommendedFix: "Use base-aware background URLs.",
        });
      }
    }

    const icon = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
    if (icon?.href) {
      try {
        const u = new URL(icon.href, location.href);
        if (basePath !== "/" && u.pathname.startsWith("/") && !u.pathname.startsWith(basePath)) {
          issues.push({
            category: "asset-path",
            severity: "medium",
            confidence: 0.8,
            selector: "link[rel*=icon]",
            explanation: `Favicon path may be incorrect for base path ${basePath}`,
            recommendedFix: "Align favicon href with GitHub Pages base.",
          });
        }
      } catch {
        /* ignore */
      }
    }

    const manifest = document.querySelector("link[rel='manifest']") as HTMLLinkElement | null;
    if (manifest?.href) {
      try {
        const u = new URL(manifest.href, location.href);
        if (basePath !== "/" && !u.pathname.startsWith(basePath)) {
          issues.push({
            category: "asset-path",
            severity: "medium",
            confidence: 0.75,
            selector: "link[rel=manifest]",
            explanation: "Manifest path may not respect GitHub Pages base path",
            recommendedFix: "Serve manifest under the configured base path.",
          });
        }
      } catch {
        /* ignore */
      }
    }

    return issues.slice(0, 20);
  }, basePath);

  for (const [i, issue] of result.entries()) {
    findings.push(
      evidenceToFinding(
        {
          category: "asset-path",
          severity: issue.severity as Finding["severity"],
          confidence: issue.confidence,
          route,
          selector: issue.selector,
          explanation: issue.explanation,
          recommendedFix: issue.recommendedFix,
          deterministic: true,
        },
        "pages",
        i
      )
    );
  }

  // Hash router / refresh behavior notes (non-crawling)
  if (config.githubPages.usesHashRouter) {
    const url = page.url();
    if (!url.includes("#") && route !== "/") {
      findings.push(
        evidenceToFinding(
          {
            category: "runtime",
            severity: "medium",
            confidence: 0.7,
            route,
            explanation: "HashRouter expected but current URL has no hash segment",
            recommendedFix: "Navigate using hash routes for GitHub Pages compatibility.",
            deterministic: true,
          },
          "pages",
          findings.length
        )
      );
    }
  }

  return findings;
}
