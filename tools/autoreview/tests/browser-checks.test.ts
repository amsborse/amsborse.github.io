// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
import { findBrokenImages, prepareReviewPage } from "../src/browser-runner.ts";
import { runDeterministicChecks } from "../src/deterministic-checks.ts";
import { isUserClickable } from "../src/interaction-runner.ts";
import { runDecorativeLineValidation } from "../src/visual/decorative-lines.ts";
import { runLayoutGeometryValidation } from "../src/visual/geometry.ts";
import { runTypographyValidation } from "../src/visual/typography.ts";

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

  it("runs evaluate callbacks compiled with keepNames", async () => {
    // Regression: under tsx a named inner function is emitted as __name(fn, "name"), which
    // made every advanced visual check throw "__name is not defined" in the browser.
    const compiled =
      '(() => { const pick = __name(function pick(x) { return x * 2; }, "pick"); return pick(21); })()';
    page = await browser.newPage();
    await load("<p>ok</p>");
    await expect(page.evaluate(compiled)).rejects.toThrow(/__name is not defined/);
    await prepareReviewPage(page);
    await page.reload({ waitUntil: "load" });
    expect(await page.evaluate(compiled)).toBe(42);
    await page.close();
  }, 30_000);

  it("reports overlaps when one element overlaps several others", async () => {
    // Regression: Playwright returns a DOMRect that appears twice as null, so a paragraph
    // under two badges crashed the check with "reading 'x'" and the visual suite was skipped.
    page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    await prepareReviewPage(page);
    await load(`
      <main style="position:relative;padding:24px">
        <p style="margin:0;font-size:20px">A sentence of body copy under two badges</p>
        <button class="badge" style="position:absolute;top:24px;left:60px">New</button>
        <button class="badge" style="position:absolute;top:24px;left:200px">Beta</button>
      </main>`);
    const { findings } = await runLayoutGeometryValidation(page, "/", "main");
    expect(findings.filter((f) => f.category === "overlap").length).toBeGreaterThanOrEqual(2);
    await page.close();
  }, 30_000);

  it("judges overlap by the text itself, not by page wrappers", async () => {
    // Regression: a fixed header over a full-page <main> was reported as "overlapping content"
    // and "hidden behind a fixed header" although no text touched; real collisions must remain.
    page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    await prepareReviewPage(page);
    const shell = (top: number) => `
      <header style="position:fixed;top:0;left:0;right:0;height:64px;z-index:50">
        <a href="/">Home</a></header>
      <main id="main" style="position:relative;z-index:10">
        <div><p style="margin:0;padding-top:${top}px">Body copy</p></div>
      </main>`;
    await load(shell(120));
    const clean = await runDeterministicChecks(page, "/");
    expect(clean.findings.filter((f) => f.category === "overlap")).toEqual([]);
    expect(clean.findings.filter((f) => /fixed header/.test(f.explanation))).toEqual([]);
    await page.unroute("http://review.test/**");
    await load(shell(0).replace("padding-top:0px", "position:relative;z-index:0"));
    const collided = await runDeterministicChecks(page, "/");
    expect(collided.findings.filter((f) => f.category === "overlap").length).toBeGreaterThan(0);
    await page.close();
  }, 30_000);

  it("ignores scenery layers and off-screen skip links", async () => {
    // Regression: the hero's pointer-events:none art layer was reported as overlapping every
    // headline and button above it, and the parked skip link as hidden behind the header.
    page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    await prepareReviewPage(page);
    const html = (backdrop: string) => `
      <a href="#main" style="position:absolute;left:-9999px;top:16px;z-index:100">Skip to content</a>
      <header style="position:fixed;top:0;left:0;right:0;height:64px;z-index:50"><a href="/">Home</a></header>
      <main id="main" style="padding-top:80px">
        <section style="position:relative;height:500px">
          <div class="art" style="${backdrop}">
            <span style="position:absolute;left:520px;top:40px">Gateway</span>
          </div>
          <div style="position:relative;z-index:1;width:480px">
            <h1 style="margin:0">Headline over the scene</h1>
            <a href="/work">View work</a>
          </div>
        </section>
      </main>`;
    const scenery = "position:absolute;inset:0;z-index:0;pointer-events:none";
    await load(html(scenery));
    const geometry = await runLayoutGeometryValidation(page, "/", "main");
    expect(geometry.findings.filter((f) => f.category === "overlap")).toEqual([]);
    const det = await runDeterministicChecks(page, "/");
    expect(det.findings.filter((f) => /fixed header/.test(f.explanation))).toEqual([]);
    // The same layer drawn above the copy and catching clicks is still a real overlap.
    await page.unroute("http://review.test/**");
    await load(html("position:absolute;inset:0;z-index:5"));
    const covered = await runLayoutGeometryValidation(page, "/", "main");
    expect(covered.findings.filter((f) => f.category === "overlap").length).toBeGreaterThan(0);
    await page.close();
  }, 30_000);

  it("does not flag wrappers, hidden controls, sr-only captions or icons in their own button", async () => {
    // Regression: the hero review failed on (a) a fixed header "overlapping" <main> and
    // <section> wrappers (the tag test /button|a|.../ matched any tag containing "a"),
    // (b) "zero size" buttons inside a closed [hidden] panel, (c) "nowrap overflow" on an
    // sr-only live caption, and (d) an icon <path> "intersecting" the button it sits in.
    page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    await prepareReviewPage(page);
    const icon = `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2h12v12H2z"/></svg>`;
    await load(`
      <style>.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}</style>
      <header style="position:fixed;top:0;left:0;right:0;height:64px;z-index:50"><a href="/">Home</a></header>
      <main id="main" style="position:relative">
        <section style="padding-top:96px">
          <h1 style="margin:0">Headline</h1>
          <button>${icon} Explore</button>
          <ul><li>${icon} 28 regions</li></ul>
          <div hidden><button>Send a request</button><select><option>A</option></select></div>
          <p class="sr-only">A live status caption that is much longer than one pixel</p>
        </section>
      </main>`);
    const geometry = await runLayoutGeometryValidation(page, "/", "body");
    expect(geometry.findings.filter((f) => f.category === "overlap")).toEqual([]);
    const det = await runDeterministicChecks(page, "/");
    expect(det.findings.filter((f) => /zero size/.test(f.explanation))).toEqual([]);
    const type = await runTypographyValidation(page, "/", "body");
    expect(type.filter((f) => /nowrap/.test(f.explanation))).toEqual([]);
    const lines = await runDecorativeLineValidation(page, "/", "body");
    expect(lines.findings).toEqual([]);
    await page.close();
  }, 30_000);

  it("still flags real collisions after the wrapper rules", async () => {
    page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    await prepareReviewPage(page);
    await load(`
      <header style="position:fixed;top:0;left:0;right:0;height:64px;z-index:50"><a href="/">Home</a></header>
      <main id="main" style="position:relative">
        <section><p style="margin:0;padding-top:8px">Copy under the header</p>
          <button style="width:0;height:0;padding:0;border:0;overflow:hidden">x</button>
          <svg style="position:absolute;left:0;top:100px" width="400" height="40"><path d="M0 10 L400 30" stroke="black" fill="none"/></svg>
          <p style="position:absolute;left:20px;top:110px;margin:0">Text crossed by a leader line</p>
        </section>
      </main>`);
    const geometry = await runLayoutGeometryValidation(page, "/", "body");
    expect(geometry.findings.filter((f) => f.category === "overlap").length).toBeGreaterThan(0);
    const det = await runDeterministicChecks(page, "/");
    expect(det.findings.filter((f) => /zero size/.test(f.explanation)).length).toBe(1);
    const lines = await runDecorativeLineValidation(page, "/", "body");
    expect(lines.findings.length).toBeGreaterThan(0);
    await page.close();
  }, 30_000);
});
