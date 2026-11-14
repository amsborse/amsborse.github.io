import { expect, test } from "@playwright/test";

test.describe("design heroes", () => {
  test("Editorial keeps the island plate and renders no design hero", async ({ page }) => {
    await page.goto("/?design=editorial");
    await expect(page.locator("[aria-labelledby='hero-heading']")).toHaveAttribute(
      "data-hero-ready",
      "true",
      { timeout: 30_000 }
    );
    await expect(page.getByTestId("design-hero")).toHaveCount(0);
  });

  test("Blueprint draws the topology and a node opens the inspector", async ({ page }) => {
    await page.goto("/?design=blueprint");
    const hero = page.getByTestId("design-hero");
    await expect(hero).toHaveAttribute("data-design-hero", "blueprint");
    const node = hero.getByRole("button", { name: "Inspect Model Inference" });
    await node.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toContainText("Model Inference");
  });

  test("Broadsheet prints the halftone plate and a caption part opens the inspector", async ({
    page,
  }) => {
    await page.goto("/?design=broadsheet");
    const hero = page.getByTestId("design-hero");
    await expect(hero).toHaveAttribute("data-design-hero", "broadsheet");
    await expect(hero.locator("canvas.design-plate")).toHaveAttribute("data-ready", "true", {
      timeout: 15_000,
    });
    await hero.getByRole("button", { name: "Data Storage" }).click();
    await expect(page.getByRole("dialog")).toContainText("Data Storage");
  });
});
