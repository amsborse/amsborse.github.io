import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig, loadEnv } from "vite";

/**
 * GitHub Pages: strip `crossorigin` from emitted `<script type="module">` / `<link rel="stylesheet">`
 * so static hosts don’t mishandle module loads.
 */
function stripHtmlCrossorigin(): Plugin {
  return {
    name: "strip-html-crossorigin",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html: string) {
        return html.replace(/\s+crossorigin(?:="[^"]*")?/g, "");
      },
    },
  };
}

/**
 * Base URL for static hosting.
 *
 * - **Root user site** `https://amsborse.github.io/` (this repo): use **`"/"`** — do not set `VITE_BASE`.
 * - **Project site** `https://amsborse.github.io/<repo>/` only: set `VITE_BASE=/<repo>/` in `.env.production`.
 * React Router uses `import.meta.env.BASE_URL` (see `App.tsx`).
 */
function resolveBase(mode: string): string {
  const env = loadEnv(mode, process.cwd(), "");
  const raw = env.VITE_BASE?.trim();
  if (!raw) {
    return "/";
  }
  let base = raw;
  if (!base.startsWith("/")) base = `/${base}`;
  if (!base.endsWith("/")) base = `${base}/`;
  return base;
}

export default defineConfig(({ mode }) => ({
  // Root GitHub Pages user site: https://amsborse.github.io/ — assets at /assets/*
  base: resolveBase(mode),
  server: {
    port: 5173,
    strictPort: false,
  },
  plugins: [react(), tailwindcss(), stripHtmlCrossorigin()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  build: {
    chunkSizeWarningLimit: 600,
  },
}));
