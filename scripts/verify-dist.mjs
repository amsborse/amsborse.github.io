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
      `verify-dist: ${label} still references dev entry (/src/main). Vite did not transform HTML.`
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
        `verify-dist: ${label} references source scripts — production must load hashed /assets/*.js only.`
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

/**
 * Chunks every page loads up front: the entry scripts and modulepreloads in index.html plus
 * everything they import statically. Lazy `import()` targets are not followed.
 */
export function staticChunks(distDir) {
  const html = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
  const queue = [...html.matchAll(/(?:src|href)=["'][^"']*\/assets\/([^"'/]+\.js)["']/g)].map(
    (m) => m[1]
  );
  const seen = new Set();
  while (queue.length) {
    const name = queue.pop();
    if (seen.has(name)) continue;
    seen.add(name);
    const file = path.join(distDir, "assets", name);
    if (!fs.existsSync(file)) continue;
    const code = fs.readFileSync(file, "utf8");
    // Static forms only: `import x from"./a.js"`, `import"./a.js"`, `export * from"./a.js"`.
    for (const m of code.matchAll(/(?:from|import)\s*["']\.\/([^"']+\.js)["']/g)) {
      queue.push(m[1]);
    }
  }
  return [...seen];
}

// three.js (~970 KB) is only for the optional 3D hero and canvas pages; it must stay lazy.
const eagerThree = staticChunks(dist).filter((name) => /^three-/.test(name));
if (eagerThree.length) {
  console.error(
    `verify-dist: every page statically loads ${eagerThree.join(", ")}. Keep three.js behind a lazy import().`
  );
  process.exit(1);
}

console.log("verify-dist: dist HTML looks like a production build (root site /assets/*).");
