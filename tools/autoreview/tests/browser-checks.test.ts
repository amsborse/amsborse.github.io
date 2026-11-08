// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
import { findBrokenImages } from "../src/browser-runner.ts";
import { isUserClickable } from "../src/interaction-runner.ts";

// One transparent pixel, served for every *.png the page asks for except missing.png.
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

let browser: Browser;
let page: Page;

async function load(html: string) {
  await page.route("http://review.test/**", (route) => {
    const url = route.request().url();
    if (url.endsWith("/")) return route.fulfill({ contentType: "text/html", body: html });
    if (url.endsWith("missing.png")) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ contentType: "image/png", body: PIXEL });
  });
  await page.goto("http://review.test/", { waitUntil: "load" });
}

beforeAll(async () => {
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser?.close();
});

describe("browser checks", () => {
  it("does not flag a lazy image below the fold that has not loaded yet", async () => {
    page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    // Regression: lazy project images reported as broken GitHub Pages assets.
    await load(`
      <img src="/projects/ok.png" alt="">
      <img src="/missing.png" alt="">
      <div style="height:6000px"></div>
      <img loading="lazy" src="/projects/later.png" alt="">`);
    expect(await findBrokenImages(page, "/")).toEqual(["/missing.png"]);
    await page.close();
  }, 30_000);

  it("only treats real, visible controls as clickable", async () => {
    page = await browser.newPage();
    // Regression: the review clicked an sr-only live region and timed out.
    await load(`
      <style>.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}</style>
      <button data-testid="go">Go</button>
      <p class="sr-only" aria-live="polite" data-testid="caption">Status</p>
      <p data-testid="text">Plain copy</p>
      <button class="sr-only" data-testid="hidden-button">Skip</button>`);
    const clickable = async (id: string) =>
      isUserClickable(page.locator(`[data-testid='${id}']`).first());
    expect(await clickable("go")).toBe(true);
    expect(await clickable("caption")).toBe(false);
    expect(await clickable("text")).toBe(false);
    expect(await clickable("hidden-button")).toBe(false);
    await page.close();
  }, 30_000);
});
