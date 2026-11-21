import { expect, test } from "@playwright/test";

const state = (page: import("@playwright/test").Page) =>
  page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    motion: document.documentElement.dataset.themeMotion ?? null,
    x: document.documentElement.style.getPropertyValue("--reveal-x"),
  }));

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => localStorage.setItem("portfolio-theme", "dark"));
  await page.goto("/about?ambient=off");
});

test("theme switch reveals the new theme as a circle grown from the toggle", async ({ page }) => {
  const toggle = page.locator("button.theme-toggle >> visible=true").first();
  const box = (await toggle.boundingBox())!;
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await toggle.click();
  const during = await state(page);
  expect(during.motion).toBe("reveal");
  // The theme flips inside the transition, once the old page has been captured.
  await expect.poll(async () => (await state(page)).theme, { timeout: 2_000 }).toBe("light");
  // The circle is centred on the button that was pressed.
  expect(Math.abs(parseFloat(during.x) - (box.x + box.width / 2))).toBeLessThan(2);

  await expect.poll(async () => (await state(page)).motion, { timeout: 4_000 }).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("portfolio-theme"))).toBe("light");
  expect(errors).toEqual([]);
});

test("a click during the reveal still reaches its target", async ({ page }) => {
  const toggle = page.locator("button.theme-toggle >> visible=true").first();
  await toggle.click();
  await page.waitForTimeout(200);
  await toggle.click();
  await expect.poll(async () => (await state(page)).theme, { timeout: 4_000 }).toBe("dark");
  await expect.poll(async () => (await state(page)).motion, { timeout: 4_000 }).toBeNull();
});

test("reduced motion switches the theme at once, without a transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("button.theme-toggle >> visible=true").first().click();
  expect(await state(page)).toMatchObject({ theme: "light", motion: null });
});
