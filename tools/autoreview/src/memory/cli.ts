#!/usr/bin/env node
import { addFeedback, addFeedbackFromFile, listFeedback, searchMemory } from "./feedback.ts";
import { compactMemory, reviewMemorySummary } from "./compact.ts";
import { rebuildIndex } from "./index-builder.ts";
import { retrieveMemory } from "./retrieve.ts";
import { initAgentMemory } from "./init.ts";
import { ensureMemoryLayout } from "./store.ts";

function argValue(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

export async function runMemoryCommand(command: string, rest: string[]): Promise<void> {
  initAgentMemory();
  ensureMemoryLayout();

  switch (command) {
    case "memory-add":
    case "add": {
      const file = argValue(rest, "--feedback-file");
      if (file) {
        const result = addFeedbackFromFile(file);
        console.log(`Captured ${result.feedback.id}`);
        if (result.decision) console.log(`Decision ${result.decision.id}`);
        return;
      }
      const feedback = argValue(rest, "--feedback");
      if (!feedback) {
        console.error(
          'Usage: memory:add -- --feedback "..." [--component X] [--route /path] [--source screenshot] [--task "..."]'
        );
        process.exitCode = 1;
        return;
      }
      const result = addFeedback({
        feedback,
        component: argValue(rest, "--component"),
        route: argValue(rest, "--route"),
        source: argValue(rest, "--source"),
        task: argValue(rest, "--task"),
        viewport: argValue(rest, "--viewport"),
        fixApplied: argValue(rest, "--fix"),
        filesChanged: argValue(rest, "--files")?.split(","),
        files: argValue(rest, "--files")?.split(","),
        verificationPassed: hasFlag(rest, "--verified"),
        userApproved: hasFlag(rest, "--approved"),
        rejectedSolution: argValue(rest, "--rejected"),
        beforeScreenshot: argValue(rest, "--before"),
        afterScreenshot: argValue(rest, "--after"),
        tags: argValue(rest, "--tags")?.split(","),
        category: argValue(rest, "--category"),
      });
      console.log(
        `Captured ${result.feedback.id} (${result.feedback.classification}/${result.feedback.level})`
      );
      if (result.report.rulesRequiringConfirmation.length) {
        console.log(
          `Needs confirmation before treating as preferred style: ${result.report.rulesRequiringConfirmation.join(", ")}`
        );
      }
      if (result.decision) console.log(`Decision ${result.decision.id}`);
      return;
    }
    case "memory-list":
    case "list": {
      const items = listFeedback();
      for (const f of items.slice(0, 50)) {
        console.log(
          `${f.id} [${f.classification}/${f.level}] ${f.scope.components.join(",") || "-"} :: ${f.rawFeedback.slice(0, 100)}`
        );
      }
      console.log(`Total: ${items.length}`);
      return;
    }
    case "memory-search":
    case "search": {
      const hits = searchMemory({
        component: argValue(rest, "--component"),
        tag: argValue(rest, "--tag"),
        route: argValue(rest, "--route"),
        query: argValue(rest, "--query") || rest.find((a) => !a.startsWith("--")),
      });
      console.log(JSON.stringify(hits, null, 2));
      return;
    }
    case "memory-retrieve":
    case "retrieve": {
      const result = retrieveMemory({
        components: argValue(rest, "--component")?.split(","),
        routes: argValue(rest, "--route")?.split(","),
        tags: argValue(rest, "--tag")?.split(","),
        files: argValue(rest, "--files")?.split(","),
        task: argValue(rest, "--task"),
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    case "memory-review":
    case "review": {
      console.log(reviewMemorySummary());
      return;
    }
    case "memory-compact":
    case "compact": {
      const report = compactMemory();
      console.log(JSON.stringify(report, null, 2));
      return;
    }
    case "memory-reindex":
    case "reindex": {
      const index = rebuildIndex();
      console.log(
        `Reindexed ${index.feedback.length} feedback, ${index.decisions.length} decisions`
      );
      return;
    }
    case "memory-init":
    case "init": {
      initAgentMemory();
      console.log("Initialized .agent-memory/");
      return;
    }
    default:
      console.error(`Unknown memory command: ${command}`);
      process.exitCode = 1;
  }
}
