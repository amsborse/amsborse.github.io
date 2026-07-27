import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./config.ts";
import type { CheckResult, Finding } from "./types.ts";

function run(
  cmd: string,
  args: string[],
  timeoutMs: number
): {
  ok: boolean;
  stdout: string;
  stderr: string;
} {
  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
    timeout: timeoutMs,
    env: { ...process.env },
  });
  return {
    ok: (res.status ?? 1) === 0,
    stdout: res.stdout || "",
    stderr: res.stderr || "",
  };
}

export function runScopedLint(files: string[]): CheckResult {
  const targets = files.filter(
    (f) => /\.(tsx?|jsx?)$/.test(f) && fs.existsSync(path.join(ROOT, f))
  );
  if (!targets.length) {
    return { name: "eslint", passed: true, skipped: true, skipReason: "No JS/TS files in scope" };
  }
  const res = run("npx", ["eslint", ...targets], 120_000);
  const findings: Finding[] = [];
  if (!res.ok) {
    findings.push({
      id: "lint-errors",
      severity: "high",
      confidence: 0.95,
      category: "generic",
      explanation: `ESLint failed on changed files:\n${(res.stdout || res.stderr).slice(0, 1500)}`,
      source: "test",
    });
  }
  return {
    name: "eslint",
    passed: res.ok,
    details: res.ok ? `Linted ${targets.length} file(s)` : "ESLint reported issues",
    findings,
  };
}

export function runScopedPrettier(files: string[]): CheckResult {
  const targets = files.filter((f) => fs.existsSync(path.join(ROOT, f)));
  if (!targets.length) {
    return {
      name: "prettier",
      passed: true,
      skipped: true,
      skipReason: "No files in scope",
    };
  }
  const res = run("npx", ["prettier", "--check", ...targets], 60_000);
  return {
    name: "prettier",
    passed: res.ok,
    details: res.ok ? "Prettier check passed" : "Prettier check failed on changed files",
    findings: res.ok
      ? []
      : [
          {
            id: "prettier",
            severity: "medium",
            confidence: 1,
            category: "generic",
            explanation: "Prettier formatting check failed on scoped files",
            source: "test",
          },
        ],
  };
}

export function runRelatedTests(
  tests: string[],
  runFullSuite: boolean,
  timeoutMs: number
): CheckResult {
  if (runFullSuite) {
    const res = run("npx", ["vitest", "run"], timeoutMs);
    return {
      name: "vitest",
      passed: res.ok,
      details: res.ok ? "Full vitest suite passed" : "Full vitest suite failed",
      findings: res.ok
        ? []
        : [
            {
              id: "vitest-full",
              severity: "critical",
              confidence: 1,
              category: "generic",
              explanation: (res.stdout || res.stderr).slice(0, 1500),
              source: "test",
            },
          ],
    };
  }

  const unit = tests.filter((t) => t.includes("tests/unit") || t.includes(".test."));
  if (!unit.length) {
    return {
      name: "vitest",
      passed: true,
      skipped: true,
      skipReason: "No related unit tests selected",
    };
  }

  const res = run("npx", ["vitest", "run", ...unit], timeoutMs);
  return {
    name: "vitest",
    passed: res.ok,
    details: res.ok
      ? `Related tests passed (${unit.length})`
      : `Related tests failed (${unit.length})`,
    findings: res.ok
      ? []
      : [
          {
            id: "vitest-related",
            severity: "critical",
            confidence: 1,
            category: "generic",
            explanation: (res.stdout || res.stderr).slice(0, 1500),
            source: "test",
          },
        ],
  };
}

export function runScopedTypecheck(changedFiles: string[]): CheckResult {
  // Incremental project check — still project references based; mark fail only if tsc fails
  // and output mentions a scoped file.
  const res = run("npx", ["tsc", "-b", "--noEmit"], 180_000);
  if (res.ok) {
    return { name: "typecheck", passed: true, details: "Typecheck passed" };
  }
  const output = `${res.stdout}\n${res.stderr}`;
  const mentionsScope = changedFiles.some((f) => output.includes(f.replace(/\\/g, "/")));
  if (!mentionsScope) {
    return {
      name: "typecheck",
      passed: true,
      details: "Typecheck had errors outside current task scope; not failing scoped gate",
      findings: [],
    };
  }
  return {
    name: "typecheck",
    passed: false,
    details: "Typecheck errors mention scoped files",
    findings: [
      {
        id: "tsc-scoped",
        severity: "critical",
        confidence: 0.9,
        category: "generic",
        explanation: output.slice(0, 1500),
        source: "test",
      },
    ],
  };
}

export function needsBuildCheck(changedFiles: string[]): boolean {
  return changedFiles.some(
    (f) =>
      f.includes("vite.config") ||
      f.includes(".github/workflows") ||
      f.includes("App.tsx") ||
      f.includes("copy-404") ||
      f.includes("autoreview.config")
  );
}
