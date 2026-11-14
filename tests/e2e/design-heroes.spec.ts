import { expect, test } from "@playwright/test";

test.describe("design heroes", () => {
  test("Editorial keeps the island plate and renders no design hero", async ({ page }) => {
    await page.goto("/?design=editorial");
    await expect(page.locator("[aria-labelledby='hero-heading']")).toHaveAttribute(
      "data-hero-ready",
      "true",
      { timeout: 30_000 }
    );
    await expect(page.getByTestId("design-hero")).toHaveCount(0);
  });

  test("Blueprint draws the topology and a node opens the inspector", async ({ page }) => {
    await page.goto("/?design=blueprint");
    const hero = page.getByTestId("design-hero");
    await expect(hero).toHaveAttribute("data-design-hero", "blueprint");
    const node = hero.getByRole("button", { name: "Inspect Model Inference" });
    await node.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toContainText("Model Inference");
  });

  test("Broadsheet prints its own engraving, not the island, and a caption part opens the inspector", async ({
    page,
  }) => {
    await page.goto("/?design=broadsheet");
    const hero = page.getByTestId("design-hero");
    await expect(hero).toHaveAttribute("data-design-hero", "broadsheet");
    const engraving = hero.locator("canvas.bs-hero__engraving");
    await expect(engraving).toHaveAttribute("data-ready", "true", { timeout: 15_000 });
    await expect(hero.locator(".design-plate")).toHaveCount(0);
    await expect(hero.locator("img[src*='plate-']")).toHaveCount(0);
    // The engraving has real ink on it once printed in.
    await expect
      .poll(
        () =>
          engraving.evaluate((canvas: HTMLCanvasElement) => {
            const context = canvas.getContext("2d");
            if (!context || canvas.width === 0) return 0;
            const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
            const first = [data[0], data[1], data[2]];
            let differing = 0;
            for (let i = 0; i < data.length; i += 4 * 97) {
              if (
                Math.abs(data[i] - first[0]) +
                  Math.abs(data[i + 1] - first[1]) +
                  Math.abs(data[i + 2] - first[2]) >
                60
              )
                differing += 1;
            }
            return differing;
          }),
        { timeout: 10_000 }
      )
      .toBeGreaterThan(200);
    await hero.getByRole("button", { name: "Data Storage" }).click();
    await expect(page.getByRole("dialog")).toContainText("Data Storage");
  });
});

test.describe("design chapter plates", () => {
  for (const [design, treatment] of [
    ["broadsheet", "engraving"],
    ["blueprint", "contour"],
  ] as const) {
    test(`${design} draws the about chapter's own ${treatment}, never the cinematic photo`, async ({
      page,
    }) => {
      const photos: string[] = [];
      page.on("request", (request) => {
        if (request.url().includes("/assets/cinematic/")) photos.push(request.url());
      });
      await page.goto(`/about?design=${design}`);
      const plate = page.locator(`.page-stage canvas.design-plate--${treatment}`);
      await expect(plate).toHaveAttribute("data-chapter", "about");
      await expect(plate).toHaveAttribute("data-ready", "true", { timeout: 15_000 });
      const inked = await plate.evaluate((canvas: HTMLCanvasElement) => {
        const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
        let count = 0;
        for (let i = 3; i < data.length; i += 4 * 53) if (data[i] > 40) count += 1;
        return count;
      });
      expect(inked).toBeGreaterThan(300);
      expect(photos).toEqual([]);
    });
  }
});
