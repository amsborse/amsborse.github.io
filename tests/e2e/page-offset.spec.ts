import { expect, test } from "@playwright/test";

// Regression: the header is fixed and 77px tall, but inner pages opened 64px from the top on
// phones, so the Projects eyebrow and the About stage card slid under it.
// /learning has its own hub layout with a larger offset.
const routes = ["/projects", "/about", "/experience", "/writing"];

for (const width of [390, 700, 1440]) {
  test(`inner pages start below the fixed header at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const route of routes) {
      await page.goto(route);
      const shell = page.locator("#main .article-shell").first();
      await expect(shell).toBeVisible();
      const gap = await page.evaluate(() => {
        const header = document.querySelector("header")!.getBoundingClientRect().bottom;
        const shell = document.querySelector("#main .article-shell")!;
        const pad = parseFloat(getComputedStyle(shell).paddingTop);
        return shell.getBoundingClientRect().top + window.scrollY + pad - header;
      });
      expect(gap, route).toBeGreaterThanOrEqual(16);
    }
  });
}
