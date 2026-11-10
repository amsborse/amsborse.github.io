import { expect, test } from "@playwright/test";

// The left contents never scroll on their own: they fit the screen, or (for very long essays
// on short screens) keep the current section in view without a scrollbar.
const essays = [
  "should-you-have-a-purpose-or-a-goal-in-life",
  "what-yogis-knew-about-emotions-that-neuroscience-is-just-catching-up-to",
];

for (const [width, height] of [
  [1536, 864],
  [1280, 720],
]) {
  for (const slug of essays) {
    test(`contents fit one screen on ${slug} at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(`/arsenal/writing/${slug}`);
      const nav = page.locator(".article-contents nav");
      await expect(nav).toBeAttached();
      const state = await nav.evaluate((node) => ({
        overflowY: getComputedStyle(node).overflowY,
        fits: node.scrollHeight <= node.clientHeight + 1,
        bottom: node.getBoundingClientRect().bottom,
        fit: node.closest<HTMLElement>(".article-contents")?.dataset.fit,
      }));
      expect(state.overflowY).toBe("hidden");
      expect(state.bottom).toBeLessThanOrEqual(height);
      if (state.fit !== "window") expect(state.fits).toBe(true);

      // Reading on: the highlighted entry stays inside the visible list.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.6));
      const current = page.locator('.article-contents [aria-current="location"]');
      await expect(current).toHaveCount(1);
      await expect
        .poll(async () => {
          const [box, list] = await Promise.all([current.boundingBox(), nav.boundingBox()]);
          return !!box && !!list && box.y >= list.y && box.y + box.height <= list.y + list.height;
        })
        .toBe(true);
    });
  }
}

test("an essay's own contents list is hidden and the time left counts down", async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 864 });
  await page.goto("/arsenal/writing/motivation-works-in-bursts-life-doesnt");
  const body = page.locator("#article-body");
  await expect(body.getByRole("heading", { name: "Table of Contents" })).toBeHidden();
  await expect(body.getByRole("heading", { name: /Days That Don.t Add Up/ })).toBeVisible();
  await expect(page.locator(".article-contents a", { hasText: "Table of Contents" })).toHaveCount(
    0
  );

  const left = page.locator(".article-time-left");
  const minutes = async () => Number((await left.textContent())?.match(/(\d+) min left/)?.[1]);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.12));
  await expect(left).toHaveAttribute("data-visible", "true");
  await expect(left).toContainText(/\d+ min left/);
  const start = await minutes();
  expect(start).toBeGreaterThan(1);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.55));
  await expect.poll(minutes).toBeLessThan(start);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(left).toContainText("Finished");
});
