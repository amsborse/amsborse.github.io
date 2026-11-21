/** Run against `npx vite --port 1131 --host 127.0.0.1`.
 * Artifacts are local only: node scripts/verify-plate-life.mjs [base-url] */
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const base = process.argv[2] ?? "http://127.0.0.1:1131";
const output = new URL("../.codex-shots/", import.meta.url);
await mkdir(output, { recursive: true });
let browser;
const results = { screenshots: [], shaderPrograms: 0, measurements: [], failures: [] };
const scenes = ["about", "experience", "projects", "writing", "learning", "contact"];
try {
  browser = await chromium.launch();
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 2,
      reducedMotion: "no-preference",
    });
    await context.addInitScript(() => {
      // Count context acquisitions, so a theme swap cannot accidentally allocate another.
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (...args) {
        if (args[0] === "webgl")
          this.dataset.contextRequests = String(Number(this.dataset.contextRequests ?? 0) + 1);
        return Reflect.apply(getContext, this, args);
      };
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => results.failures.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && message.text().includes("Plate life:"))
        results.failures.push(message.text());
    });
    const ready = async (selector) => {
      await page.locator(selector).scrollIntoViewIfNeeded();
      await page.waitForFunction(
        (selector) => document.querySelector(selector)?.dataset.ready === "true",
        selector,
        { timeout: 15000 }
      );
      await page.waitForTimeout(700);
    };
    const shot = async (label) => {
      const path = new URL(`${label}-${viewport.width}.png`, output);
      await page.screenshot({ path: fileURLToPath(path) });
      results.screenshots.push(path.href);
    };
    for (const theme of ["dark", "light"]) {
      for (const scene of scenes) {
        await page.goto(`${base}/${scene}`);
        await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme);
        const selector = `.plate-life[data-plate="${scene}"]`;
        await ready(selector);
        await shot(`${scene}-${theme}`);
        const dimensions = await page.locator(selector).evaluate((canvas) => {
          const image = canvas.parentElement.querySelector("img");
          const a = canvas.getBoundingClientRect(),
            b = image.getBoundingClientRect();
          return {
            delta: Math.max(
              Math.abs(a.x - b.x),
              Math.abs(a.y - b.y),
              Math.abs(a.width - b.width),
              Math.abs(a.height - b.height)
            ),
            dpr: Number(canvas.dataset.dpr),
            source: image.currentSrc,
          };
        });
        assert.ok(dimensions.delta < 1, `${scene}/${theme}: canvas must share the image box`);
        assert.ok(dimensions.dpr <= (viewport.width <= 720 ? 1 : 1.5));
        assert.equal(dimensions.source.includes("-960.webp"), viewport.width <= 720);
      }
      await page.goto(base);
      await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme);
      for (const scene of ["horizon", "contact"]) {
        await ready(`.plate-life[data-plate="${scene}"]`);
        await shot(`home-${scene}-${theme}`);
      }
    }
    await page.goto(`${base}/experience`);
    await ready('.plate-life[data-plate="experience"]');
    const timing = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const canvas = document.querySelector('.plate-life[data-plate="experience"]');
          const startFrames = Number(canvas.dataset.frames);
          const start = performance.now();
          const deltas = [];
          let previous = start;
          const tick = (now) => {
            deltas.push(now - previous);
            previous = now;
            if (now - start < 3000) requestAnimationFrame(tick);
            else {
              deltas.sort((a, b) => a - b);
              resolve({
                medianRafMs: deltas[Math.floor(deltas.length / 2)],
                draws: Number(canvas.dataset.frames) - startFrames,
                durationMs: now - start,
                state: canvas.dataset.state,
              });
            }
          };
          requestAnimationFrame(tick);
        })
    );
    assert.equal(timing.state, "running", "A performance result needs an active renderer");
    assert.ok(
      timing.draws <= Math.ceil((timing.durationMs / 1000) * 30) + 2,
      "Draw rate must stay capped"
    );
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForFunction(
      () =>
        document.querySelector('.plate-life[data-plate="experience"]').dataset.state === "paused"
    );
    const before = await page.locator(".plate-life").getAttribute("data-frames");
    await page.waitForTimeout(1000);
    const after = await page.locator(".plate-life").getAttribute("data-frames");
    const offscreenFrames = Number(after) - Number(before);
    assert.equal(offscreenFrames, 0);
    results.measurements.push({ viewport, ...timing, offscreenFrames });

    await page.evaluate(() => window.scrollTo(0, 0));
    await ready(".plate-life");
    await page.locator(".plate-life").evaluate((canvas) => {
      window.__experienceCanvas = canvas;
    });
    await page.evaluate(() => {
      document.documentElement.dataset.theme =
        document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    });
    await ready(".plate-life");
    assert.equal(
      await page
        .locator(".plate-life")
        .evaluate(
          (canvas) => canvas === window.__experienceCanvas && canvas.dataset.contextRequests === "1"
        ),
      true,
      "Theme updates must reuse the canvas and context"
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => !document.querySelector(".plate-life"));
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await ready(".plate-life");

    if (!results.shaderPrograms) {
      results.shaderPrograms = await page.evaluate(async () => {
        const { PLATE_LIFE_MAPS } = await import("/src/components/stage/plateLifeMaps.ts");
        const { buildLifeFragment } = await import("/src/components/stage/plateLife.ts");
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl");
        if (!gl) throw new Error("No WebGL for shader validation");
        let count = 0;
        const vertex = `attribute vec2 aPos; varying vec2 vUv; void main(){vUv=aPos*0.5+0.5;gl_Position=vec4(aPos,0.0,1.0);}`;
        try {
          for (const [name, themes] of Object.entries(PLATE_LIFE_MAPS)) {
            for (const theme of ["dark", "light"]) {
              const program = gl.createProgram();
              const shaders = [];
              try {
                for (const [type, source] of [
                  [gl.VERTEX_SHADER, vertex],
                  [gl.FRAGMENT_SHADER, buildLifeFragment(themes[theme], theme)],
                ]) {
                  const shader = gl.createShader(type);
                  shaders.push(shader);
                  gl.shaderSource(shader, source);
                  gl.compileShader(shader);
                  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
                    throw new Error(`${name}/${theme}: ${gl.getShaderInfoLog(shader)}`);
                  gl.attachShader(program, shader);
                }
                gl.linkProgram(program);
                if (!gl.getProgramParameter(program, gl.LINK_STATUS))
                  throw new Error(gl.getProgramInfoLog(program));
                count++;
              } finally {
                shaders.forEach((shader) => gl.deleteShader(shader));
                gl.deleteProgram(program);
              }
            }
          }
        } finally {
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        }
        return count;
      });
    }
    await context.close();
  }
  assert.deepEqual(results.failures, []);
} catch (error) {
  results.failures.push(error.message);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await writeFile(new URL("verification.json", output), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}
