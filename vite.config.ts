import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig, loadEnv } from "vite";
import { flashcardsApiPlugin } from "./scripts/vite-plugin-flashcards-api.ts";

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
    port: 1111,
    strictPort: true,
  },
  plugins: [react(), tailwindcss(), stripHtmlCrossorigin(), flashcardsApiPlugin()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three") || id.includes("@react-three")) {
            return "three";
          }
          if (id.includes("node_modules/framer-motion")) {
            return "motion";
          }
          if (id.includes("node_modules/lenis")) {
            return "lenis";
          }
          if (
            id.includes("node_modules/react-router") ||
            id.includes("node_modules/@remix-run/router")
          ) {
            return "router";
          }
          if (
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react/jsx-runtime") ||
            id.includes("node_modules/react/index")
          ) {
            return "react-vendor";
          }
        },
      },
    },
  },
}));
