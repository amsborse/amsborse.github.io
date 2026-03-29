import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "..", "dist");

function verifyHtmlFile(relativePath, label) {
  const filePath = path.join(dist, relativePath);
  if (!fs.existsSync(filePath)) {
    console.error(`verify-dist: missing ${label}: ${relativePath}`);
    process.exit(1);
  }
  const html = fs.readFileSync(filePath, "utf8");

  if (html.includes("/src/main")) {
    console.error(
      `verify-dist: ${label} still references dev entry (/src/main). Vite did not transform HTML.`,
    );
    process.exit(1);
  }

  if (!html.includes("/assets/")) {
    console.error(`verify-dist: ${label} has no /assets/ bundle reference.`);
    process.exit(1);
  }

  if (html.includes("%BASE_URL%")) {
    console.error(`verify-dist: ${label} has unreplaced %BASE_URL% placeholders.`);
    process.exit(1);
  }

  if (/<script[^>]+src=["'][^"']*\.(tsx|ts|jsx|js)["'][^>]*>/i.test(html)) {
    const hasBuiltChunk = /\/assets\/[^"']+\.js["']/.test(html);
    if (!hasBuiltChunk) {
      console.error(
        `verify-dist: ${label} references source scripts — production must load hashed /assets/*.js only.`,
      );
      process.exit(1);
    }
  }

  // Entry must be hashed bundle under /assets/, not /src/
  if (/<script[^>]+src=["'][^"']*\/src\//i.test(html)) {
    console.error(`verify-dist: ${label} must not reference /src/ in production.`);
    process.exit(1);
  }
}

if (!fs.existsSync(path.join(dist, "index.html"))) {
  console.error("verify-dist: dist/index.html missing — run npm run build first.");
  process.exit(1);
}

verifyHtmlFile("index.html", "dist/index.html");
if (fs.existsSync(path.join(dist, "404.html"))) {
  verifyHtmlFile("404.html", "dist/404.html");
}

console.log("verify-dist: dist HTML looks like a production build (root site /assets/*).");
