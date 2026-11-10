/**
 * Main-thread probe: loads pages on a phone viewport with 4x CPU throttling (like Lighthouse
 * mobile) and prints blocking time from long tasks plus LCP. Faster than a full Lighthouse run,
 * for comparing changes. Needs a server on REVAMP_BASE_URL (e.g. `npx vite preview --port 4275`).
 *
 *   REVAMP_BASE_URL=http://127.0.0.1:4275 node scripts/revamp-tbt.mjs / /projects "/?stage=classic"
 */
import { chromium } from "@playwright/test";

const base = process.env.REVAMP_BASE_URL ?? "http://127.0.0.1:4275";
const routes = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const runs = Number(process.env.REVAMP_RUNS ?? 3);
const reduced = process.argv.includes("--reduced");

const browser = await chromium.launch();
for (const route of routes.length ? routes : ["/"]) {
  const results = [];
  for (let run = 0; run < runs; run += 1) {
    const context = await browser.newContext({
      viewport: { width: 412, height: 823 },
      deviceScaleFactor: 1.75,
      isMobile: true,
      hasTouch: true,
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.addInitScript(() => {
      const w = window;
      w.__tasks = [];
      w.__lcp = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          w.__tasks.push({ start: entry.startTime, duration: entry.duration });
      }).observe({ type: "longtask", buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) w.__lcp = entry.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    });
    await page.goto(base + route, { waitUntil: "load" });
    await page.waitForTimeout(6000);
    const data = await page.evaluate(() => ({ tasks: window.__tasks, lcp: window.__lcp }));
    const tbt = data.tasks.reduce((sum, task) => sum + Math.max(0, task.duration - 50), 0);
    const longest = Math.max(0, ...data.tasks.map((task) => task.duration));
    if (process.argv.includes("--tasks") && run === 0)
      console.log(
        data.tasks.map((task) => `${Math.round(task.start)}+${Math.round(task.duration)}`).join(" ")
      );
    results.push({ tbt, lcp: data.lcp, longest, count: data.tasks.length });
    await context.close();
  }
  const median = (key) => results.map((r) => r[key]).sort((a, b) => a - b)[Math.floor(runs / 2)];
  console.log(
    `${route}${reduced ? " (reduced)" : ""}: TBT ${Math.round(median("tbt"))}ms, LCP ${Math.round(median("lcp"))}ms, longest ${Math.round(median("longest"))}ms, tasks ${median("count")}`
  );
}
await browser.close();
