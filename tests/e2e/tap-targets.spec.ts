import { expect, test } from "@playwright/test";

// WCAG 2.5.8: pointer targets are at least 24 by 24 CSS pixels.
const MIN = 24;

test.describe("mobile tap targets", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("hero secondary links and footer links are at least 24px tall", async ({ page }) => {
    await page.goto("/");
    const targets = [
      ...(await page.locator(".hero-secondary-link").all()),
      ...(await page.locator("footer .link-editorial").all()),
    ];
    expect(targets.length).toBeGreaterThanOrEqual(5);
    for (const target of targets) {
      const box = await target.boundingBox();
      expect(box, await target.innerText()).not.toBeNull();
      expect(box!.height, await target.innerText()).toBeGreaterThanOrEqual(MIN);
    }
  });
});
