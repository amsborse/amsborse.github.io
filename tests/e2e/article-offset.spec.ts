import { expect, test } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`article back link clears the fixed header at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/arsenal/writing/designing-for-reliability");

    const backLink = page.locator('nav[aria-label="Breadcrumb"] a');
    await expect(backLink).toBeVisible();

    const edges = await page.evaluate(() => {
      const header = document.querySelector(".site-header");
      const backLink = document.querySelector<HTMLElement>('nav[aria-label="Breadcrumb"] a');
      if (!header || !backLink) throw new Error("Article header or back link is missing.");
      return {
        headerBottom: header.getBoundingClientRect().bottom,
        backLinkTop: backLink.getBoundingClientRect().top,
      };
    });

    expect(edges.backLinkTop).toBeGreaterThanOrEqual(edges.headerBottom);
  });
}
