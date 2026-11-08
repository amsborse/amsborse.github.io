import { spawn } from "node:child_process";
import { mkdir, access, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shotsDir = path.join(root, "docs", "hero", "shots");
const fallbackDir = path.join(root, "public", "hero");
const baseUrl = process.env.HERO_BASE_URL ?? "http://127.0.0.1:4173";
const previewArgs = [
  "run",
  "preview",
  "--",
  "--host",
  "127.0.0.1",
  "--port",
  "4173",
  "--strictPort",
];
let preview;

async function isReady() {
  try {
    const response = await fetch(baseUrl);
    return response.ok;
  } catch {
    return false;
  }
}

if (!(await isReady())) {
  preview = spawn("npm", previewArgs, {
    cwd: root,
    shell: process.platform === "win32",
    windowsHide: true,
    stdio: "ignore",
  });
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (preview.exitCode !== null) throw new Error(`vite preview exited with ${preview.exitCode}`);
    if (await isReady()) {
      ready = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) {
    preview.kill();
    throw new Error(`vite preview did not become ready at ${baseUrl}`);
  }
}

await mkdir(shotsDir, { recursive: true });
await mkdir(fallbackDir, { recursive: true });
let browser;
const desktopMetrics = {};

async function capture(name, query = "", options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport ?? { width: 1672, height: 941 },
    deviceScaleFactor: 1,
    reducedMotion: options.reducedMotion ? "reduce" : "no-preference",
    colorScheme: options.light ? "light" : "dark",
  });
  const page = await context.newPage();
  if (options.light) {
    await page.addInitScript(() => localStorage.setItem("portfolio-theme", "light"));
  }
  await page.goto(`${baseUrl}/${query ? `?${query}` : ""}`, { waitUntil: "networkidle" });
  if (options.light) {
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  }
  await page.evaluate(async () => {
    await document.fonts.ready;
    const fallback = document.querySelector(".hero-plate-art, .hero-static-art");
    if (fallback instanceof HTMLImageElement && fallback.complete)
      await fallback.decode().catch(() => undefined);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.waitForFunction(
    () =>
      document
        .querySelector("[aria-labelledby='hero-heading']")
        ?.getAttribute("data-hero-ready") === "true",
    undefined,
    { timeout: 30_000 }
  );
  await page.evaluate(async () => {
    const hero = document.querySelector("[aria-labelledby='hero-heading']");
    const fallback = document.querySelector(".hero-plate-art, .hero-static-art");
    if (
      hero?.getAttribute("data-hero-renderer") === "static" &&
      fallback instanceof HTMLImageElement
    ) {
      await fallback.decode().catch(() => undefined);
    }
  });
  if (options.openConsole) {
    await page.getByRole("button", { name: "Explore the system" }).click();
  }
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(shotsDir, `${name}.png`), fullPage: false });
  if (
    (name === "desktop-idle" || name === "desktop-idle-3d") &&
    ["plate", "webgl"].includes(
      await page.locator("[aria-labelledby='hero-heading']").getAttribute("data-hero-renderer")
    )
  ) {
    const renderer = await page
      .locator("[aria-labelledby='hero-heading']")
      .getAttribute("data-hero-renderer");
    const box = await page.locator("[aria-labelledby='hero-heading']").boundingBox();
    // The 3D scene still uses the cropped fallback image; the plate is its own fallback.
    if (box && renderer === "webgl") {
      await page.screenshot({
        path: path.join(fallbackDir, "hero-fallback.png"),
        clip: {
          x: Math.round(box.x + box.width * 0.43),
          y: Math.round(box.y + box.height * 0.08),
          width: Math.round(box.width * 0.57),
          height: Math.round(box.height * 0.82),
        },
      });
    }
    await page.waitForFunction(
      () =>
        document
          .querySelector("[aria-labelledby='hero-heading']")
          ?.hasAttribute("data-hero-drawcalls"),
      undefined,
      { timeout: 8_000 }
    );
    const frameRate = await page.evaluate(async () => {
      const start = performance.now();
      let frames = 0;
      await new Promise((resolve) => {
        const sample = (time) => {
          frames++;
          if (time - start < 2000) requestAnimationFrame(sample);
          else resolve();
        };
        requestAnimationFrame(sample);
      });
      return Math.round((frames / ((performance.now() - start) / 1000)) * 10) / 10;
    });
    desktopMetrics[name] = await page
      .locator("[aria-labelledby='hero-heading']")
      .evaluate((element) => ({
        renderer: element.getAttribute("data-hero-renderer"),
        drawCalls: Number(element.getAttribute("data-hero-drawcalls")),
        triangles: Number(element.getAttribute("data-hero-triangles")),
      }));
    desktopMetrics[name].fps = frameRate;
  }
  await context.close();
}

try {
  browser = await chromium.launch({
    headless: true,
    args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
  });
  await capture("desktop-idle", "heroTime=12&heroState=idle&heroCamera=wide");
  await capture("desktop-idle-3d", "hero=3d&heroTime=12&heroState=idle&heroCamera=wide");
  await capture("node-hover", "heroTime=12&heroState=hover:inference&heroCamera=node");
  await capture("request-processing", "heroTime=12&heroState=request:1.1&heroCamera=wide");
  await capture("failure", "heroTime=12&heroState=failure:inference&heroCamera=wide");
  await capture("recovery", "heroTime=12&heroState=recover:inference&heroCamera=wide");
  await capture("console-open", "heroTime=12&heroState=failure:inference&heroCamera=wide", {
    openConsole: true,
  });
  await capture("console-open-light", "heroTime=12&heroState=idle&heroCamera=wide", {
    openConsole: true,
    light: true,
  });
  await capture("console-open-mobile", "heroTime=12&heroState=idle&heroCamera=wide", {
    openConsole: true,
    viewport: { width: 390, height: 844 },
  });
  await capture("mobile-390x844", "heroTime=12&heroState=idle&heroCamera=wide", {
    viewport: { width: 390, height: 844 },
  });
  await capture("tablet-834x1112", "heroTime=12&heroState=idle&heroCamera=wide", {
    viewport: { width: 834, height: 1112 },
  });
  await capture("reduced-motion", "heroTime=12&heroState=idle&heroCamera=wide", {
    reducedMotion: true,
  });
  await capture("light-theme", "heroTime=12&heroState=idle&heroCamera=wide", { light: true });
  await capture("webgl-unavailable", "heroWebGL=off&heroTime=12&heroState=idle&heroCamera=wide");
  await access(path.join(fallbackDir, "hero-fallback.png"));
  await writeFile(
    path.join(shotsDir, "performance.json"),
    `${JSON.stringify(desktopMetrics, null, 2)}\n`
  );
  process.stdout.write(
    `Captured 11 hero states in ${shotsDir}; desktop metrics: ${JSON.stringify(desktopMetrics)}\n`
  );
} finally {
  if (browser) await browser.close();
  if (preview && preview.exitCode === null) preview.kill();
}
