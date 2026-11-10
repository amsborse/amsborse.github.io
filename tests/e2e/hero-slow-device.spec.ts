import { expect, test } from "@playwright/test";

/**
 * Regression from the mid-revamp Lighthouse pass: on a slow phone (4x CPU throttle, WebGL drawn
 * in software) every ambient hero frame was a ~95ms long task, so the home page kept the main
 * thread blocked for as long as it was open. The plate must settle on a still frame instead.
 */
test("the hero stops blocking the main thread on a slow phone", async ({ browser }) => {
  test.setTimeout(60_000);
  const context = await browser.newContext({
    viewport: { width: 412, height: 823 },
    deviceScaleFactor: 1.75,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.addInitScript(() => {
    const w = window as unknown as { __tasks: { start: number; duration: number }[] };
    w.__tasks = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        w.__tasks.push({ start: entry.startTime, duration: entry.duration });
    }).observe({ type: "longtask", buffered: true });
  });
  await page.goto("/", { waitUntil: "load" });
  await expect(page.locator(".hero-plate-canvas[data-ready='true']")).toBeAttached({
    timeout: 20_000,
  });
  // Give the governor time to judge, then measure a quiet window.
  await page.waitForTimeout(4000);
  const from = await page.evaluate(() => performance.now());
  await page.waitForTimeout(3000);
  const tasks = await page.evaluate(
    (start) =>
      (window as unknown as { __tasks: { start: number; duration: number }[] }).__tasks
        .filter((task) => task.start >= start)
        .map((task) => Math.round(task.duration)),
    from
  );
  const ambient = await page.locator(".hero-plate-canvas").getAttribute("data-ambient");
  await context.close();
  const blocking = tasks.reduce((sum, duration) => sum + Math.max(0, duration - 50), 0);
  expect(blocking, `ambient=${ambient} long tasks=${tasks.join(",")}`).toBeLessThan(300);
});
