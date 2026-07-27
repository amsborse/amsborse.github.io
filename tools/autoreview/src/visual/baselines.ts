import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT } from "../config.ts";
import type { BaselineDiffResult, BaselineRecord } from "./types.ts";

const BASELINE_DIR = path.join(ROOT, ".agent-memory", "visual-baselines");

export function ensureBaselineDir(): string {
  fs.mkdirSync(BASELINE_DIR, { recursive: true });
  return BASELINE_DIR;
}

function currentCommit(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

export function hashFile(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function listBaselines(): BaselineRecord[] {
  ensureBaselineDir();
  return fs
    .readdirSync(BASELINE_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(BASELINE_DIR, f), "utf8")) as BaselineRecord)
    .filter((b) => b.approvalStatus === "approved" || b.approvalStatus === "pending");
}

export function approveBaseline(input: {
  component: string;
  route: string;
  selector: string;
  state: string;
  viewport: string;
  screenshotPath: string;
  memoryDecisionIds?: string[];
  maskSelectors?: string[];
}): BaselineRecord {
  ensureBaselineDir();
  if (!fs.existsSync(input.screenshotPath)) {
    throw new Error(`Screenshot not found: ${input.screenshotPath}`);
  }
  const id = [
    slug(input.component),
    slug(input.state),
    slug(input.viewport),
    slug(input.route),
  ].join("__");
  const absShot = path.resolve(input.screenshotPath);
  const relShot = path.relative(ROOT, absShot);
  const storedPath = relShot.startsWith("..")
    ? absShot.replace(/\\/g, "/")
    : relShot.replace(/\\/g, "/");
  const record: BaselineRecord = {
    id,
    component: input.component,
    route: input.route,
    selector: input.selector,
    state: input.state,
    viewport: input.viewport,
    screenshotHash: hashFile(absShot),
    screenshotPath: storedPath,
    sourceCommit: currentCommit(),
    approvalStatus: "approved",
    approvedAt: new Date().toISOString(),
    memoryDecisionIds: input.memoryDecisionIds || [],
    maskSelectors: input.maskSelectors || [],
  };
  fs.writeFileSync(path.join(BASELINE_DIR, `${id}.json`), JSON.stringify(record, null, 2) + "\n");
  return record;
}

export function removeBaseline(id: string): boolean {
  const file = path.join(BASELINE_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return false;
  const record = JSON.parse(fs.readFileSync(file, "utf8")) as BaselineRecord;
  record.approvalStatus = "revoked";
  fs.writeFileSync(file, JSON.stringify(record, null, 2) + "\n");
  return true;
}

export function diffAgainstBaselines(
  candidates: Array<{
    component?: string;
    route: string;
    selector?: string;
    state?: string;
    viewport: string;
    screenshotPath: string;
    taskChanged?: boolean;
  }>
): BaselineDiffResult[] {
  const baselines = listBaselines().filter((b) => b.approvalStatus === "approved");
  const results: BaselineDiffResult[] = [];

  for (const c of candidates) {
    const match = baselines.find(
      (b) =>
        b.route === c.route &&
        b.viewport === c.viewport &&
        (!c.component || b.component === c.component) &&
        (!c.state || b.state === c.state) &&
        (!c.selector || b.selector === c.selector)
    );
    if (!match) continue;
    if (!fs.existsSync(c.screenshotPath)) {
      results.push({
        baselineId: match.id,
        classification: "requires-human-review",
        details: "Candidate screenshot missing",
      });
      continue;
    }
    const hash = hashFile(c.screenshotPath);
    if (hash === match.screenshotHash) {
      results.push({
        baselineId: match.id,
        classification: "match",
        diffRatio: 0,
        details: "Screenshot hash matches approved baseline",
      });
      continue;
    }
    // Byte-diff ratio approximation
    const baselineShot = match.screenshotPath
      ? path.isAbsolute(match.screenshotPath)
        ? match.screenshotPath
        : path.join(ROOT, match.screenshotPath)
      : "";
    if (!baselineShot || !fs.existsSync(baselineShot)) {
      results.push({
        baselineId: match.id,
        classification: "requires-human-review",
        details: "Approved baseline screenshot file missing",
      });
      continue;
    }
    const a = fs.readFileSync(baselineShot);
    const b = fs.readFileSync(c.screenshotPath);
    const len = Math.max(a.length, b.length) || 1;
    let diff = Math.abs(a.length - b.length);
    const n = Math.min(a.length, b.length, 50000);
    for (let i = 0; i < n; i += 17) {
      if (a[i] !== b[i]) diff += 1;
    }
    const ratio = Math.min(1, diff / len);
    let classification: BaselineDiffResult["classification"] = "unexpected-regression";
    if (c.taskChanged && ratio < 0.35) classification = "expected-task-change";
    else if (ratio < 0.02) classification = "environment-instability";
    else if (ratio > 0.8) classification = "baseline-no-longer-applicable";
    else if (ratio > 0.15) classification = "requires-human-review";

    results.push({
      baselineId: match.id,
      classification,
      diffRatio: ratio,
      details: `Hash mismatch vs approved baseline (${(ratio * 100).toFixed(1)}% approx byte delta)`,
    });
  }

  return results;
}

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^\w.-]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "x"
  );
}
