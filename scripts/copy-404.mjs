import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "..", "dist");
const indexHtml = path.join(dist, "index.html");
const notFound = path.join(dist, "404.html");

if (fs.existsSync(indexHtml)) {
  fs.copyFileSync(indexHtml, notFound);
  console.log("Wrote dist/404.html for GitHub Pages SPA fallback.");
} else {
  console.warn("dist/index.html missing; skip 404.html copy.");
}
