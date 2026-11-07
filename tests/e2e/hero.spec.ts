import { expect, test } from "@playwright/test";

test.describe("home hero", () => {
  test("renders a WebGL scene or the static fallback", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator("[aria-labelledby='hero-heading']");
    await expect(hero).toHaveAttribute("data-hero-renderer", /^(webgl|static)$/);
    await expect(hero).toHaveAttribute("data-hero-ready", "true", { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Clarity under load." })).toBeVisible();
  });

  test("keyboard opens service details and Escape restores focus", async ({ page }) => {
    await page.goto("/");
    const picker = page.getByRole("combobox", { name: "Choose service to inspect" });
    await picker.focus();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    const inspect = page.getByRole("button", { name: "Inspect service" });
    await inspect.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toContainText("Observability");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(inspect).toBeFocused();
  });

  test("request, failure and recovery update the live caption", async ({ page }) => {
    // Recovery lasts RECOVERY_SEC (2.4 s) on the page clock. Under software WebGL a click
    // can take longer than that, so hold the clock while asserting each caption.
    await page.clock.install();
    await page.goto("/");
    await page.clock.pauseAt(Date.now() + 1_000);
    const caption = page.getByTestId("hero-caption");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(caption).toContainText("A request enters the gateway");
    await page.getByRole("button", { name: "Simulate failure" }).click();
    await expect(caption).toContainText("Model Inference is down");
    await page.getByRole("button", { name: "Recover" }).click();
    await expect(caption).toContainText("Model Inference is back");
  });

  test("respects reduced motion while keeping controls usable", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("[aria-labelledby='hero-heading']")).toHaveAttribute(
      "data-hero-ready",
      "true",
      { timeout: 30_000 }
    );
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByTestId("hero-caption")).toContainText("A request enters the gateway");
  });

  // Regression: with bloom off (light theme, lower tiers, reduced motion) the scene
  // drew nothing, and draw-call stats counted only the last post-processing pass.
  for (const variant of [
    { name: "dark desktop", theme: "dark", viewport: { width: 1440, height: 900 } },
    { name: "light desktop", theme: "light", viewport: { width: 1440, height: 900 } },
    { name: "dark mobile", theme: "dark", viewport: { width: 390, height: 844 } },
  ]) {
    test(`draws the full scene in ${variant.name}`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("portfolio-theme", t), variant.theme);
      await page.setViewportSize(variant.viewport);
      await page.goto("/?heroTime=12&heroState=idle");
      const hero = page.locator("[aria-labelledby='hero-heading']");
      await expect(hero).toHaveAttribute("data-hero-ready", "true", { timeout: 30_000 });
      test.skip(
        (await hero.getAttribute("data-hero-renderer")) !== "webgl",
        "WebGL unavailable in this browser; static fallback is covered above"
      );
      await expect(hero).toHaveAttribute("data-hero-drawcalls", /\d+/, { timeout: 8_000 });
      await expect
        .poll(async () => Number(await hero.getAttribute("data-hero-drawcalls")), {
          timeout: 8_000,
        })
        .toBeGreaterThan(20);
      await expect
        .poll(async () => Number(await hero.getAttribute("data-hero-triangles")), {
          timeout: 8_000,
        })
        .toBeGreaterThan(5_000);
    });
  }
});
