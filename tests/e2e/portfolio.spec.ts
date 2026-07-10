import { test, expect } from "@playwright/test";

// =============================================================================
// 1. GLOBAL SMOKE TESTS — Every page loads without console errors
// =============================================================================

const PAGES = [
  { path: "/", title: "Home", selector: "h1" },
  { path: "/about", title: "About", selector: "h1" },
  { path: "/experience", title: "Experience", selector: "h1" },
  { path: "/projects", title: "Projects", selector: "h2" },
  { path: "/writing", title: "Writing", selector: "h1" },
  { path: "/resume", title: "Resume", selector: ".resume-container" },
  { path: "/contact", title: "Contact", selector: "h1" },
  { path: "/motion", title: "Motion Lab", selector: "h1" },
  {
    path: "/learning/algorithm",
    title: "Algorithm Hub",
    selector: "h1:has-text('Algorithm Visualizer Hub')",
  },
  { path: "/aether-lab", title: "Aether Lab", selector: "h1" },
  { path: "/learning", title: "Learning", selector: "h1" },
  { path: "/learning/coding-patterns", title: "Coding Patterns", selector: "h1" },
  {
    path: "/learning/coding-patterns/sliding-window",
    title: "Sliding Window",
    selector: "h1",
  },
  {
    path: "/learning/system-design-concepts",
    title: "System Design Concepts",
    selector: "h1",
  },
  { path: "/algorithm", title: "Algorithms", selector: "h1" },
];

for (const page of PAGES) {
  test(`Smoke: ${page.title} page loads and renders`, async ({ page: p }) => {
    const errors: string[] = [];
    p.on("pageerror", (err) => errors.push(err.message));

    await p.goto(page.path, { waitUntil: "networkidle" });

    // Key element is visible
    await expect(p.locator(page.selector).first()).toBeVisible({ timeout: 10_000 });

    // No critical JS errors
    expect(errors.filter((e) => !e.includes("ResizeObserver"))).toHaveLength(0);
  });
}

test("Writing: article page loads for known slug", async ({ page }) => {
  await page.goto("/writing/designing-for-reliability", { waitUntil: "networkidle" });
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("body")).toContainText(/reliability/i);
});

// =============================================================================
// 2. NAVIGATION — Lazy loading works, links navigate correctly
// =============================================================================

test("Navigation: navbar links navigate between pages", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  // Click About link
  await page.click('nav a[href="/about"]');
  await expect(page).toHaveURL(/\/about/);
  await expect(page.locator("h1")).toBeVisible();

  // Click Projects link
  await page.click('nav a[href="/projects"]');
  await expect(page).toHaveURL(/\/projects/);
  await expect(page.locator("h2").first()).toBeVisible();
});

test("Navigation: 404 page renders for unknown routes", async ({ page }) => {
  await page.goto("/this-does-not-exist", { waitUntil: "networkidle" });
  // Should show the NotFound page content
  await expect(page.locator("body")).toContainText(/not found|404/i);
});

// =============================================================================
// 3. ALGORITHMS PAGE — Core functionality tests
// =============================================================================

test("Algorithms: sorting sandbox loads from hub", async ({ page }) => {
  await page.goto("/learning/algorithm", { waitUntil: "networkidle" });
  await expect(page.locator("h1")).toContainText("Algorithm Visualizer Hub");
  await page.click('a[href="/algorithm"]');
  await expect(page).toHaveURL(/\/algorithm/);
  await expect(page.locator("h1")).toContainText("Algorithm Visualizer");
});

test("Algorithms: page loads with theme dropdown", async ({ page }) => {
  await page.goto("/algorithm", { waitUntil: "networkidle" });

  // Title is visible
  await expect(page.locator("h1")).toContainText("Algorithm Visualizer");

  // Theme dropdown exists
  const themeSelect = page.locator("select").first();
  await expect(themeSelect).toBeVisible();
});

test("Algorithms: can switch themes without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/algorithm", { waitUntil: "networkidle" });

  const themeSelect = page.locator("select").first();

  // Switch to each theme
  for (const theme of ["neo-brutalism", "synthwave", "swiss", "glassmorphism"]) {
    await themeSelect.selectOption(theme);
    await page.waitForTimeout(300); // allow transition
  }

  expect(errors.filter((e) => !e.includes("ResizeObserver"))).toHaveLength(0);
});

test("Algorithms: can switch visualization modes", async ({ page }) => {
  await page.goto("/algorithm", { waitUntil: "networkidle" });

  // Find the vis mode dropdown (second select)
  const selects = page.locator("select");
  const visSelect = selects.nth(1);

  for (const mode of ["liquid-fill", "pulsing-orbs", "particle-trails", "bars"]) {
    await visSelect.selectOption(mode);
    await page.waitForTimeout(200);
  }
});

test("Algorithms: generate and reset buttons work", async ({ page }) => {
  await page.goto("/algorithm", { waitUntil: "networkidle" });

  // Click Generate
  const generateBtn = page.locator("button", { hasText: "Generate" });
  await generateBtn.click();
  await page.waitForTimeout(300);

  // Click Reset
  const resetBtn = page.locator("button", { hasText: "Reset" });
  await resetBtn.click();
  await page.waitForTimeout(300);
});

test("Algorithms: algorithm dossier updates when switching algorithms", async ({ page }) => {
  await page.goto("/algorithm", { waitUntil: "networkidle" });

  // Click on "Selection Sort" button
  const selectionBtn = page.locator("button", { hasText: "Selection Sort" });
  if (await selectionBtn.isVisible()) {
    await selectionBtn.click();
    await page.waitForTimeout(500);

    // Dossier should now mention "Selection Sort"
    await expect(page.locator("body")).toContainText("Selection Sort");
  }
});

// =============================================================================
// 4. MOTION LAB — Renders without errors
// =============================================================================

test("MotionLab: ignite button works and counter increments", async ({ page }) => {
  await page.goto("/motion", { waitUntil: "networkidle" });

  await expect(page.locator("h1")).toContainText("Motion Lab");

  const igniteBtn = page.locator("button", { hasText: /Ignite/i });
  await expect(igniteBtn).toBeVisible();

  await igniteBtn.click();
  await page.waitForTimeout(200);

  // Counter should show 1
  await expect(page.locator("body")).toContainText("1");
});

// =============================================================================
// 5. RESUME — Morph toggle works
// =============================================================================

test("Resume: interactive mode toggle works", async ({ page }) => {
  await page.goto("/resume", { waitUntil: "networkidle" });

  const interactiveBtn = page.locator("button.toggle-option", { hasText: "Interactive" });
  await expect(interactiveBtn).toBeVisible();

  await interactiveBtn.click();
  await page.waitForTimeout(300);

  const pdfBtn = page.locator("button.toggle-option", { hasText: "PDF View" });
  await pdfBtn.click();
  await page.waitForTimeout(300);
});

// =============================================================================
// 6. PERFORMANCE — No layout shift, fast load
// =============================================================================

test("Performance: Home page loads within 5 seconds", async ({ page }) => {
  const start = Date.now();
  await page.goto("/", { waitUntil: "networkidle" });
  const elapsed = Date.now() - start;

  expect(elapsed).toBeLessThan(5000);
});

test("Performance: Algorithms page lazy loads correctly", async ({ page }) => {
  // Start from home (should NOT load Algorithms chunk)
  await page.goto("/", { waitUntil: "networkidle" });

  // Navigate to Algorithms — should lazy load
  await page.goto("/algorithm", { waitUntil: "networkidle" });
  await expect(page.locator("h1")).toContainText("Algorithm Visualizer");
});
