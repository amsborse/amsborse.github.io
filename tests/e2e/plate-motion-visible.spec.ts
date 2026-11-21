import { expect, test, type Locator, type Page } from "@playwright/test";

// Measures real WebGL output, which the frame governor stills under CPU contention: this file
// runs in its own project after the rest of the suite, one test at a time.
test.describe.configure({ mode: "serial" });

/** Copies the plate's current frame into a small 2D canvas inside the page and returns its RGBA
 * pixels. Unlike a Playwright screenshot this costs a few milliseconds, so the measurement itself
 * cannot stall frames and trip the governor in a software-rendered test browser. */
const SAMPLE = { w: 480, h: 300 };
function sample(page: Page) {
  return page.evaluate(
    ({ w, h }) =>
      new Promise<number[]>((resolve) =>
        requestAnimationFrame(() => {
          const gl = document.querySelector<HTMLCanvasElement>(".page-stage .plate-life")!;
          const cv = new OffscreenCanvas(w, h);
          const x = cv.getContext("2d")!;
          x.drawImage(gl, 0, 0, w, h);
          resolve(Array.from(x.getImageData(0, 0, w, h).data));
        })
      ),
    SAMPLE
  );
}

/** Share of pixels (0-100) that changed by more than a small threshold between two samples. */
function changedPct(a: number[], b: number[]) {
  let moved = 0;
  for (let i = 0; i < a.length; i += 4) {
    const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    if (d > 12) moved++;
  }
  return (100 * moved) / (a.length / 4);
}

/** Motion over 0.7 s, taken only from a pair of samples at one resolution: a governor step to a
 * lower DPR between them would count every pixel as motion. */
async function measureMotion(page: Page, art: Locator) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const dpr = await art.getAttribute("data-dpr");
    const a = await sample(page);
    await page.waitForTimeout(700);
    const b = await sample(page);
    if ((await art.getAttribute("data-dpr")) === dpr) return changedPct(a, b);
  }
  throw new Error("The plate kept changing resolution; motion could not be measured");
}

/**
 * Regression: the first plate-life shader animated so faintly (under 0.4% of the art changing in
 * 0.7 s) that the plates read as still images. The lake, falls and lanterns must visibly move.
 */
for (const path of ["/about", "/experience", "/projects", "/writing"]) {
  test(`page plate visibly moves on ${path}`, async ({ page }) => {
    test.setTimeout(30_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => localStorage.setItem("portfolio-theme", "dark"));
    await page.goto(`${path}?ambient=off`);
    const renderer = await page.evaluate(() => {
      const gl = document.createElement("canvas").getContext("webgl");
      const info = gl?.getExtension("WEBGL_debug_renderer_info");
      return info ? String(gl!.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "unknown";
    });
    // Software GL cannot hold these plates' frame budget, so the governor stills them by design;
    // a pass or fail there would measure the runner, not the shader. Reported as a skip.
    test.skip(
      /SwiftShader|llvmpipe|unknown/i.test(renderer),
      `no GPU on this runner (${renderer})`
    );
    const art = page.locator(".page-stage .plate-life").first();
    await expect(art).toHaveAttribute("data-ready", "true");
    await page.waitForTimeout(1500);
    const moved = await measureMotion(page, art);
    // The frame governor rightly stills a plate on a starved machine; that is not a pass.
    await expect(art).toHaveAttribute("data-state", "running");
    console.log(`${path} motion ${moved.toFixed(2)}% dpr ${await art.getAttribute("data-dpr")}`);
    expect(moved).toBeGreaterThan(0.8);
  });
}

/** Mean brightness (0-255) of the plate inside a box given in plate pixels, read from the live
 * WebGL canvas through its published view rectangle. */
function lanternBrightness(page: Page, box: { x: number; y: number; rx: number; ry: number }) {
  return page.evaluate(
    (box) =>
      new Promise<number>((resolve, reject) => {
        // A read can land on a cleared drawing buffer and return pure black; that is not a
        // brightness of the plate, so read again on the next frame (bounded).
        let tries = 0;
        const read = () => {
          const gl = document.querySelector<HTMLCanvasElement>(".page-stage .plate-life")!;
          const [vx, vy, vw, vh] = gl.dataset.view!.split(",").map(Number);
          const sx = gl.width / vw;
          const sy = gl.height / vh;
          const x = Math.round((box.x - box.rx - vx) * sx);
          const y = Math.round((box.y - box.ry - vy) * sy);
          const w = Math.max(1, Math.round(2 * box.rx * sx));
          const h = Math.max(1, Math.round(2 * box.ry * sy));
          const cv = new OffscreenCanvas(w, h);
          const c = cv.getContext("2d")!;
          c.drawImage(gl, x, y, w, h, 0, 0, w, h);
          const d = c.getImageData(0, 0, w, h).data;
          let sum = 0;
          for (let i = 0; i < d.length; i += 4)
            sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          if (sum > 0) resolve(sum / (d.length / 4));
          else if (++tries < 10) requestAnimationFrame(read);
          else reject(new Error("The plate canvas read back blank 10 frames in a row"));
        };
        requestAnimationFrame(read);
      }),
    box
  );
}

/**
 * Regression: the lanterns' flicker was light added on top of an already bright pane, so it
 * washed out and read as a still image (the lantern's brightness swung about 3% over 4 s). A
 * flame must visibly dim and surge.
 */
const LANTERNS = [
  { path: "/about", theme: "dark", box: { x: 1365, y: 510, rx: 27, ry: 23 } },
  { path: "/about", theme: "light", box: { x: 1362, y: 506, rx: 32, ry: 16 } },
] as const;
for (const { path, theme, box } of LANTERNS) {
  test(`lantern visibly flickers on ${path} in ${theme}`, async ({ page }) => {
    test.setTimeout(30_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript((t) => localStorage.setItem("portfolio-theme", t), theme);
    await page.goto(`${path}?ambient=off`);
    const renderer = await page.evaluate(() => {
      const gl = document.createElement("canvas").getContext("webgl");
      const info = gl?.getExtension("WEBGL_debug_renderer_info");
      return info ? String(gl!.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "unknown";
    });
    test.skip(
      /SwiftShader|llvmpipe|unknown/i.test(renderer),
      `no GPU on this runner (${renderer})`
    );
    const art = page.locator(".page-stage .plate-life").first();
    await expect(art).toHaveAttribute("data-ready", "true");
    await page.waitForTimeout(1000);
    const levels: number[] = [];
    for (let i = 0; i < 40; i++) {
      levels.push(await lanternBrightness(page, box));
      await page.waitForTimeout(100);
    }
    await expect(art).toHaveAttribute("data-state", "running");
    const mean = levels.reduce((a, b) => a + b, 0) / levels.length;
    const swing = (100 * (Math.max(...levels) - Math.min(...levels))) / mean;
    console.log(`${path} ${theme} lantern swing ${swing.toFixed(1)}% (mean ${mean.toFixed(0)})`);
    expect(swing).toBeGreaterThan(20);
  });
}
