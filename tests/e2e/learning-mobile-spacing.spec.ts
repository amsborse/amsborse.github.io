import { expect, test } from "@playwright/test";

// On phones the flashcards section sat about 155px below the last topic card, a band of empty
// paper that read as dead space on a 390px screen. Desktop keeps its wider editorial gap.
test.describe("learning page spacing on phones", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("flashcards eyebrow sits close to the last topic card", async ({ page }) => {
    await page.goto("/learning");
    const section = page.locator("#flashcards");
    await section.scrollIntoViewIfNeeded();
    const gap = await page.evaluate(() => {
      const label = document.querySelector("#flashcards p")!.getBoundingClientRect().top;
      const cards = [...document.querySelectorAll("#flashcards")].map(
        (s) => s.previousElementSibling!.getBoundingClientRect().bottom
      );
      return label - cards[0];
    });
    expect(gap).toBeLessThan(110);
  });
});
