import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Copies the production build into docs/ for GitHub Pages when the source is
 * “Deploy from a branch” → /docs (folder). This avoids publishing the repo-root
 * index.html that still points at /src/main.tsx.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
const docs = path.join(root, "docs");

if (!fs.existsSync(dist)) {
  console.error("sync-docs: dist/ missing — run npm run build first.");
  process.exit(1);
}

fs.rmSync(docs, { recursive: true, force: true });
fs.mkdirSync(docs, { recursive: true });
fs.cpSync(dist, docs, { recursive: true });
console.log(
  "sync-docs: copied dist/ → docs/. In GitHub: Settings → Pages → Branch + /docs, then commit and push docs/.",
);
