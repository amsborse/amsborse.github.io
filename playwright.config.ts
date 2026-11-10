import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: "http://localhost:1111",
    headless: true,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  // The WebGL hero specs draw in software in headless Chromium and measure frame cost, so they
  // fail when they share the CPU with parallel workers. Each runs after the rest of the suite,
  // on its own, rather than with looser timeouts.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: [/hero\.spec\.ts/, /hero-slow-device\.spec\.ts/],
    },
    {
      name: "chromium-hero",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /hero\.spec\.ts/,
      dependencies: ["chromium"],
    },
    {
      name: "chromium-hero-slow-device",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /hero-slow-device\.spec\.ts/,
      dependencies: ["chromium-hero"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:1111",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
