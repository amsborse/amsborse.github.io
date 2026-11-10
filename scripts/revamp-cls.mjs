/**
 * Layout-shift probe: loads each page, records every layout-shift entry with the elements that
 * moved, and prints the total. Usage:
 *   REVAMP_BASE_URL=http://127.0.0.1:4280 node scripts/revamp-cls.mjs [--only writing,article]
 */
import { chromium } from "@playwright/test";

const base = process.env.REVAMP_BASE_URL ?? "http://127.0.0.1:4273";
const pages = {
  home: "/",
  experience: "/experience",
  projects: "/projects",
  writing: "/arsenal/writing",
  article: "/arsenal/writing/designing-for-reliability",
  about: "/about",
  learning: "/learning",
};
const onlyArg = process.argv.indexOf("--only");
const only = onlyArg > -1 ? process.argv[onlyArg + 1].split(",") : Object.keys(pages);
const viewports = [
  { name: "desktop", width: 1350, height: 940 },
  { name: "mobile", width: 412, height: 823 },
];

const browser = await chromium.launch();
let failed = false;
for (const name of only) {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.__shifts = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.hadRecentInput) continue;
          window.__shifts.push({
            value: entry.value,
            at: Math.round(entry.startTime),
            nodes: entry.sources.map((source) => {
              const node = source.node;
              if (!node || node.nodeType !== 1) return "(text or removed)";
              const cls = typeof node.className === "string" ? node.className : "";
              return `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ""}.${cls.split(" ").slice(0, 2).join(".")}`;
            }),
          });
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(base + pages[name], { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
    const shifts = await page.evaluate(() => window.__shifts);
    const total = shifts.reduce((sum, shift) => sum + shift.value, 0);
    if (total > 0.1) failed = true;
    console.log(`${name} ${viewport.name}: CLS ${total.toFixed(3)}`);
    for (const shift of shifts.filter((entry) => entry.value > 0.005)) {
      console.log(`   ${shift.value.toFixed(3)} @${shift.at}ms ${shift.nodes.join(", ")}`);
    }
    await context.close();
  }
}
await browser.close();
process.exitCode = failed ? 1 : 0;
