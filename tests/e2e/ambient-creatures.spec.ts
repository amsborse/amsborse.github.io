import { expect, test } from "@playwright/test";

const settled = (page: import("@playwright/test").Page) =>
  page
    .locator("canvas[data-ambient-creatures]")
    .evaluate((c) => Number((c as HTMLCanvasElement).dataset.settled ?? 0));

for (const theme of ["dark", "light"] as const) {
  test(`creatures land on a still cursor over the page art and scatter on move (${theme})`, async ({
    page,
  }) => {
    test.setTimeout(30_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
    await page.goto("/about");
    const canvas = page.locator("canvas[data-ambient-creatures]");
    await expect(canvas).toBeAttached();

    // Regression: the canvas sat below <main>, so creatures perched on the cursor over a plate
    // were hidden behind the art. It must stack above main and below the fixed header.
    const order = await canvas.evaluate((c) => {
      const z = (el: Element | null) => Number(el ? getComputedStyle(el).zIndex : NaN);
      return {
        canvas: z(c),
        main: z(document.getElementById("main")),
        header: z(document.querySelector(".site-header")),
        insideMain: Boolean(c.closest("#main")),
      };
    });
    expect(order.insideMain).toBe(false);
    expect(order.canvas).toBeGreaterThan(order.main);
    expect(order.canvas).toBeLessThan(order.header);

    // Hold the pointer still over the plate art: one to three creatures settle on it.
    const art = await page.locator(".page-stage__art").first().boundingBox();
    expect(art).not.toBeNull();
    const x = Math.round(art!.x + art!.width * 0.7);
    const y = Math.round(art!.y + art!.height * 0.4);
    for (let i = 0; i < 12; i++) await page.mouse.move(x - 120 + i * 10, y + (i % 3) * 8);
    await page.mouse.move(x, y);
    await expect.poll(() => settled(page), { timeout: 12_000 }).toBeGreaterThanOrEqual(1);
    expect(await settled(page)).toBeLessThanOrEqual(3);

    // Moving again startles them off.
    await page.mouse.move(x - 160, y + 90, { steps: 4 });
    await expect.poll(() => settled(page), { timeout: 2_000 }).toBe(0);
  });
}
