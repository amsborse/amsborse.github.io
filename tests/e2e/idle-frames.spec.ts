import { expect, test, type Page } from "@playwright/test";

/** Counts every requestAnimationFrame call the page makes, from any caller. */
async function countFrameRequests(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __frameRequests: number };
    w.__frameRequests = 0;
    const request = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      w.__frameRequests++;
      return request(cb);
    };
  });
}
const frameRequests = (page: Page) =>
  page.evaluate(() => (window as unknown as { __frameRequests: number }).__frameRequests);

async function requestsPerSecondWhileIdle(page: Page, ms = 2000) {
  const before = await frameRequests(page);
  await page.waitForTimeout(ms);
  return ((await frameRequests(page)) - before) / (ms / 1000);
}

test.describe("idle pages draw nothing", () => {
  test("home, scrolled past every canvas, stops requesting frames", async ({ page }) => {
    await countFrameRequests(page);
    await page.goto("/");
    await page.locator("footer").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    expect(await requestsPerSecondWhileIdle(page)).toBeLessThan(5);
  });

  test("home hero camera does not settle while the hero only touches the top edge", async ({
    page,
  }) => {
    await countFrameRequests(page);
    await page.goto("/");
    await page.waitForTimeout(1500);
    // Jump so the hero's bottom edge sits exactly on the top of the viewport.
    await page.evaluate(() => {
      const hero = document.querySelector(".hero-plate")!;
      window.scrollTo(0, hero.getBoundingClientRect().bottom + window.scrollY);
    });
    // Let the sections below finish their one-off reveal; the hero loops must be the only thing
    // that could still be asking for frames.
    await page.waitForTimeout(2500);
    expect(await requestsPerSecondWhileIdle(page, 1500)).toBeLessThan(5);
  });

  test("a wheel still glides smoothly, then the page goes quiet again", async ({ page }) => {
    await countFrameRequests(page);
    await page.goto("/about");
    await page.waitForTimeout(800);
    // Wheel from the exact centre: the stage plate leans toward an off-centre pointer and eases
    // back for a second or two, which is pointer motion, not idle drawing.
    const view = page.viewportSize() ?? { width: 1280, height: 720 };
    await page.mouse.move(view.width / 2, view.height / 2);
    const positions: number[] = [];
    await page.mouse.wheel(0, 600);
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(60);
      positions.push(await page.evaluate(() => window.scrollY));
    }
    // A Lenis glide passes through several in-between positions on its way down.
    expect(new Set(positions.filter((y) => y > 0)).size).toBeGreaterThanOrEqual(4);
    expect(positions.at(-1)).toBeGreaterThan(300);
    await page.waitForTimeout(2000);
    expect(await requestsPerSecondWhileIdle(page)).toBeLessThan(5);
  });
});

test.describe("reduced motion stops looping animations", () => {
  for (const route of ["/", "/learning"]) {
    test(`${route} has no infinite animation running`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(route);
      await page.waitForTimeout(1000);
      const looping = await page.evaluate(() =>
        document
          .getAnimations()
          .filter(
            (a) =>
              a.playState === "running" && a.effect?.getComputedTiming().iterations === Infinity
          )
          .map((a) => (a as CSSAnimation).animationName ?? "waapi")
      );
      expect(looping).toEqual([]);
    });
  }
});
