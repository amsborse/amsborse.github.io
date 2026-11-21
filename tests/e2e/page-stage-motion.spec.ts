import { expect, test } from "@playwright/test";

/**
 * Inner-page plates animate while on screen. A reader who turns on reduced motion while the
 * page is open must see that stop at once, without reloading.
 */
test("page stage stops its live motion when reduced motion is turned on mid-visit", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/about");
  const stage = page.locator(".page-stage").first();
  await expect(stage).toHaveAttribute("data-live", "true");
  const canvas = stage.locator(".plate-life");
  const mist = stage.locator(".page-stage__mist");
  await expect(canvas).toHaveAttribute("data-ready", "true");
  const firstFrames = Number(await canvas.getAttribute("data-frames"));
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-frames")))
    .toBeGreaterThan(firstFrames);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(canvas).toHaveCount(0);
  await expect(mist).toHaveCSS("animation-name", "none");
  await expect(stage).not.toHaveAttribute("data-live", "true");

  // Pointer lean is off as well: moving the pointer leaves the plate where it is.
  await page.mouse.move(100, 100);
  await page.mouse.move(1300, 800, { steps: 8 });
  await page.waitForTimeout(400);
  const lean = await stage.evaluate((node) => node.style.getPropertyValue("--lean-x"));
  expect(lean === "" || Number(lean) === 0).toBe(true);

  // Turning reduced motion off again brings the stage back to life.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(stage).toHaveAttribute("data-live", "true");
  await expect(canvas).toHaveAttribute("data-ready", "true");
});

test("page plate stops drawing while the section is offscreen", async ({ page }) => {
  await page.goto("/experience");
  const canvas = page.locator('.plate-life[data-plate="experience"]');
  await expect(canvas).toHaveAttribute("data-ready", "true");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(canvas).toHaveAttribute("data-state", "paused");
  const frames = await canvas.getAttribute("data-frames");
  await page.waitForTimeout(350);
  await expect(canvas).toHaveAttribute("data-frames", frames!);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-frames")))
    .toBeGreaterThan(Number(frames));
});
