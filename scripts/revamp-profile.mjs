/**
 * CPU profile probe: records a 6s CPU profile of a page load (phone viewport, 4x throttle) and
 * prints self time grouped by original source file, using the build's source maps.
 * Build with maps first: `npx vite build --sourcemap --outDir dist-prof`, serve that folder.
 *
 *   REVAMP_BASE_URL=http://127.0.0.1:4276 node scripts/revamp-profile.mjs / [--reduced]
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { SourceMapConsumer } from "source-map-js";

const base = process.env.REVAMP_BASE_URL ?? "http://127.0.0.1:4276";
const distDir = process.env.REVAMP_DIST ?? "dist-prof";
const route = process.argv.slice(2).find((arg) => !arg.startsWith("--")) ?? "/";
const reduced = process.argv.includes("--reduced");

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 412, height: 823 },
  isMobile: true,
  hasTouch: true,
  reducedMotion: reduced ? "reduce" : "no-preference",
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 200 });
// --steady: skip the load and profile 4s of the page running on its own.
const steady = process.argv.includes("--steady");
if (steady) {
  await page.goto(base + route, { waitUntil: "load" });
  await page.waitForTimeout(4000);
}
await cdp.send("Profiler.start");
if (!steady) await page.goto(base + route, { waitUntil: "load" });
await page.waitForTimeout(steady ? 4000 : 6000);
const { profile } = await cdp.send("Profiler.stop");
await browser.close();

const consumers = new Map();
function consumerFor(url) {
  if (consumers.has(url)) return consumers.get(url);
  let consumer = null;
  const file = path.join(distDir, new URL(url).pathname) + ".map";
  if (existsSync(file)) consumer = new SourceMapConsumer(JSON.parse(readFileSync(file, "utf8")));
  consumers.set(url, consumer);
  return consumer;
}

const interval = (profile.endTime - profile.startTime) / profile.samples.length / 1000;
const hits = new Map();
for (const id of profile.samples) hits.set(id, (hits.get(id) ?? 0) + 1);
const byFile = new Map();
const byFn = new Map();
for (const node of profile.nodes) {
  const count = hits.get(node.id);
  if (!count) continue;
  const frame = node.callFrame;
  let key = frame.url ? new URL(frame.url).pathname : `(${frame.functionName || "program"})`;
  let fn = frame.functionName || "(anon)";
  const consumer = frame.url ? consumerFor(frame.url) : null;
  if (consumer) {
    const pos = consumer.originalPositionFor({
      line: frame.lineNumber + 1,
      column: frame.columnNumber,
    });
    if (pos.source) {
      key = pos.source.replace(/^.*node_modules\//, "nm/").replace(/^(\.\.\/)+/, "");
      fn = `${pos.name ?? fn} ${key}:${pos.line}`;
    }
  }
  byFile.set(key, (byFile.get(key) ?? 0) + count * interval);
  byFn.set(fn, (byFn.get(fn) ?? 0) + count * interval);
}
const top = (map, n) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
console.log(`${route}${reduced ? " (reduced)" : ""} self time by file (ms):`);
for (const [key, ms] of top(byFile, 18)) console.log(`  ${Math.round(ms)}  ${key}`);
console.log("top functions:");
for (const [key, ms] of top(byFn, 15)) console.log(`  ${Math.round(ms)}  ${key}`);
