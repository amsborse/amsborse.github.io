import { expect, test } from "@playwright/test";

/**
 * Inner pages load lazily. The footer used to sit inside the first screen next to the short
 * loading placeholder and jump down once the page arrived (CLS 0.34–0.55 on every inner page).
 */
const routes = [
  "/experience",
  "/projects",
  "/arsenal/writing",
  "/arsenal/writing/designing-for-reliability",
  "/about",
  "/learning",
];

for (const viewport of [
  { width: 1350, height: 940 },
  { width: 412, height: 823 },
]) {
  test.describe(`layout shift at ${viewport.width}px`, () => {
    test.use({ viewport });

    for (const route of routes) {
      test(`${route} loads without moving the footer`, async ({ page }) => {
        await page.addInitScript(() => {
          (window as unknown as { __cls: number }).__cls = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as unknown as Array<{
              value: number;
              hadRecentInput: boolean;
            }>) {
              if (!entry.hadRecentInput)
                (window as unknown as { __cls: number }).__cls += entry.value;
            }
          }).observe({ type: "layout-shift", buffered: true });
        });
        await page.goto(route, { waitUntil: "networkidle" });
        await page.waitForTimeout(1500);
        const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
        expect(cls).toBeLessThan(0.1);
      });
    }
  });
}
