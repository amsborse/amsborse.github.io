import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/unit/**/*.test.ts", "tools/autoreview/tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/utils/frontmatter.ts", "src/utils/markdown.ts"],
      exclude: ["src/utils/loadArticles.ts"],
      thresholds: {
        lines: 99,
        functions: 99,
        statements: 99,
        branches: 90,
      },
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
    },
  },
});
