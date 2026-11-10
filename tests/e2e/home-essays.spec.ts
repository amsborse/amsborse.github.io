import { expect, test } from "@playwright/test";

/**
 * The home page parses the essays only when the writing chapter nears the screen, and early
 * enough that a reader scrolling down never sees the list fill in or push the page.
 */
for (const width of [360, 412, 1440]) {
  test(`home essays are loaded before they scroll into view at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 823 });
    await page.goto("/?heroTime=12");
    const list = page.locator("#writing ol.essays");
    await page.waitForTimeout(1000);
    await expect(list.locator("li")).toHaveCount(0);

    // Note where the list sits at the moment it fills, while the reader scrolls down.
    await list.evaluate((node) => {
      const w = window as unknown as { __filledAt?: number };
      new MutationObserver((_, observer) => {
        if (node.querySelectorAll("a.essay").length === 3) {
          w.__filledAt = node.getBoundingClientRect().top;
          observer.disconnect();
        }
      }).observe(node, { childList: true, subtree: true });
    });
    for (let step = 0; step < 80; step += 1) {
      const top = await list.evaluate((node) => node.getBoundingClientRect().top);
      if (top < 823) break;
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(60);
    }
    await expect(list.locator("li a.essay")).toHaveCount(3);
    const filledAt = await page.evaluate(
      () => (window as unknown as { __filledAt?: number }).__filledAt
    );
    expect(filledAt).toBeGreaterThan(823);
  });
}

test("the reserved essay rows fit the loaded list closely", async ({ page }) => {
  for (const width of [360, 412, 768, 1440]) {
    await page.setViewportSize({ width, height: 823 });
    await page.goto("/?heroTime=12");
    const list = page.locator("#writing ol.essays");
    const reserved = await list.evaluate((node) => node.getBoundingClientRect().height);
    await list.scrollIntoViewIfNeeded();
    await expect(list.locator("li a.essay")).toHaveCount(3);
    const loaded = await list.evaluate((node) => node.getBoundingClientRect().height);
    expect(Math.abs(loaded - reserved), `width ${width}`).toBeLessThan(loaded * 0.12);
  }
});
