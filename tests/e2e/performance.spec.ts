import { expect, test, type Page } from "@playwright/test";

/** Counts clearRect calls on the site-wide particle canvas, i.e. how often it redraws. */
async function countParticleFrames(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __particleFrames: number };
    w.__particleFrames = 0;
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.classList.contains("fixed")) w.__particleFrames++;
      return clear.apply(this, args);
    };
  });
}
const frames = (page: Page) =>
  page.evaluate(() => (window as unknown as { __particleFrames: number }).__particleFrames);

test.describe("background particles cost", () => {
  test("under reduced motion they redraw on scroll, not every frame", async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    await countParticleFrames(page);
    await page.goto("/");
    await expect(page.locator("canvas.fixed")).toHaveCount(1);
    await page.waitForTimeout(800);
    const settled = await frames(page);
    await page.waitForTimeout(1000);
    expect(await frames(page)).toBe(settled);
    // Scroll parallax is not motion the user asked to drop: the picture still follows it.
    await page.mouse.wheel(0, 600);
    await expect.poll(() => frames(page)).toBeGreaterThan(settled);
    await context.close();
  });

  test("keep animating without input when motion is allowed", async ({ page }) => {
    await countParticleFrames(page);
    await page.goto("/");
    await expect(page.locator("canvas.fixed")).toHaveCount(1);
    const start = await frames(page);
    await page.waitForTimeout(1000);
    // The headless test browser draws in software, so only "still redrawing" is asserted.
    expect((await frames(page)) - start).toBeGreaterThan(3);
  });

  test("never draw above 2x pixels on a 3x phone", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto("/");
    const canvas = page.locator("canvas.fixed");
    await expect(canvas).toHaveCount(1);
    await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.width)).toBeGreaterThan(0);
    const { width, css } = await canvas.evaluate((c: HTMLCanvasElement) => ({
      width: c.width,
      css: c.getBoundingClientRect().width,
    }));
    expect(width).toBeLessThanOrEqual(Math.round(css * 2));
    await context.close();
  });
});
