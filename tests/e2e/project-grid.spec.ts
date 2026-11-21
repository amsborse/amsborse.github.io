import { test, expect } from "@playwright/test";
import { showcase } from "../../src/data/showcase";
import { THEME_STORAGE_KEY } from "../../src/theme/theme";

// Allows the brief's dedicated Vite server on :1132; CI uses the configured server.
if (process.env.PROJECT_GRID_BASE_URL) {
  test.use({ baseURL: process.env.PROJECT_GRID_BASE_URL });
}

for (const route of ["/", "/projects"]) {
  for (const theme of ["dark", "light"] as const) {
    for (const viewport of [
      { width: 1440, height: 900, columns: 3 },
      { width: 800, height: 900, columns: 2 },
      { width: 390, height: 844, columns: 1 },
    ]) {
      test(`Project grid: ${route} ${theme} ${viewport.width}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
          key: THEME_STORAGE_KEY,
          value: theme,
        });
        await page.goto(route);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

        const grid = page.locator(".showcase-grid");
        const cards = grid.locator("article");
        await expect(cards).toHaveCount(showcase.length);
        await expect(grid.locator("img")).toHaveCount(0);
        await expect(page.locator(".sutra-embed .hero-scene")).toHaveAttribute(
          "src",
          /projects\/sutra-dawn\.webp$/
        );
        expect(
          await grid.evaluate(
            (element) => getComputedStyle(element).gridTemplateColumns.split(" ").length
          )
        ).toBe(viewport.columns);

        for (const [index, project] of showcase.entries()) {
          const card = cards.nth(index);
          await card.scrollIntoViewIfNeeded();
          await expect(grid.locator(".showcase-grid__item").nth(index)).toHaveAttribute(
            "data-visible",
            "true"
          );
          // The shared shell starts transparent unless its entrance animation or this override runs.
          await expect(grid.locator(".showcase-card").nth(index)).toHaveCSS("opacity", "1");
          await expect(
            card.getByRole("heading", { name: project.title, exact: true })
          ).toBeVisible();
          await expect(card.locator(".showcase-card__summary")).toHaveText(project.summary);
          await expect(card.locator(".showcase-card__stack li")).toHaveText(project.tags);
          await expect(card.locator(".showcase-emblem")).toHaveCount(1);
          for (const link of project.links) {
            await expect(card.getByRole("link", { name: link.label })).toHaveAttribute(
              "href",
              link.href
            );
          }
        }

        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          viewport.width
        );

        if (viewport.width !== 800) {
          await grid.scrollIntoViewIfNeeded();
          await page.waitForTimeout(900); // Let the finite reveal and emblem draw settle.
          const name = `${route === "/" ? "home" : "projects"}-${theme}-${viewport.width}x${viewport.height}`;
          await grid.screenshot({ path: `.codex-shots/${name}-grid.png` });
          await page.screenshot({ path: `.codex-shots/${name}-viewport.png` });
        }
      });
    }
  }
}

test("Project emblems remain still for reduced motion and respond to keyboard focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects");
  const card = page.locator(".showcase-card").nth(1);
  const emblem = card.locator(".showcase-emblem");
  await card.scrollIntoViewIfNeeded();
  await card.getByRole("link", { name: "Live" }).focus();
  await expect(emblem).toHaveCSS("transform", "none");
  await expect(emblem).toHaveCSS("transition-duration", "0s");
  await expect(emblem.locator(".showcase-emblem__thread")).toHaveCSS("animation-name", "none");

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(emblem).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, -3)");
});
