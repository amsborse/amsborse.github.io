import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

/**
 * Static hosting (GitHub Pages) — `base` must match where the site is served:
 *
 * - User/org site at domain root, e.g. https://amsborse.github.io/
 *   → use `"/"` (default below).
 *
 * - Project site under a subpath, e.g. https://amsborse.github.io/my-portfolio/
 *   → set `"/my-portfolio/"` (repo name, leading and trailing slashes).
 *
 * Override without editing this file: add `VITE_BASE=/my-portfolio/` to `.env.production`.
 * React Router reads `import.meta.env.BASE_URL` from the same value.
 */
function resolveBase(mode: string): string {
  const env = loadEnv(mode, process.cwd(), "");
  let base = (env.VITE_BASE ?? "/").trim();
  if (!base || base === "") base = "/";
  if (!base.startsWith("/")) base = `/${base}`;
  if (!base.endsWith("/")) base = `${base}/`;
  return base;
}

export default defineConfig(({ mode }) => ({
  base: resolveBase(mode),
  server: {
    port: 5173,
    strictPort: false,
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  build: {
    chunkSizeWarningLimit: 600,
  },
}));
