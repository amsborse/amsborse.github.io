/**
 * Lighthouse runs for the cinematic revamp (local, free: `npx lighthouse`).
 *
 *   node scripts/revamp-lighthouse.mjs baseline
 *   node scripts/revamp-lighthouse.mjs after --only home,experience
 *
 * Runs against the production build (vite preview), mobile and desktop presets,
 * and writes docs/revamp/lighthouse/<label>/summary.json with the measured scores.
 * A run that fails is recorded as null, never as a number.
 */
import { spawn, spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const label = args.find((arg) => !arg.startsWith("--")) ?? "after";
const onlyIndex = args.indexOf("--only");
const only = onlyIndex === -1 ? undefined : args[onlyIndex + 1]?.split(",");
const port = Number(process.env.REVAMP_PORT ?? 4274);
const baseUrl = `http://127.0.0.1:${port}`;
const outDir = path.join(root, "docs", "revamp", "lighthouse", label);

const pages = [
  { id: "home", path: "/" },
  { id: "experience", path: "/experience" },
  { id: "projects", path: "/projects" },
  { id: "writing", path: "/arsenal/writing" },
  { id: "article", path: "/arsenal/writing/designing-for-reliability" },
  { id: "about", path: "/about" },
].filter((page) => !only || only.includes(page.id));

async function isReady() {
  try {
    return (await fetch(baseUrl)).ok;
  } catch {
    return false;
  }
}

let preview;
if (!(await isReady())) {
  preview = spawn(
    "npm",
    ["run", "preview", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: root, shell: process.platform === "win32", windowsHide: true, stdio: "ignore" }
  );
  let ready = false;
  for (let attempt = 0; attempt < 80 && !ready; attempt++) {
    ready = await isReady();
    if (!ready) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) {
    preview.kill();
    throw new Error(`vite preview did not become ready at ${baseUrl}`);
  }
}

await mkdir(outDir, { recursive: true });
const summary = [];
const failures = [];

for (const page of pages) {
  for (const preset of ["mobile", "desktop"]) {
    const file = path.join(outDir, `${page.id}-${preset}.json`);
    const result = spawnSync(
      "npx",
      [
        "--yes",
        "lighthouse",
        `${baseUrl}${page.path}`,
        "--quiet",
        "--output=json",
        `--output-path="${file}"`,
        "--only-categories=performance,accessibility,best-practices,seo",
        '--chrome-flags="--headless=new --no-sandbox"',
        ...(preset === "desktop" ? ["--preset=desktop"] : []),
      ],
      { cwd: root, shell: true, windowsHide: true, encoding: "utf8", timeout: 240_000 }
    );
    const row = {
      page: page.id,
      preset,
      performance: null,
      accessibility: null,
      bestPractices: null,
      seo: null,
      lcpMs: null,
      cls: null,
      tbtMs: null,
    };
    try {
      const report = JSON.parse(await readFile(file, "utf8"));
      const score = (key) =>
        report.categories[key]?.score == null
          ? null
          : Math.round(report.categories[key].score * 100);
      row.performance = score("performance");
      row.accessibility = score("accessibility");
      row.bestPractices = score("best-practices");
      row.seo = score("seo");
      row.lcpMs =
        Math.round(report.audits["largest-contentful-paint"]?.numericValue ?? NaN) || null;
      row.cls = report.audits["cumulative-layout-shift"]?.numericValue ?? null;
      row.tbtMs = Math.round(report.audits["total-blocking-time"]?.numericValue ?? 0);
      row.failedA11y = Object.values(report.audits)
        .filter(
          (audit) =>
            report.categories.accessibility.auditRefs.some((ref) => ref.id === audit.id) &&
            audit.score === 0
        )
        .map((audit) => audit.id);
    } catch (error) {
      failures.push(
        `${page.id}/${preset}: ${String(error).split("\n")[0]} ${(result.stderr ?? "").slice(-300)}`
      );
    }
    summary.push(row);
    console.log(JSON.stringify(row));
  }
}

preview?.kill();
if (process.platform === "win32" && preview?.pid) {
  spawn("taskkill", ["/pid", String(preview.pid), "/T", "/F"], {
    stdio: "ignore",
    windowsHide: true,
  });
}

await writeFile(
  path.join(outDir, "summary.json"),
  `${JSON.stringify({ label, summary, failures }, null, 2)}\n`
);
if (failures.length) {
  console.error(`FAILED (${failures.length}):\n${failures.join("\n")}`);
  process.exit(1);
}
