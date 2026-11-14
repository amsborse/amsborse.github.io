import { expect, test } from "@playwright/test";

// At phone width the "Project archive →" link used to wrap onto two lines, leaving the arrow on
// its own line under the text.
test.describe("selected work intro on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the project archive link stays on one line", async ({ page }) => {
    await page.goto("/");
    const link = page.locator(".selected-work__intro > a");
    await link.scrollIntoViewIfNeeded();
    // Every text fragment of the link starts within a few pixels of the first one.
    const spread = await link.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const tops = [...range.getClientRects()].map((r) => r.top);
      return Math.max(...tops) - Math.min(...tops);
    });
    expect(spread).toBeLessThan(6);
  });
});
