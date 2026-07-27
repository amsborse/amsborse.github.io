#!/usr/bin/env node
import { loadConfig, resolveMode } from "./config.ts";
import { finishSession, sessionStatus, startSession } from "./session.ts";
import { buildScope, writeScopeReport } from "./scope-builder.ts";
import { ReviewCache } from "./cache.ts";
import { printScopeSummary, runReview } from "./review-loop.ts";
import { runMemoryCommand } from "./memory/cli.ts";
import {
  approveBaseline,
  diffAgainstBaselines,
  listBaselines,
  removeBaseline,
} from "./visual/baselines.ts";
import { printAgentSummary, regenerateReportFromLatest } from "./report.ts";
import { bootstrapAgentTask, readCurrentTask } from "./agent-task.ts";
import { finishAgentTask, isReportStale } from "./agent-finish.ts";
import path from "node:path";
import fs from "node:fs";
import { ROOT } from "./config.ts";

function argValue(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

function parseFiles(args: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" || args[i] === "--files") {
      const v = args[i + 1];
      if (v)
        out.push(
          ...v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        );
    }
  }
  return out;
}

async function main(): Promise<void> {
  const [, , command, ...rest] = process.argv;
  const config = await loadConfig();

  if (command?.startsWith("memory-") || command?.startsWith("memory:")) {
    await runMemoryCommand(command.replace(":", "-"), rest);
    return;
  }

  if (command?.startsWith("baseline-") || command?.startsWith("baseline:")) {
    const cmd = command.replace(":", "-");
    if (cmd === "baseline-approve") {
      const screenshot = argValue(rest, "--screenshot");
      const component = argValue(rest, "--component") || "Unknown";
      const route = argValue(rest, "--route") || "/";
      const selector = argValue(rest, "--selector") || "main";
      const state = argValue(rest, "--state") || "default";
      const viewport = argValue(rest, "--viewport") || "desktop";
      if (!screenshot) {
        console.error(
          "Usage: review:baseline:approve -- --screenshot path --component X --route /path [--selector ...] [--state ...] [--viewport ...]"
        );
        process.exitCode = 1;
        return;
      }
      const abs = path.isAbsolute(screenshot) ? screenshot : path.join(ROOT, screenshot);
      const record = approveBaseline({
        component,
        route,
        selector,
        state,
        viewport,
        screenshotPath: abs,
        memoryDecisionIds: argValue(rest, "--decision")?.split(",") || [],
      });
      console.log(`Approved baseline ${record.id}`);
      return;
    }
    if (cmd === "baseline-list") {
      console.log(JSON.stringify(listBaselines(), null, 2));
      return;
    }
    if (cmd === "baseline-diff") {
      const screenshot = argValue(rest, "--screenshot");
      const route = argValue(rest, "--route") || "/";
      const viewport = argValue(rest, "--viewport") || "desktop";
      if (!screenshot) {
        console.error("Usage: review:baseline:diff -- --screenshot path --route /path");
        process.exitCode = 1;
        return;
      }
      const abs = path.isAbsolute(screenshot) ? screenshot : path.join(ROOT, screenshot);
      console.log(
        JSON.stringify(
          diffAgainstBaselines([
            {
              route,
              viewport,
              screenshotPath: abs,
              component: argValue(rest, "--component"),
              state: argValue(rest, "--state"),
              selector: argValue(rest, "--selector"),
              taskChanged: hasFlag(rest, "--task-changed"),
            },
          ]),
          null,
          2
        )
      );
      return;
    }
    if (cmd === "baseline-remove") {
      const id = argValue(rest, "--id") || rest.find((a) => !a.startsWith("--"));
      if (!id) {
        console.error("Usage: review:baseline:remove -- --id <baseline-id>");
        process.exitCode = 1;
        return;
      }
      console.log(removeBaseline(id) ? `Revoked ${id}` : `Not found ${id}`);
      return;
    }
  }

  switch (command) {
    case "agent-task": {
      const task = argValue(rest, "--task") || rest.filter((a) => !a.startsWith("--")).join(" ");
      if (!task) {
        console.error('Usage: agent:task -- --task "description"');
        process.exitCode = 1;
        return;
      }
      const result = bootstrapAgentTask(task, config.baseBranch);
      console.log(result.printed);
      return;
    }
    case "agent-context": {
      const ctx = path.join(ROOT, ".autoreview", "reports", "task-context.md");
      const manifest = readCurrentTask();
      if (!manifest || !fs.existsSync(ctx)) {
        console.error('No active task context. Run: npm run agent:task -- --task "…"');
        process.exitCode = 1;
        return;
      }
      console.log(fs.readFileSync(ctx, "utf8"));
      console.log(`\nManifest session: ${manifest.sessionId}`);
      console.log(`Stale report: ${isReportStale().stale ? "yes" : "no"}`);
      return;
    }
    case "agent-finish": {
      const result = finishAgentTask({
        allowWarnings: hasFlag(rest, "--allow-warnings"),
      });
      console.log(result.message);
      if (result.report) {
        console.log(`Final status: ${result.report.finalStatus}`);
        console.log(`Report: .autoreview/reports/latest.md`);
      }
      process.exitCode = result.exitCode;
      return;
    }
    case "session-start": {
      const task = argValue(rest, "--task") || rest.filter((a) => !a.startsWith("--")).join(" ");
      if (!task) {
        console.error('Usage: review:start -- --task "description"');
        process.exitCode = 1;
        return;
      }
      const session = startSession(task, config.baseBranch);
      console.log(`Session started for task: ${session.task}`);
      console.log(`Session ID: ${session.id}`);
      console.log(`Commit: ${session.commit}`);
      console.log(`Pre-existing dirty files: ${Object.keys(session.fileHashes).length}`);
      console.log(`Wrote .autoreview/sessions/current.json`);
      return;
    }
    case "session-status": {
      const status = sessionStatus();
      console.log(JSON.stringify(status, null, 2));
      return;
    }
    case "session-finish": {
      const finished = finishSession();
      if (!finished) {
        console.error("No active session to finish.");
        process.exitCode = 1;
        return;
      }
      console.log(`Session finished at ${finished.finishedAt}`);
      return;
    }
    case "scope": {
      const mode = resolveMode(config, argValue(rest, "--mode") || "fast");
      const scope = buildScope({
        config,
        mode,
        explicitFiles: parseFiles(rest),
        cache: new ReviewCache(),
      });
      const pathOut = writeScopeReport(scope);
      printScopeSummary(scope);
      console.log(`Wrote ${pathOut}`);
      return;
    }
    case "report": {
      const report = regenerateReportFromLatest();
      if (!report) {
        console.error("No .autoreview/reports/latest.json found. Run review first.");
        process.exitCode = 1;
        return;
      }
      printAgentSummary(report);
      console.log(
        "Regenerated .autoreview/reports/latest.md from existing results (no tests rerun)."
      );
      return;
    }
    case "review": {
      // Fast is the only default. Thorough requires --mode thorough.
      // Targeted profiles via --checks never auto-escalate to thorough.
      const mode = argValue(rest, "--mode") || "fast";
      const checks = argValue(rest, "--checks");
      const report = await runReview({
        mode,
        checks,
        files: parseFiles(rest),
        skipBrowser: hasFlag(rest, "--skip-browser") || process.env.AUTOREVIEW_SKIP_BROWSER === "1",
        startServer: !hasFlag(rest, "--no-start-server"),
      });
      console.log(`Gates passed: ${report.gatesPassed}`);
      console.log(`Final status: ${report.finalStatus}`);
      console.log(`Report: .autoreview/reports/latest.md`);
      if (!report.gatesPassed) process.exitCode = 1;
      return;
    }
    default: {
      console.log(`Autoreview CLI

Commands:
  agent-task --task "..."     Bootstrap session + memory context
  agent-context               Print .autoreview/reports/task-context.md
  agent-finish                Finish only if review is fresh and gates pass
  session-start --task "..."
  session-status
  session-finish
  scope [--mode fast|thorough|deterministic] [--file path]
  review --mode fast (default) | thorough | deterministic
  review --checks visual|animation|accessibility|responsive|cross-browser|baseline
  report   (regenerate latest.md from latest.json — no rerun)
  memory-add | memory-list | memory-search | memory-review | memory-compact | memory-reindex
  baseline-approve | baseline-list | baseline-diff | baseline-remove

Defaults:
  review always uses fast mode unless --mode thorough is explicit.
  Never auto-runs cross-browser / thorough checks.

Package scripts:
  npm run agent:task | agent:context | agent:finish
  npm run review:run | review:fast | review:thorough
  npm run review:visual | review:animation | review:accessibility
  npm run review:responsive | review:cross-browser | review:baseline | review:report
`);
      if (command) process.exitCode = 1;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
