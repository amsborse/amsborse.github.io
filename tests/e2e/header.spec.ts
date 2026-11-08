import { expect, test } from "@playwright/test";

test.describe("site header", () => {
  test("monogram goes home and the contact pill goes to the contact section", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/projects");
    const header = page.locator("header");
    await header.getByRole("link", { name: /Akshay Borse, home/ }).click();
    await expect(page).toHaveURL(/\/$/);
    await header.getByRole("link", { name: /Get in touch/ }).click();
    await expect(page).toHaveURL(/\/about#contact$/);
  });

  test("profile links point at real profiles and open in a new tab", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const links = page.getByRole("list", { name: "Profiles" }).getByRole("link");
    await expect(links).toHaveCount(3);
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute("href", /^https:\/\//);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
      await expect(link).toHaveAttribute("aria-label", /opens in a new tab/);
    }
  });

  for (const width of [1024, 1280, 1672]) {
    test(`nav is centred and nothing overflows at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const nav = page.locator("header nav").first();
      const box = await nav.boundingBox();
      expect(box).not.toBeNull();
      const centre = box!.x + box!.width / 2;
      expect(Math.abs(centre - width / 2)).toBeLessThan(24);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
