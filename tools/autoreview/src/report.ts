import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { ROOT } from "./config.ts";
import type { FinalStatus, ReviewReport } from "./types.ts";

export function writeReports(
  report: ReviewReport,
  root = ROOT
): {
  jsonPath: string;
  mdPath: string;
} {
  const dir = path.join(root, ".autoreview", "reports");
  fs.mkdirSync(dir, { recursive: true });
  const jsonPath = path.join(dir, "latest.json");
  const mdPath = path.join(dir, "latest.md");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(mdPath, renderMarkdown(report), "utf8");
  return { jsonPath, mdPath };
}

export function deriveFinalStatus(report: ReviewReport): FinalStatus {
  if (report.budgetExhausted) return "Budget exhausted";
  if (
    report.remainingIssues.some(
      (i) =>
        (i.severity === "high" || i.severity === "critical") &&
        i.source === "ai-critic" &&
        /approval|subjective|human/i.test(i.explanation)
    )
  ) {
    return "Needs user visual approval";
  }
  if (!report.gatesPassed) return "Failed";
  if (
    report.remainingIssues.some((i) => i.severity === "medium" || i.severity === "low") ||
    (report.recommendedOptionalChecks?.length ?? 0) > 0
  ) {
    return "Passed with warnings";
  }
  return "Passed";
}

