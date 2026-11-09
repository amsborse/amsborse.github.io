/**
 * Before/after screenshots for the cinematic revamp.
 *
 *   node scripts/revamp-shots.mjs baseline            # every page, width and theme
 *   node scripts/revamp-shots.mjs after
 *   REVAMP_BASE_URL=https://example.org node scripts/revamp-shots.mjs live --quick
 *   node scripts/revamp-shots.mjs loop --only home,experience --widths 1440,390
 *
 * Shots are real captures of the production build (vite preview), written to
 * docs/revamp/<label>/. Failures are collected and make the run exit non-zero.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const label = args.find((arg) => !arg.startsWith("--")) ?? "after";
const flag = (name) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : (args[index + 1] ?? "");
};
const quick = args.includes("--quick");
const port = Number(process.env.REVAMP_PORT ?? 4273);
const baseUrl = process.env.REVAMP_BASE_URL ?? `http://127.0.0.1:${port}`;
const outDir = path.join(root, "docs", "revamp", label);

const allPages = [
  { id: "home", path: "/" },
  { id: "experience", path: "/experience" },
  { id: "projects", path: "/projects" },
  { id: "writing", path: "/arsenal/writing" },
  { id: "article", path: "/arsenal/writing/designing-for-reliability" },
  { id: "about", path: "/about" },
  { id: "learning", path: "/learning" },
  { id: "resume", path: "/resume" },
  { id: "not-found", path: "/404" },
];
const allWidths = [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

const only = flag("only")?.split(",").filter(Boolean);
const widthsArg = flag("widths")?.split(",").map(Number).filter(Boolean);
const themes = flag("themes")?.split(",").filter(Boolean) ?? ["dark", "light"];
const pages = allPages.filter((page) =>
  only ? only.includes(page.id) : quick ? page.id === "home" : true
);
const widths = allWidths.filter((size) =>
  widthsArg
    ? widthsArg.includes(size.width)
    : quick
      ? size.width === 1440 || size.width === 390
      : true
);

let preview;
async function isReady() {
  try {
    return (await fetch(baseUrl)).ok;
  } catch {
    return false;
  }
}
if (!process.env.REVAMP_BASE_URL && !(await isReady())) {
  preview = spawn(
    "npm",
    ["run", "preview", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: root, shell: process.platform === "win32", windowsHide: true, stdio: "ignore" }
  );
  let ready = false;
  for (let attempt = 0; attempt < 80 && !ready; attempt++) {
    if (preview.exitCode !== null) throw new Error(`vite preview exited with ${preview.exitCode}`);
    ready = await isReady();
    if (!ready) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) {
    preview.kill();
    throw new Error(`vite preview did not become ready at ${baseUrl}`);
  }
}

await mkdir(outDir, { recursive: true });
const failures = [];
const written = [];
const consoleErrors = [];
const browser = await chromium.launch();

async function open(pageDef, size, theme, extra = {}) {
  const context = await browser.newContext({
    viewport: size,
    deviceScaleFactor: 1,
    colorScheme: theme,
    reducedMotion: extra.reducedMotion ? "reduce" : "no-preference",
    hasTouch: size.width < 800,
    isMobile: size.width < 500,
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error")
      consoleErrors.push(`${pageDef.id}@${size.width}/${theme}: ${message.text().slice(0, 240)}`);
  });
  page.on("pageerror", (error) =>
    consoleErrors.push(
      `${pageDef.id}@${size.width}/${theme}: pageerror ${String(error).slice(0, 240)}`
    )
  );
  await page.addInitScript((value) => localStorage.setItem("portfolio-theme", value), theme);
  await page.goto(`${baseUrl}${pageDef.path}${extra.query ?? ""}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (pageDef.id === "home") {
    await page
      .waitForFunction(
        () =>
          document
            .querySelector("[aria-labelledby='hero-heading']")
            ?.getAttribute("data-hero-ready") === "true",
        undefined,
        { timeout: 20_000 }
      )
      .catch(() =>
        failures.push(`${pageDef.id}@${size.width}/${theme}: hero never reported ready`)
      );
  }
  await page.waitForTimeout(600);
  return { context, page };
}

/** Walk the page so scroll-revealed content is visible in the full-page capture. */
async function settleScroll(page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.7);
    const max = () => document.documentElement.scrollHeight - window.innerHeight;
    for (let y = 0; y <= max(); y += step) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((resolve) => setTimeout(resolve, 140));
    }
    window.scrollTo({ top: max(), behavior: "instant" });
    await new Promise((resolve) => setTimeout(resolve, 200));
    window.scrollTo({ top: 0, behavior: "instant" });
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
}

