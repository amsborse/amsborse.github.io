import type { Page } from "playwright";

/**
 * Stabilize the page before comparison screenshots.
 * Does not freeze the animation being actively reviewed.
 */
export async function stabilizeForScreenshot(
  page: Page,
  options?: { freezeUnrelatedAnimations?: boolean; hideDevOverlays?: boolean }
): Promise<void> {
  await page.evaluate(() => {
    // Ensure zoom / scale assumptions in page context
    document.documentElement.style.setProperty("zoom", "1");
  });

  try {
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });
  } catch {
    /* ignore */
  }

  await page
    .evaluate(async () => {
      const imgs = [...document.images];
      await Promise.all(
        imgs.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.addEventListener("load", () => resolve(), { once: true });
                img.addEventListener("error", () => resolve(), { once: true });
              })
        )
      );
    })
    .catch(() => undefined);

  await page.evaluate((freezeUnrelated) => {
    // Disable caret blinking
    const style = document.createElement("style");
    style.setAttribute("data-autoreview-stabilize", "1");
    style.textContent = `
      *, *::before, *::after { caret-color: transparent !important; }
      input, textarea { caret-color: transparent !important; }
    `;
    if (freezeUnrelated) {
      style.textContent += `
        [data-decorative-motion], .lenis, body > .bg-motion {
          animation-play-state: paused !important;
          transition: none !important;
        }
      `;
    }
    document.documentElement.appendChild(style);

    // Hide common dev overlays
    for (const sel of [
      "#webpack-dev-server-client-overlay",
      "vite-error-overlay",
      "[data-vite-dev-id]",
    ]) {
      document.querySelectorAll(sel).forEach((el) => {
        (el as HTMLElement).style.display = "none";
      });
    }
  }, options?.freezeUnrelatedAnimations !== false);

  if (options?.hideDevOverlays !== false) {
    /* already handled */
  }

  // Seed stable clock when page exposes hook
  await page
    .evaluate(() => {
      const w = window as unknown as { __AR_STABLE_NOW?: number };
      w.__AR_STABLE_NOW = Date.parse("2026-07-13T12:00:00.000Z");
    })
    .catch(() => undefined);

  await page.waitForTimeout(50);
}

export async function captureStableElementScreenshot(
  page: Page,
  selector: string,
  filePath: string,
  options?: { fullPageFallback?: boolean }
): Promise<"element" | "page" | "failed"> {
  await stabilizeForScreenshot(page);
  const loc = page.locator(selector).first();
  try {
    if (await loc.count()) {
      await loc.screenshot({ path: filePath, animations: "disabled" });
      return "element";
    }
  } catch {
    /* fall through */
  }
  if (options?.fullPageFallback !== false) {
    try {
      await page.screenshot({ path: filePath, fullPage: false, animations: "disabled" });
      return "page";
    } catch {
      return "failed";
    }
  }
  return "failed";
}
