import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexHtml = path.join(__dirname, "..", "dist", "index.html");

if (!fs.existsSync(indexHtml)) {
  console.error("verify-dist: dist/index.html missing — run npm run build first.");
  process.exit(1);
}

const html = fs.readFileSync(indexHtml, "utf8");

if (html.includes("/src/main")) {
  console.error(
    "verify-dist: dist/index.html still references dev entry (/src/main). Vite did not transform index.html.",
  );
  process.exit(1);
}

if (!html.includes("/assets/")) {
  console.error("verify-dist: dist/index.html has no /assets/ bundle reference.");
  process.exit(1);
}

if (html.includes("%BASE_URL%")) {
  console.error("verify-dist: dist/index.html has unreplaced %BASE_URL% placeholders.");
  process.exit(1);
}

if (/<script[^>]+src=["'][^"']*\.(tsx|ts)["']/i.test(html)) {
  console.error(
    "verify-dist: dist/index.html still references a .ts/.tsx entry — GitHub Pages will serve it with the wrong MIME type (often application/octet-stream). Deploy the Vite build output only.",
  );
  process.exit(1);
}

console.log("verify-dist: dist/index.html looks like a production build.");