async function shot(page, name, options = {}) {
  const file = path.join(outDir, `${name}.jpg`);
  await page.screenshot({ path: file, type: "jpeg", quality: 78, ...options });
  written.push(path.relative(root, file).replaceAll("\\", "/"));
}

async function run(name, task) {
  try {
    await task();
  } catch (error) {
    failures.push(`${name}: ${String(error).split("\n")[0]}`);
  }
}

for (const pageDef of pages) {
  for (const size of widths) {
    for (const theme of themes) {
      const name = `${pageDef.id}-${size.width}-${theme}`;
      await run(name, async () => {
        const { context, page } = await open(pageDef, size, theme);
        await shot(page, `${name}-top`);
        await settleScroll(page);
        await shot(page, `${name}-full`, { fullPage: true });
        await context.close();
      });
    }
  }
}

if (!quick && !only) {
  const desktop = allWidths[0];
  const mobile = allWidths[3];
  for (const theme of themes) {
    await run(`state-mobile-menu-${theme}`, async () => {
      const { context, page } = await open(allPages[0], mobile, theme);
      await page.locator("button[aria-controls='mobile-nav']").click();
      await page.waitForTimeout(500);
      await shot(page, `state-mobile-menu-${theme}`);
      await context.close();
    });
    await run(`state-home-scrolled-${theme}`, async () => {
      const { context, page } = await open(allPages[0], desktop, theme);
      for (const [index, ratio] of [0.5, 1, 2, 3.2].entries()) {
        await page.evaluate(
          (y) => window.scrollTo({ top: y, behavior: "instant" }),
          Math.round(desktop.height * ratio)
        );
        await page.waitForTimeout(900);
        await shot(page, `state-home-scrolled-${theme}-${index + 1}`);
      }
      await context.close();
    });
    await run(`state-card-hover-${theme}`, async () => {
      for (const id of ["experience", "projects", "writing"]) {
        const { context, page } = await open(
          allPages.find((entry) => entry.id === id),
          desktop,
          theme
        );
        const card = page
          .locator("main article, main a[class*='card'], main [class*='card']")
          .first();
        if (await card.count()) {
          await card.scrollIntoViewIfNeeded();
          await card.hover();
          await page.waitForTimeout(600);
        }
        await shot(page, `state-${id}-hover-${theme}`);
        await context.close();
      }
    });
    await run(`state-reduced-motion-${theme}`, async () => {
      const { context, page } = await open(allPages[0], desktop, theme, { reducedMotion: true });
      await shot(page, `state-home-reduced-motion-${theme}`);
      await context.close();
    });
  }
  // Frame sequence of the hero in motion (animation evidence).
  await run("frames-hero", async () => {
    for (const theme of themes) {
      const { context, page } = await open(allPages[0], desktop, theme);
      for (let frame = 0; frame < 6; frame++) {
        await shot(page, `frames-hero-${theme}-${frame + 1}`);
        await page.waitForTimeout(700);
      }
      await page.mouse.move(980, 420);
      await page.waitForTimeout(700);
      await shot(page, `frames-hero-${theme}-pointer`);
      await context.close();
    }
  });
}

await browser.close();
preview?.kill();
if (process.platform === "win32" && preview?.pid) {
  spawn("taskkill", ["/pid", String(preview.pid), "/T", "/F"], {
    stdio: "ignore",
    windowsHide: true,
  });
}

await writeFile(
  path.join(outDir, "manifest.json"),
  `${JSON.stringify({ label, baseUrl, shots: written, failures, consoleErrors }, null, 2)}\n`
);
console.log(`${written.length} shots → docs/revamp/${label}`);
if (consoleErrors.length)
  console.log(`console errors: ${consoleErrors.length} (see manifest.json)`);
if (failures.length) {
  console.error(`FAILED (${failures.length}):\n${failures.join("\n")}`);
  process.exit(1);
}
