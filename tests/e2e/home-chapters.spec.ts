import { expect, test } from "@playwright/test";
import { homeChapters } from "../../src/components/home/chapters";

test.describe("home chapters", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
  });

  test("every chapter is on the page, in story order", async ({ page }) => {
    const tops = await page.evaluate(
      (ids) =>
        ids.map((id) => {
          const node = document.getElementById(id);
          return node ? node.getBoundingClientRect().top + window.scrollY : null;
        }),
      homeChapters.map((chapter) => chapter.id)
    );
    expect(tops).not.toContain(null);
    const sorted = [...(tops as number[])].sort((a, b) => a - b);
    expect(tops).toEqual(sorted);
  });

  test("the rail reaches every chapter directly, clear of the fixed header", async ({ page }) => {
    const rail = page.getByRole("navigation", { name: "Chapters on this page" });
    for (const chapter of homeChapters.slice(1)) {
      await rail.locator(`a[href="#${chapter.id}"]`).click();
      await expect(page).toHaveURL(new RegExp(`#${chapter.id}$`));
      await expect
        .poll(async () =>
          page.evaluate((id) => {
            const header = document.querySelector(".site-header");
            const node = document.getElementById(id);
            if (!header || !node) throw new Error(`Missing header or #${id}`);
            const top = node.getBoundingClientRect().top;
            // The chapter starts in the top third of the screen and its heading is not under the header.
            const heading = node.querySelector("h2");
            const headingTop = heading ? heading.getBoundingClientRect().top : top;
            return (
              top < window.innerHeight / 3 && headingTop >= header.getBoundingClientRect().bottom
            );
          }, chapter.id)
        )
        .toBe(true);
    }
  });
});