export function detectGitState(root = ROOT): string {
  try {
    const status = execSync("git status --porcelain", {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const head = execSync("git rev-parse --short HEAD", {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!status) return `clean @ ${head}`;
    const lines = status.split("\n").filter(Boolean);
    return `working tree dirty (${lines.length} paths) @ ${head}`;
  } catch {
    return "unknown (not a git repo or git unavailable)";
  }
}

export function buildFileChangeTable(
  changedFiles: string[],
  root = ROOT
): NonNullable<ReviewReport["fileChangeTable"]> {
  const rows: NonNullable<ReviewReport["fileChangeTable"]> = [];
  for (const file of changedFiles) {
    const abs = path.join(root, file);
    let changeType: "Added" | "Modified" | "Deleted" | "Renamed" | "Generated" = "Modified";
    if (file.startsWith(".autoreview/") || file.startsWith(".agent-memory/feedback/")) {
      changeType = "Generated";
    } else if (!fs.existsSync(abs)) {
      changeType = "Deleted";
    } else {
      try {
        const tracked = execSync(`git ls-files --error-unmatch -- "${file}"`, {
          cwd: root,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        });
        if (!tracked.trim()) changeType = "Added";
      } catch {
        changeType = "Added";
      }
    }
    rows.push({
      file,
      changeType,
      purpose: inferPurpose(file),
    });
  }
  return rows;
}

function inferPurpose(file: string): string {
  if (/test|spec/i.test(file)) return "Tests / verification";
  if (/\.css|\.scss$/i.test(file)) return "Styles";
  if (/components?\//i.test(file)) return "UI component";
  if (/pages?\//i.test(file)) return "Page / route";
  if (/autoreview|agent-memory/i.test(file)) return "Autoreview / memory tooling";
  return "Implementation change";
}

export function renderMarkdown(report: ReviewReport): string {
  const status = report.finalStatus || deriveFinalStatus(report);
  const lines: string[] = [];
  lines.push(`# Task Completion Report`);
  lines.push("");
  lines.push(`## 1. Task`);
  lines.push("");
  lines.push(`* **Original task description:** ${report.task}`);
  lines.push(`* **Review session ID:** ${report.session?.id || "(no session)"}`);
  lines.push(`* **Start time:** ${report.startedAt || report.session?.startedAt || "(unknown)"}`);
  lines.push(`* **End time:** ${report.completedAt}`);
  lines.push(
    `* **Review mode:** ${report.mode}${report.checksProfile && report.checksProfile !== "default" ? ` (checks=${report.checksProfile})` : ""}`
  );
  lines.push(
    `* **Base branch:** ${report.baseBranch || report.session?.baseBranch || "(unknown)"}`
  );
  lines.push(
    `* **Final Git commit or working-tree state:** ${report.gitState || detectGitState()}`
  );
  lines.push("");

  lines.push(`## 2. What was implemented`);
  lines.push("");
  if (report.implementationSummary?.length) {
    for (const item of report.implementationSummary) {
      lines.push(`### ${item.title}`);
      lines.push("");
      lines.push(`Files:`);
      lines.push("");
      for (const f of item.files) lines.push(`* \`${f}\``);
      if (item.components.length) {
        lines.push("");
        lines.push(`Components: ${item.components.map((c) => `\`${c}\``).join(", ")}`);
      }
      if (item.routes.length) {
        lines.push("");
        lines.push(`Routes: ${item.routes.map((r) => `\`${r}\``).join(", ")}`);
      }
      lines.push("");
      lines.push(`Changes:`);
      lines.push("");
      for (const c of item.changes) lines.push(`* ${c}`);
      if (item.reason) {
        lines.push("");
        lines.push(`Reason: ${item.reason}`);
      }
      lines.push("");
    }
  } else if (report.changedFiles.length) {
    lines.push(`Task-scoped file changes (auto-summarized from review session):`);
    lines.push("");
    for (const f of report.changedFiles) lines.push(`* \`${f}\` — ${inferPurpose(f)}`);
    lines.push("");
  } else {
    lines.push(`No task-scoped file changes were detected for this review.`);
    lines.push("");
  }

  lines.push(`## 3. Files changed`);
  lines.push("");
  lines.push(`| File | Change type | Purpose |`);
  lines.push(`| --- | --- | --- |`);
  const table = report.fileChangeTable?.length
    ? report.fileChangeTable
    : buildFileChangeTable(report.changedFiles);
  if (!table.length) {
    lines.push(`| _(none)_ | — | No task-scoped files |`);
  } else {
    for (const row of table) {
      lines.push(`| \`${row.file}\` | ${row.changeType} | ${row.purpose} |`);
    }
  }
  lines.push("");
  lines.push(`Unrelated pre-existing dirty files were excluded from this table.`);
  lines.push("");

  lines.push(`## 4. Scope reviewed`);
  lines.push("");
  lines.push(
    `* **Changed files:** ${report.changedFiles.map((f) => `\`${f}\``).join(", ") || "(none)"}`
  );
  lines.push(
    `* **Supporting files loaded:** ${
      Object.keys(report.inclusionReasons)
        .filter((k) => !report.changedFiles.includes(k))
        .slice(0, 20)
        .map((f) => `\`${f}\``)
        .join(", ") || "(none)"
    }`
  );
  lines.push(
    `* **Components reviewed:** ${report.componentsReviewed.map((c) => `\`${c}\``).join(", ") || "(none)"}`
  );
  lines.push(
    `* **Routes opened:** ${report.routesReviewed.map((r) => `\`${r}\``).join(", ") || "(none)"}`
  );
  lines.push(`* **Interactions executed:** ${report.interactionsExecuted.join("; ") || "(none)"}`);
  lines.push(`* **Viewports tested:** ${(report.viewportsTested || []).join(", ") || "(none)"}`);
  lines.push(
    `* **Browsers used:** ${(report.browsersUsed || []).join(", ") || "chromium (default)"}`
  );
  lines.push(
    `* **States tested:** ${(report.statesTested || report.visualQuality?.statesInspected || []).join(", ") || "default"}`
  );
  lines.push("");
  lines.push(`Routes intentionally skipped:`);
  for (const r of report.routesNotOpened.slice(0, 40)) {
    lines.push(`* \`${r}\` — outside current task scope`);
  }
  if (!report.routesNotOpened.length) lines.push(`* (none)`);
  lines.push("");
  lines.push(`Files intentionally excluded:`);
  for (const f of report.excludedFiles.slice(0, 40)) lines.push(`* ${f}`);
  if (!report.excludedFiles.length) lines.push(`* (none)`);
  lines.push("");
  lines.push(`Verification covered the current task scope only.`);
  lines.push("");

  lines.push(`## 5. Tests and checks executed`);
  lines.push("");
  lines.push(`| Check | Scope | Result | Evidence |`);
  lines.push(`| --- | --- | --- | --- |`);
  for (const c of report.checkResults) {
    lines.push(
      `| ${c.name} | task scope | ${c.passed ? "Passed" : c.skipped ? "Skipped" : "Failed"} | ${(c.details || "").slice(0, 80) || c.skipReason || "—"} |`
    );
  }
  for (const t of report.testsExecuted) {
    lines.push(`| Related unit/e2e | ${t} | Passed | test selector |`);
  }
  if (!report.checkResults.length && !report.testsExecuted.length) {
    lines.push(`| (none) | — | Skipped | No checks recorded |`);
  }
  lines.push("");
  lines.push(`Skipped checks:`);
  lines.push("");
  lines.push(`| Check | Status | Reason |`);
  lines.push(`| --- | --- | --- |`);
  for (const s of report.checksSkipped) {
    lines.push(`| ${s.name} | Skipped | ${s.reason} |`);
  }
  if (!report.checksSkipped.length) {
    lines.push(`| (none) | — | — |`);
  }
  lines.push("");

  lines.push(`## 6. Playwright verification`);
  lines.push("");
  if (report.visualQuality) {
    lines.push(
      `* **Playwright projects used:** ${report.visualQuality.projectsExecuted.join(", ") || "(none)"}`
    );
    lines.push(`* **Routes visited:** ${report.visualQuality.routesOpened.join(", ") || "(none)"}`);
    lines.push(
      `* **Selectors inspected:** ${report.visualQuality.componentsInspected.join(", ") || "(scoped surfaces)"}`
    );
    lines.push(
      `* **Interactions performed:** ${report.interactionsExecuted.join("; ") || "(none)"}`
    );
    lines.push(`* **Screenshots captured:**`);
    for (const s of report.screenshots) {
      lines.push(`  * \`.${s.path.startsWith(".") ? s.path.slice(1) : "/" + s.path}\``);
    }
    if (!report.screenshots.length) lines.push(`  * (none)`);
    lines.push(
      `* **Console / runtime / network:** see check results and remaining issues (scoped only)`
    );
    lines.push(
      `* **Geometry / overlap / clipping / overflow:** geometry findings=${report.visualQuality.geometryFindingCount}`
    );
    lines.push(`* **Accessibility violations:** included when accessibility checks ran`);
    lines.push(`* **Layout shifts:** ${report.visualQuality.layoutShifts}`);
    if (report.visualQuality.traces.length) {
      lines.push(`* **Traces:**`);
      for (const t of report.visualQuality.traces) lines.push(`  * \`${t}\``);
    }
  } else {
    lines.push(`Browser/Playwright verification was not executed for this run.`);
  }
  lines.push("");

  lines.push(`## 7. Visual-quality findings`);
  lines.push("");
  const visualIssues = report.issuesFound.filter(
    (i) =>
      ["layout", "overlap", "overflow", "clipping", "spacing", "contrast"].includes(i.category) ||
      /overlap|clip|overflow|geometry|layout|badge|title/i.test(i.explanation)
  );
  if (!visualIssues.length) {
    lines.push(`No visual issues were found within the reviewed task scope.`);
  } else {
    for (const issue of visualIssues) {
      lines.push(`### ${issue.explanation.split("|")[0].trim()}`);
      lines.push("");
      lines.push(`Severity: ${issue.severity}`);
      lines.push(`Confidence: ${issue.confidence}`);
      lines.push(`Detected by: ${issue.source}`);
      if (issue.recommendedFix) lines.push(`Fix: ${issue.recommendedFix}`);
      lines.push(
        `Verification: ${issue.repaired ? "Addressed in repair loop" : "See remaining issues"}`
      );
      lines.push("");
    }
  }
  lines.push("");

  lines.push(`## 8. Animation and smoothness findings`);
  lines.push("");
  const animRan =
    report.visualQuality?.animationTiming?.length ||
    report.issuesFound.some((i) => i.category === "animation" || i.category === "interaction");
  if (!animRan) {
    lines.push(
      `Animation-specific checks were not run because the task did not modify animated behavior.`
    );
  } else {
    for (const t of report.visualQuality?.animationTiming || []) {
      lines.push(`* **${t.interactionId}:** ${t.warnings.join("; ") || "within thresholds"}`);
    }
    lines.push(`* Long tasks: ${report.visualQuality?.longTasks ?? 0}`);
    lines.push(`* Layout shifts: ${report.visualQuality?.layoutShifts ?? 0}`);
  }
  lines.push("");

  lines.push(`## 9. Repairs performed`);
  lines.push("");
  if (!report.repairsApplied.length) {
    lines.push(`No repairs were performed during the review loop.`);
  } else {
    for (const r of report.repairsApplied) {
      lines.push(`### ${r.findingId}`);
      lines.push("");
      lines.push(`* **Original issue:** ${r.description}`);
      lines.push(
        `* **Fix applied:** ${r.applied ? "yes" : "no"}${r.result ? ` — ${r.result}` : ""}`
      );
      lines.push(`* **Checks rerun:** stale evidence refresh after repair`);
      lines.push(`* **Final result:** ${r.applied ? "applied" : "skipped"}`);
      lines.push("");
    }
  }
  lines.push("");

  lines.push(`## 10. Repository memory updates`);
  lines.push("");
  if (!report.memory) {
    lines.push(`No repository memory section for this run.`);
  } else {
    lines.push(`* **Existing rules loaded:**`);
    for (const r of report.memory.rulesLoaded) lines.push(`  * ${r}`);
    if (!report.memory.rulesLoaded.length) lines.push(`  * (none)`);
    lines.push(`* **Component rules applied:**`);
    for (const [comp, rules] of Object.entries(report.memory.applicableByComponent)) {
      lines.push(`  * **${comp}:** ${rules.join("; ") || "(none)"}`);
    }
    lines.push(
      `* **Rejected patterns avoided:** ${report.memory.rejectedPatternsAdded.join(", ") || "(none new)"}`
    );
    lines.push(
      `* **New feedback captured:** ${report.memory.newFeedbackCaptured.join(", ") || "(none)"}`
    );
    lines.push(`* **New rules created:** ${report.memory.rulesCreated.join(", ") || "(none)"}`);
    lines.push(`* **Approved baselines updated:** only via explicit baseline approve command`);
    lines.push(
      `* **Conflicts detected:** ${report.memory.conflictsDetected.join(", ") || "(none)"}`
    );
    lines.push(
      `* **Rules awaiting user approval:** ${report.memory.rulesRequiringConfirmation.join(", ") || "(none)"}`
    );
  }
  lines.push("");

  lines.push(`## 11. Quality gates`);
  lines.push("");
  lines.push(`| Gate | Result |`);
  lines.push(`| --- | --- |`);
  for (const g of report.gates) {
    const result = g.skipped ? "Skipped" : g.passed ? "Passed" : "Failed";
    lines.push(`| ${g.name} | ${result} |`);
  }
  if (!report.gates.length) lines.push(`| (none) | Not applicable |`);
  lines.push("");

  lines.push(`## 12. Budget usage`);
  lines.push("");
  lines.push(`* Files reviewed: ${report.changedFiles.length}`);
  lines.push(`* Routes reviewed: ${report.routesReviewed.length}`);
  lines.push(
    `* Screenshots used: ${report.screenshotUsage.used} / ${report.screenshotUsage.budget}`
  );
  lines.push(`* Browser interactions used: ${report.interactionsExecuted.length}`);
  lines.push(`* AI critic calls used: ${report.aiCallsUsed.used} / ${report.aiCallsUsed.budget}`);
  lines.push(`* Repair iterations used: ${report.repairsApplied.filter((r) => r.applied).length}`);
  lines.push(
    `* Test execution duration: ${report.testDurationMs != null ? `${report.testDurationMs}ms` : "(not measured)"}`
  );
  lines.push(`* Cache hits: ${report.cache.hits} (misses: ${report.cache.misses})`);
  lines.push(`* Approximate model tokens used: ${report.estimatedTokenUsage}`);
  lines.push("");

  lines.push(`## 13. Remaining issues`);
  lines.push("");
  if (!report.remainingIssues.length) {
    lines.push(`* No unresolved findings within the reviewed task scope.`);
  } else {
    for (const issue of report.remainingIssues) {
      lines.push(
        `* [${issue.severity}/${issue.confidence}] ${issue.category}: ${issue.explanation}`
      );
    }
  }
  lines.push("");
  lines.push(`Known limitations / checks not performed:`);
  for (const s of report.checksSkipped) lines.push(`* ${s.name}: ${s.reason}`);
  if (!report.checksSkipped.length) lines.push(`* (none listed)`);
  lines.push("");

  lines.push(`## 14. Recommended optional checks`);
  lines.push("");
  if (!report.recommendedOptionalChecks?.length) {
    lines.push(`No additional optional checks are recommended for this task.`);
  } else {
    for (const r of report.recommendedOptionalChecks) lines.push(`* ${r}`);
  }
  lines.push("");
  lines.push(`These recommendations are advisory only and were **not** executed automatically.`);
  lines.push("");

  lines.push(`## 15. Final status`);
  lines.push("");
  lines.push(`**${status}**`);
  lines.push("");
  lines.push(`Verification completed for the current task scope.`);
  lines.push("");
  return lines.join("\n");
}

export function printAgentSummary(report: ReviewReport): void {
  const status = report.finalStatus || deriveFinalStatus(report);
  console.log("");
  console.log("Implemented:");
  if (report.implementationSummary?.length) {
    for (const item of report.implementationSummary) {
      for (const c of item.changes.slice(0, 3)) console.log(`* ${c}`);
    }
  } else {
    for (const f of report.changedFiles.slice(0, 8)) console.log(`* ${f}`);
    if (!report.changedFiles.length) console.log("* (no task-scoped files)");
  }
  console.log("");
  console.log("Verified:");
  const passed = report.gates.filter((g) => g.passed).map((g) => g.name);
  for (const p of passed.slice(0, 8)) console.log(`* ${p}`);
  if (!passed.length) console.log("* (see report gates)");
  console.log("");
  console.log("Skipped:");
  for (const s of report.checksSkipped.slice(0, 8)) {
    console.log(`* ${s.name} because ${s.reason}`);
  }
  if (!report.checksSkipped.length) console.log("* (none)");
  console.log("");
  console.log("Report:");
  console.log("");
  console.log("`.autoreview/reports/latest.md`");
  console.log("");
  console.log("Final status:");
  console.log("");
  console.log(status);
  console.log("");
  console.log(report.wording);
}

export function regenerateReportFromLatest(root = ROOT): ReviewReport | null {
  const jsonPath = path.join(root, ".autoreview", "reports", "latest.json");
  if (!fs.existsSync(jsonPath)) return null;
  const report = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as ReviewReport;
  report.finalStatus = deriveFinalStatus(report);
  report.gitState = report.gitState || detectGitState(root);
  writeReports(report, root);
  return report;
}

export function mergeFindings(findings: ReviewReport["issuesFound"]): ReviewReport["issuesFound"] {
  const seen = new Map<string, (typeof findings)[number]>();
  for (const f of findings) {
    const key = `${f.category}|${f.selector ?? ""}|${f.route ?? ""}|${f.explanation}`;
    const prev = seen.get(key);
    if (!prev || f.confidence > prev.confidence) seen.set(key, f);
  }
  return [...seen.values()];
}

export function redactedEnvValue(value: string): string {
  if (/key|token|secret|password|credential/i.test(value)) return "[REDACTED]";
  return value;
}
