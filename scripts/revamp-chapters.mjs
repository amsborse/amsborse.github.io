/**
 * Viewport-sized captures of each home chapter, for the visual improvement loop.
 *
 *   REVAMP_BASE_URL=http://127.0.0.1:4280 node scripts/revamp-chapters.mjs loop-1 [--widths 1440,390]
 *
 * Real captures of the running app, written to docs/revamp/<label>/chapters/.
 * Also reports horizontal overflow and console errors; either makes the run fail.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const label = args.find((arg) => !arg.startsWith("--")) ?? "loop";
const widthsArg = args.includes("--widths")
  ? args[args.indexOf("--widths") + 1].split(",").map(Number)
  : [1440, 390];
const baseUrl = process.env.REVAMP_BASE_URL ?? "http://127.0.0.1:4273";
const outDir = path.join(root, "docs", "revamp", label, "chapters");
const heights = { 1440: 900, 1920: 1080, 768: 1024, 390: 844 };
const chapters = ["introduction", "horizon", "experience", "work", "depth", "writing", "contact"];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const problems = [];

for (const width of widthsArg) {
  for (const theme of ["dark", "light"]) {
    const context = await browser.newContext({
      viewport: { width, height: heights[width] ?? 900 },
      colorScheme: theme,
      hasTouch: width < 800,
      isMobile: width < 500,
    });
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error")
        problems.push(`${width}/${theme}: console ${message.text().slice(0, 200)}`);
    });
    page.on("pageerror", (error) => problems.push(`${width}/${theme}: ${String(error)}`));
    await page.addInitScript((value) => localStorage.setItem("portfolio-theme", value), theme);
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);

    for (const id of chapters) {
      const selector = id === "horizon" ? ".horizon" : `#${id}`;
      const found = await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) return false;
        const top = element.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: Math.max(0, top - 72), behavior: "instant" });
        return true;
      }, selector);
      if (!found) {
        problems.push(`${width}/${theme}: missing ${selector}`);
        continue;
      }
      await page.waitForTimeout(1300);
      await page.screenshot({ path: path.join(outDir, `${id}-${width}-${theme}.png`) });
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    if (overflow > 1) problems.push(`${width}/${theme}: horizontal overflow ${overflow}px`);
    await context.close();
  }
}

await browser.close();
if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`chapter shots written to ${outDir}`);
