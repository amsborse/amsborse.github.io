import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ROOT } from "./config.ts";
import { finishSession, hashFile, normalizeRepoPath, readSession } from "./session.ts";
import { deriveFinalStatus, printAgentSummary, writeReports } from "./report.ts";
import { readCurrentTask } from "./agent-task.ts";
import type { ReviewReport } from "./types.ts";

export interface ScopeFingerprint {
  sessionId?: string;
  generatedAt: string;
  fileHashes: Record<string, string | null>;
}

export function sourceExtensions(file: string): boolean {
  return /\.(tsx?|jsx?|css|scss|md|json)$/.test(file) && !file.includes(".autoreview/");
}

export function collectScopeFingerprint(
  files: string[],
  sessionId?: string,
  root = ROOT
): ScopeFingerprint {
  const fileHashes: Record<string, string | null> = {};
  for (const f of files.filter(sourceExtensions).slice(0, 40)) {
    const n = normalizeRepoPath(f);
    fileHashes[n] = hashFile(path.isAbsolute(n) ? n : path.join(root, n));
  }
  return {
    sessionId,
    generatedAt: new Date().toISOString(),
    fileHashes,
  };
}

export function writeScopeFingerprint(fp: ScopeFingerprint, root = ROOT): void {
  const dir = path.join(root, ".autoreview", "reports");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "scope-fingerprint.json"), JSON.stringify(fp, null, 2), "utf8");
}

export function readScopeFingerprint(root = ROOT): ScopeFingerprint | null {
  const p = path.join(root, ".autoreview", "reports", "scope-fingerprint.json");
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as ScopeFingerprint;
  } catch {
    return null;
  }
}

export function isReportStale(root = ROOT): {
  stale: boolean;
  reason?: string;
  changedSinceReport: string[];
} {
  if (!fs.existsSync(path.join(root, ".autoreview", "reports", "latest.json"))) {
    return { stale: true, reason: "No scoped review report exists", changedSinceReport: [] };
  }
  const fp = readScopeFingerprint(root);
  if (!fp) {
    return {
      stale: true,
      reason: "Missing scope fingerprint — run npm run review:run after implementation",
      changedSinceReport: [],
    };
  }

  const changedSinceReport: string[] = [];
  for (const [file, expected] of Object.entries(fp.fileHashes)) {
    const abs = path.join(root, file);
    const current = hashFile(abs);
    if (current !== expected) changedSinceReport.push(file);
  }

  const unique = [...new Set(changedSinceReport)];
  if (unique.length) {
    return {
      stale: true,
      reason: `Source changed after last review: ${unique.slice(0, 8).join(", ")}`,
      changedSinceReport: unique,
    };
  }
  return { stale: false, changedSinceReport: [] };
}

export function loadLatestReport(root = ROOT): ReviewReport | null {
  const p = path.join(root, ".autoreview", "reports", "latest.json");
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as ReviewReport;
  } catch {
    return null;
  }
}

export function finishAgentTask(options?: { allowWarnings?: boolean; root?: string }): {
  ok: boolean;
  exitCode: number;
  message: string;
  report: ReviewReport | null;
} {
  const root = options?.root ?? ROOT;
  const session = readSession();
  if (!session || session.finishedAt) {
    return {
      ok: false,
      exitCode: 1,
      message: 'No active task session. Run: npm run agent:task -- --task "…"',
      report: null,
    };
  }

  const freshness = isReportStale(root);
  if (freshness.stale) {
    return {
      ok: false,
      exitCode: 1,
      message: [
        "Cannot finish: scoped verification is missing or stale.",
        freshness.reason || "Run npm run review:run after your latest code changes.",
        freshness.changedSinceReport.length
          ? `Changed since report: ${freshness.changedSinceReport.join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
      report: null,
    };
  }

  const report = loadLatestReport(root);
  if (!report) {
    return {
      ok: false,
      exitCode: 1,
      message: "latest.json missing after freshness check — run npm run review:run",
      report: null,
    };
  }

  report.finalStatus = deriveFinalStatus(report);
  writeReports(report, root);

  if (!report.gatesPassed && !options?.allowWarnings) {
    return {
      ok: false,
      exitCode: 1,
      message: `Quality gates failed (status: ${report.finalStatus}). Fix issues and re-run npm run review:run.`,
      report,
    };
  }

  finishSession();
  const currentTask = readCurrentTask(root);
  if (currentTask) {
    const donePath = path.join(root, ".autoreview", "current-task.json");
    fs.writeFileSync(
      donePath,
      JSON.stringify(
        { ...currentTask, finishedAt: new Date().toISOString(), status: "completed" },
        null,
        2
      ),
      "utf8"
    );
  }

  const template = [
    "Task finished. Use this final-response template:",
    "",
    "Implemented:",
    "*(list meaningful changes)*",
    "",
    "Verified:",
    "*(list scoped checks that passed)*",
    "",
    "Skipped:",
    "*(list skipped checks and why)*",
    "",
    "Remaining:",
    "*(unresolved issues / user decisions)*",
    "",
    "Report:",
    "",
    "`.autoreview/reports/latest.md`",
    "",
    "Final status:",
    "",
    String(report.finalStatus),
    "",
    report.wording,
  ].join("\n");

  printAgentSummary(report);

  return {
    ok: true,
    exitCode: 0,
    message: template,
    report,
  };
}

/** For tests — fingerprint hash helper */
export function fingerprintKey(files: Record<string, string | null>): string {
  return crypto.createHash("sha256").update(JSON.stringify(files)).digest("hex").slice(0, 16);
}
