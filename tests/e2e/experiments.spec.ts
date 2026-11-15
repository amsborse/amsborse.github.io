import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * The design experiment end to end, against the dev server's /__experiments stand-in. Automated
 * browsers are treated as bots and never measured, so these specs present as a person by hiding
 * navigator.webdriver; every other spec keeps the usual design.
 */
const WEIGHTS = "**/__experiments/weights.json";
const EVENTS = "**/__experiments/events";
const ASSIGNMENT = "portfolio-design-assignment";

type Batch = {
  vid: string;
  sid: string;
  source: string;
  assigned: string | null;
  events: Array<{ t: string; design: string; path?: string; label?: string; value?: number }>;
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "webdriver", {
      get: () => false,
      configurable: true,
    });
  });
});

/** Serves weights that send every new visitor to `design`, without the forced mode. */
async function weightsFor(page: Page, design: string) {
  let calls = 0;
  await page.route(WEIGHTS, (route) => {
    calls += 1;
    const weights = { editorial: 0, blueprint: 0, broadsheet: 0, [design]: 1 };
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ version: `test-${design}`, updatedAt: "", mode: "auto", weights }),
    });
  });
  return () => calls;
}

/** Records every event batch the page sends. */
async function recordEvents(page: Page) {
  const batches: Batch[] = [];
  await page.route(EVENTS, (route: Route) => {
    const body = route.request().postData();
    if (body) batches.push(JSON.parse(body) as Batch);
    return route.fulfill({ status: 204 });
  });
  return batches;
}

/** What the tracker does when the tab is hidden: send everything queued. */
async function hideTab(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

const designOf = (page: Page) => page.locator("html").getAttribute("data-design");

test("a first-time visitor is assigned by the weights and keeps the design on return", async ({
  page,
}) => {
  await weightsFor(page, "blueprint");
  await recordEvents(page);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-design", "blueprint");
  const stored = await page.evaluate((key) => localStorage.getItem(key), ASSIGNMENT);
  expect(JSON.parse(stored!)).toMatchObject({ design: "blueprint", version: "test-blueprint" });

  // New weights would send a new visitor elsewhere; this visitor keeps the first pick.
  await page.unroute(WEIGHTS);
  await weightsFor(page, "broadsheet");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-design", "blueprint");
});

test("?design= wins over the assignment without replacing it", async ({ page }) => {
  await weightsFor(page, "blueprint");
  await recordEvents(page);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-design", "blueprint");
  await page.goto("/?design=broadsheet");
  await expect(page.locator("html")).toHaveAttribute("data-design", "broadsheet");
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-design", "blueprint");
});

test("a picker choice persists, is never overridden, and is reported as a switch away", async ({
  page,
}) => {
  await weightsFor(page, "blueprint");
  const batches = await recordEvents(page);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-design", "blueprint");

  await page
    .getByRole("button", { name: /Change design/ })
    .first()
    .click();
  await page.getByRole("menuitemradio", { name: /Broadsheet/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-design", "broadsheet");
  await hideTab(page);
  await expect
    .poll(() => batches.flatMap((b) => b.events).find((e) => e.t === "design_switch"))
    .toMatchObject({ label: "broadsheet" });

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-design", "broadsheet");
  expect(await designOf(page)).toBe("broadsheet");
});

test("events fire with the design, ids and no personal data", async ({ page }) => {
  await weightsFor(page, "blueprint");
  const batches = await recordEvents(page);
  await page.goto("/?utm_source=test#top");
  await expect(page.locator("html")).toHaveAttribute("data-design", "blueprint");
  await page.mouse.wheel(0, 4000);
  await page.waitForTimeout(400);
  await hideTab(page);

  await expect.poll(() => batches.length).toBeGreaterThan(0);
  const events = batches.flatMap((b) => b.events);
  const first = batches[0];
  expect(first.source).toBe("auto");
  expect(first.assigned).toBe("blueprint");
  expect(first.vid).toMatch(/^[0-9a-f-]{16,64}$/i);
  expect(first.sid).toMatch(/^[0-9a-f-]{16,64}$/i);
  expect(events.find((e) => e.t === "pageview")).toMatchObject({ design: "blueprint", path: "/" });
  expect(events.some((e) => e.t === "scroll" && (e.value ?? 0) >= 25)).toBe(true);
  // Only the documented fields leave the page: no query string, no hash, no user agent.
  for (const b of batches) {
    expect(Object.keys(b).sort()).toEqual(["assigned", "events", "sid", "source", "v", "vid"]);
    expect(JSON.stringify(b)).not.toMatch(/utm_source|#top|Mozilla/);
  }
});

test("nothing is sent under Global Privacy Control", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "globalPrivacyControl", {
      get: () => true,
      configurable: true,
    });
  });
  const calls = await weightsFor(page, "blueprint");
  const batches = await recordEvents(page);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-design", "editorial");
  await hideTab(page);
  await page.waitForTimeout(300);
  expect(calls()).toBe(0);
  expect(batches).toHaveLength(0);
});

test("a missing weights.json shows the default design and reports the failure", async ({
  page,
}) => {
  await page.route(WEIGHTS, (route) => route.fulfill({ status: 404, body: "" }));
  const batches = await recordEvents(page);
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-design", "editorial");
  await expect(page.locator("main")).toBeVisible();
  expect(errors.some((e) => /weights\.json failed.*HTTP 404/.test(e))).toBe(true);
  expect(await page.evaluate((key) => localStorage.getItem(key), ASSIGNMENT)).toBeNull();
  await hideTab(page);
  await expect
    .poll(() => batches.flatMap((b) => b.events).find((e) => e.t === "weights_error"))
    .toMatchObject({ design: "editorial" });
});

test("the results page explains each design in both themes", async ({ page }) => {
  await page.goto("/experiments");
  await expect(
    page.getByRole("heading", { name: "Which design serves readers best" })
  ).toBeVisible();
  await expect(page.getByRole("note")).toContainText("Sample numbers");
  await expect(page.locator(".exp-card")).toHaveCount(3);
  // Weights that never moved say so, rather than showing time zero as a date.
  await expect(page.getByText("Still at the starting split")).toBeVisible();
  await expect(page.locator("main")).not.toContainText("1969");
  await expect(page.locator("main")).not.toContainText("1970");
  // A design short of data shows that plainly, never a zero.
  await expect(page.locator(".exp-card[data-design='broadsheet']")).toContainText(
    /not enough data/i
  );
  const tip = page.locator(".exp-card").first().locator(".exp-explain").first();
  await tip.focus();
  await expect(tip.locator(".exp-tip")).toHaveCSS("opacity", "1");
});
