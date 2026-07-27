import fs from "node:fs";
import path from "node:path";
import type { Page } from "playwright";
import { ROOT, joinAppUrl } from "./config.ts";
import type {
  AutoreviewConfig,
  CheckResult,
  Finding,
  InteractionSpec,
  ScopeResult,
} from "./types.ts";

export function inferInteractions(scope: ScopeResult, root = ROOT): InteractionSpec[] {
  const specs: InteractionSpec[] = [];
  for (const file of scope.changedFiles) {
    if (!/\.(tsx|jsx)$/.test(file)) continue;
    const abs = path.join(root, file);
    if (!fs.existsSync(abs)) continue;
    let content = "";
    try {
      content = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const testIds = [...content.matchAll(/data-testid=["']([^"']+)["']/g)].map((m) => m[1]);
    const route = scope.affectedRoutes[0] ?? "/";
    for (const id of testIds.slice(0, 3)) {
      specs.push({
        id: `click-${id}`,
        sourceFiles: [file],
        route,
        trigger: { type: "click", selector: `[data-testid='${id}']` },
        expected: [{ type: "visible", selector: `[data-testid='${id}']` }],
      });
    }
    if (/onClick|button|Button/.test(content) && testIds.length === 0) {
      specs.push({
        id: `primary-button-${path.posix.basename(file, path.extname(file))}`,
        sourceFiles: [file],
        route,
        trigger: { type: "click", selector: "button, [role='button']" },
        expected: [{ type: "visible", selector: "button, [role='button']" }],
      });
    }
  }
  return specs;
}

export async function runInteractions(options: {
  page: Page;
  config: AutoreviewConfig;
  interactions: InteractionSpec[];
  budget: number;
}): Promise<{ result: CheckResult; executed: string[]; specs: InteractionSpec[] }> {
  const { page, config } = options;
  const interactions = options.interactions.slice(0, options.budget);
  const findings: Finding[] = [];
  const executed: string[] = [];

  for (const spec of interactions) {
    const url = joinAppUrl(config, spec.route);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      const locator = page.locator(spec.trigger.selector).first();
      const count = await locator.count();
      if (count === 0) {
        // Not a failure if selector isn't present on this surface — skip quietly
        continue;
      }
      if (spec.trigger.type === "click") {
        await locator.click({ timeout: 5_000 });
      } else if (spec.trigger.type === "hover") {
        await locator.hover({ timeout: 5_000 });
      } else if (spec.trigger.type === "focus") {
        await locator.focus({ timeout: 5_000 });
      } else if (spec.trigger.type === "keyboard" && spec.trigger.key) {
        await locator.press(spec.trigger.key, { timeout: 5_000 });
      }

      for (const exp of spec.expected) {
        if (exp.type === "visible" && exp.selector) {
          const visible = await page
            .locator(exp.selector)
            .first()
            .isVisible()
            .catch(() => false);
          if (!visible) {
            findings.push({
              id: `interaction-${spec.id}`,
              severity: "high",
              confidence: 0.85,
              category: "interaction",
              route: spec.route,
              selector: exp.selector,
              explanation: `Expected ${exp.selector} visible after ${spec.trigger.type}`,
              source: "interaction",
            });
          }
        }
      }
      executed.push(spec.id);
    } catch (err) {
      findings.push({
        id: `interaction-err-${spec.id}`,
        severity: "high",
        confidence: 0.8,
        category: "interaction",
        route: spec.route,
        explanation: `Interaction ${spec.id} failed: ${String(err)}`,
        source: "interaction",
      });
      executed.push(spec.id);
    }
  }

  const outPath = path.join(ROOT, ".autoreview", "reports", "interactions.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(interactions, null, 2), "utf8");

  return {
    specs: interactions,
    executed,
    result: {
      name: "interactions",
      passed: findings.length === 0,
      details: `Executed ${executed.length} interactions (budget ${options.budget})`,
      findings,
    },
  };
}
