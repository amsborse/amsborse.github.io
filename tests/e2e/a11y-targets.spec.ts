import { expect, test } from "@playwright/test";

/**
 * Regressions from the mid-revamp Lighthouse pass:
 * - the logo link announced "Akshay Borse, home" while showing the name and role, so voice-control
 *   users saying what they see could not reach it (label-content-name-mismatch);
 * - on phones the hero's service hotspots were 36px circles only 28.5px apart, so they covered
 *   each other (target-size).
 */
test("the logo link's spoken name includes the name and role it shows", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/projects");
  const brand = page.locator("header a.site-brand");
  await expect(brand).not.toHaveAttribute("aria-label", /.*/);
  await expect(brand).toHaveAccessibleName(/Akshay Borse\s+Engineer & Writer\s*, home/i);
});

for (const width of [360, 390, 412]) {
  test(`hero hotspots do not cover each other at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 840 });
    await page.goto("/");
    const rects = await page.$$eval(".hero-plate-hotspot", (nodes) =>
      nodes.map((node) => node.getBoundingClientRect().toJSON() as DOMRect)
    );
    expect(rects.length).toBeGreaterThan(1);
    for (const rect of rects) expect(rect.width).toBeGreaterThanOrEqual(24);
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const a = rects[i];
        const b = rects[j];
        const centres = Math.hypot(
          a.x + a.width / 2 - (b.x + b.width / 2),
          a.y + a.height / 2 - (b.y + b.height / 2)
        );
        expect(centres).toBeGreaterThanOrEqual((a.width + b.width) / 2);
      }
    }
  });
}
