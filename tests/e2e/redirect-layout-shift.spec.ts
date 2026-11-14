import { expect, test } from "@playwright/test";

// An old route that redirects (/arsenal -> /projects) used to paint one empty frame, so the footer
// flashed near the top and then jumped down: a layout shift of about 0.17 at tablet width.
test.describe("redirected routes do not shift the layout", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("/arsenal lands on /projects with cumulative layout shift under 0.1", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        })[]) {
          if (!entry.hadRecentInput) w.__cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto("/arsenal");
    await expect(page).toHaveURL(/\/projects$/);
    await page.waitForTimeout(2500);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls).toBeLessThan(0.1);
  });
});
