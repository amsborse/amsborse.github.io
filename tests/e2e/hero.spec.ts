import { expect, test } from "@playwright/test";

test.describe("home hero", () => {
  test("renders the art plate, a WebGL scene or the static fallback", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator("[aria-labelledby='hero-heading']");
    await expect(hero).toHaveAttribute("data-hero-renderer", /^(plate|webgl|static)$/);
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
    test(`draws the full 3D scene in ${variant.name}`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("portfolio-theme", t), variant.theme);
      await page.setViewportSize(variant.viewport);
      await page.goto("/?hero=3d&heroTime=12&heroState=idle");
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

  test.describe("art plate", () => {
    const hero = (page: import("@playwright/test").Page) =>
      page.locator("[aria-labelledby='hero-heading']");

    test("loads the plate and its live layer by default", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.addInitScript(() => localStorage.setItem("portfolio-theme", "dark"));
      await page.goto("/?heroTime=12&heroState=idle");
      await expect(hero(page)).toHaveAttribute("data-hero-ready", "true", { timeout: 30_000 });
      const art = page.locator(".hero-plate-art");
      await expect(art).toHaveAttribute("src", /plate-dark/);
      await expect
        .poll(() => art.evaluate((img: HTMLImageElement) => img.naturalWidth))
        .toBeGreaterThan(0);
      const renderer = await hero(page).getAttribute("data-hero-renderer");
      expect(["plate", "static"]).toContain(renderer);
      if (renderer === "plate") {
        await expect(page.locator(".hero-plate-canvas")).toHaveAttribute("data-ready", "true");
      }
      await expect(page.locator(".hero-plate-hotspot")).toHaveCount(7);
    });

    test("uses the light plate in the light theme", async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("portfolio-theme", "light"));
      await page.goto("/");
      await expect(page.locator(".hero-plate-art")).toHaveAttribute("src", /plate-light/);
    });

    test("heroWebGL=off keeps the plate as a static image", async ({ page }) => {
      await page.goto("/?heroWebGL=off");
      await expect(hero(page)).toHaveAttribute("data-hero-renderer", "static");
      await expect(hero(page)).toHaveAttribute("data-hero-ready", "true");
      await expect(page.locator(".hero-plate-art")).toBeVisible();
    });

    test("a module hotspot opens its details", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/?heroTime=12&heroState=idle");
      await page.getByRole("button", { name: "Model Inference details" }).click();
      await expect(page.getByRole("dialog")).toContainText("Model Inference");
    });

    test("a failed service marks its hotspot", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/?heroTime=12&heroState=failure:inference");
      await expect(page.locator(".hero-plate-hotspot[data-service='inference']")).toHaveClass(
        /is-failed/
      );
    });

    // Regression: on tablet the callout labels were hidden but their leader lines stayed.
    test("callout labels and leader lines show and hide together", async ({ page }) => {
      for (const [width, visible] of [
        [1440, true],
        [834, false],
      ] as const) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/?heroTime=12&heroState=idle");
        const callouts = page.locator(".hero-plate-callout");
        const leaders = page.locator(".hero-plate-leader");
        await expect(leaders.first()).toBeAttached();
        const shown = async (loc: typeof leaders) =>
          await loc.evaluateAll(
            (els) => els.filter((el) => getComputedStyle(el).display !== "none").length
          );
        expect(await shown(callouts)).toBe(visible ? await callouts.count() : 0);
        expect(await shown(leaders)).toBe(visible ? await leaders.count() : 0);
      }
    });

    // Regression: the right-hand callouts ran past the viewport edge at desktop widths.
    test("callouts stay inside the viewport on desktop", async ({ page }) => {
      for (const width of [1440, 1280, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/?heroTime=12&heroState=idle");
        const callouts = page.locator(".hero-plate-callout");
        await expect(callouts.first()).toBeVisible();
        const overflow = await callouts.evaluateAll(
          (els) =>
            els
              .map((el) => el.getBoundingClientRect())
              .filter((r) => r.left < 0 || r.right > window.innerWidth).length
        );
        expect(overflow, `at ${width}px`).toBe(0);
      }
    });

    // Regression: a clipped callout peeked out from behind the open info panel.
    test("callouts give way while the info panel is open", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/?heroTime=12&heroState=failure:inference");
      await expect(page.locator("#hero-info-title")).toBeVisible();
      await expect(page.locator(".hero-plate-callout")).toHaveCount(0);
      await expect(page.locator(".hero-plate-leader")).toHaveCount(0);
    });

    test("callout captions are distinct per service", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/?heroTime=12&heroState=idle");
      const captions = await page.locator(".hero-plate-callout-text > span").allTextContents();
      expect(captions.length).toBeGreaterThan(1);
      expect(new Set(captions).size).toBe(captions.length);
    });
  });
});
