import { expect, test } from "@playwright/test";

// The fixed header was 90% opaque with a blur, so text scrolling under it showed through as a
// ghost on phones. Its backing must be solid in both themes.
for (const theme of ["dark", "light"] as const) {
  test(`the site header has a solid backing in ${theme} mode`, async ({ page }) => {
    await page.goto("/about");
    const alpha = await page.evaluate((t) => {
      document.documentElement.dataset.theme = t;
      const color = getComputedStyle(document.querySelector(".site-header")!).backgroundColor;
      const parts = color.match(/[\d.]+/g)!.map(Number);
      return parts.length === 4 ? parts[3] : 1;
    }, theme);
    expect(alpha).toBe(1);
  });
}
