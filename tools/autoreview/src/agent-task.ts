import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT } from "./config.ts";
import { hashFile, listGitStatus, normalizeRepoPath, startSession } from "./session.ts";
import { loadRouteMap } from "./route-scope.ts";
import { retrieveMemory } from "./memory/retrieve.ts";
import { initAgentMemory } from "./memory/init.ts";
import type { TaskSession } from "./types.ts";

export interface CurrentTaskManifest {
  task: string;
  sessionId: string;
  startedAt: string;
  startingCommit: string;
  baseBranch: string;
  branch: string;
  existingDirtyFiles: string[];
  candidateFiles: string[];
  candidateComponents: string[];
  candidateRoutes: string[];
  relevantMemoryFiles: string[];
  relevantRules: string[];
  requiredCompletionCommand: string;
  thoroughModeAllowed: false;
  crossBrowserAllowed: false;
  agentInstructions: string[];
}

function git(args: string[]): string {
  try {
    return execFileSync("git", args, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

function inferConceptsFromTask(task: string): {
  components: string[];
  routes: string[];
  files: string[];
  tags: string[];
} {
  const lower = task.toLowerCase();
  const components: string[] = [];
  const routes: string[] = [];
  const files: string[] = [];
  const tags: string[] = [];

  const routeMap = loadRouteMap();
  for (const r of routeMap) {
    const slug = r.path.replace(/^\//, "") || "home";
    if (
      lower.includes(slug) ||
      (r.componentName && lower.includes(r.componentName.toLowerCase()))
    ) {
      routes.push(r.path);
      if (r.componentName) components.push(r.componentName);
      if (r.componentFile) files.push(normalizeRepoPath(r.componentFile));
    }
  }

  // Common UI concepts
  if (/card/.test(lower)) {
    tags.push("card");
    components.push("FeatureCard");
  }
  if (/nav|header|menu/.test(lower)) tags.push("navigation");
  if (/animat|motion|smooth|framer|gsap/.test(lower)) tags.push("animation");
  if (/responsive|mobile|breakpoint/.test(lower)) tags.push("responsive");
  if (/overlap|clip|overflow|layout/.test(lower)) tags.push("layout");
  if (/form|input/.test(lower)) tags.push("forms");
  if (/showcase|component/.test(lower) && !routes.includes("/components")) {
    // portfolio may not have /components — keep as concept only
    tags.push("components");
  }

  // PascalCase tokens in task text
  for (const m of task.matchAll(
    /\b([A-Z][a-zA-Z0-9]+(?:Card|Button|Panel|Modal|Layout|Hero|Nav)?)\b/g
  )) {
    components.push(m[1]);
  }

  return {
    components: [...new Set(components)].slice(0, 8),
    routes: [...new Set(routes)].slice(0, 4),
    files: [...new Set(files)].slice(0, 12),
    tags: [...new Set(tags)],
  };
}

function memoryFilePaths(components: string[], routes: string[]): string[] {
  const out: string[] = [
    ".agent-memory/design-principles.md",
    ".agent-memory/anti-patterns.md",
    ".agent-memory/preferences.json",
  ];
  for (const c of components) {
    const p = `.agent-memory/components/${c}.json`;
    if (fs.existsSync(path.join(ROOT, p))) out.push(p);
  }
  for (const r of routes) {
    const slug = r.replace(/^\//, "").replace(/\//g, "-") || "home";
    const p = `.agent-memory/routes/${slug}.json`;
    if (fs.existsSync(path.join(ROOT, p))) out.push(p);
  }
  return [...new Set(out)];
}

export function writeTaskArtifacts(
  manifest: CurrentTaskManifest,
  contextMarkdown: string,
  root = ROOT
): { manifestPath: string; contextPath: string } {
  const dir = path.join(root, ".autoreview");
  const reports = path.join(dir, "reports");
  fs.mkdirSync(reports, { recursive: true });
  const manifestPath = path.join(dir, "current-task.json");
  const contextPath = path.join(reports, "task-context.md");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  fs.writeFileSync(contextPath, contextMarkdown, "utf8");
  return { manifestPath, contextPath };
}

export function readCurrentTask(root = ROOT): CurrentTaskManifest | null {
  const p = path.join(root, ".autoreview", "current-task.json");
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as CurrentTaskManifest;
  } catch {
    return null;
  }
}

export function bootstrapAgentTask(
  task: string,
  baseBranch: string,
  root = ROOT
): {
  session: TaskSession;
  manifest: CurrentTaskManifest;
  manifestPath: string;
  contextPath: string;
  printed: string;
} {
  initAgentMemory(root);
  const session = startSession(task, baseBranch);
  const { staged, unstaged, untracked } = listGitStatus();
  const existingDirtyFiles = [
    ...new Set([...staged, ...unstaged, ...untracked].map(normalizeRepoPath)),
  ];

  const inferred = inferConceptsFromTask(task);
  const memory = retrieveMemory(
    {
      task,
      components: inferred.components,
      routes: inferred.routes,
      files: inferred.files,
      tags: inferred.tags,
    },
    root
  );

  const relevantRules = [...memory.rules.slice(0, 10).map((r) => `${r.id}: ${r.rule}`)];
  const relevantMemoryFiles = memoryFilePaths(inferred.components, inferred.routes);

  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]) || "unknown";

  const manifest: CurrentTaskManifest = {
    task,
    sessionId: session.id,
    startedAt: session.startedAt,
    startingCommit: session.commit,
    baseBranch: session.baseBranch,
    branch,
    existingDirtyFiles,
    candidateFiles: inferred.files,
    candidateComponents: inferred.components,
    candidateRoutes: inferred.routes,
    relevantMemoryFiles,
    relevantRules,
    requiredCompletionCommand: "npm run review:run",
    thoroughModeAllowed: false,
    crossBrowserAllowed: false,
    agentInstructions: [
      "Read AGENTS.md before implementing.",
      "Implement only the requested change.",
      "Default completion validation: npm run review:run",
      "Do not run thorough or cross-browser unless explicitly requested.",
      "Finish with: npm run agent:finish",
      "Final response must include evidence; never only “done”.",
    ],
  };

  const contextLines: string[] = [];
  contextLines.push(`# Task context`);
  contextLines.push("");
  contextLines.push(`**Task:** ${task}`);
  contextLines.push(`**Session ID:** ${session.id}`);
  contextLines.push(`**Started:** ${session.startedAt}`);
  contextLines.push(`**Commit:** ${session.commit}`);
  contextLines.push(`**Branch:** ${branch}`);
  contextLines.push("");
  contextLines.push(`## Read before implementation`);
  contextLines.push("");
  contextLines.push(`* \`AGENTS.md\``);
  for (const f of relevantMemoryFiles) contextLines.push(`* \`${f}\``);
  contextLines.push("");
  contextLines.push(`## Candidate scope (hints only)`);
  contextLines.push("");
  contextLines.push(
    `* Components: ${inferred.components.map((c) => `\`${c}\``).join(", ") || "(none inferred)"}`
  );
  contextLines.push(
    `* Routes: ${inferred.routes.map((r) => `\`${r}\``).join(", ") || "(none inferred)"}`
  );
  contextLines.push(
    `* Files: ${inferred.files.map((f) => `\`${f}\``).join(", ") || "(none inferred)"}`
  );
  contextLines.push("");
  contextLines.push(`## Relevant repository memory (bounded)`);
  contextLines.push("");
  for (const r of relevantRules.slice(0, 10)) contextLines.push(`* ${r}`);
  if (!relevantRules.length) contextLines.push(`* (no scoped rules matched)`);
  contextLines.push("");
  contextLines.push(`## Pre-existing dirty files (excluded unless modified during task)`);
  contextLines.push("");
  for (const f of existingDirtyFiles.slice(0, 40)) {
    const h = hashFile(f);
    contextLines.push(`* \`${f}\` (hash=${h?.slice(0, 12) || "missing"})`);
  }
  if (!existingDirtyFiles.length) contextLines.push(`* (clean working tree at session start)`);
  contextLines.push("");
  contextLines.push(`## Validation`);
  contextLines.push("");
  contextLines.push(`* **Required:** \`npm run review:run\` (fast mode)`);
  contextLines.push(`* **Finish:** \`npm run agent:finish\``);
  contextLines.push(
    `* Thorough / cross-browser: **not allowed** unless the user explicitly requests them`
  );
  contextLines.push("");
  contextLines.push(`Verification must cover the current task scope only.`);
  contextLines.push("");

  const { manifestPath, contextPath } = writeTaskArtifacts(manifest, contextLines.join("\n"), root);

  const printed = [
    "Task session started.",
    "",
    "Read before implementation:",
    ...[`* AGENTS.md`, ...relevantMemoryFiles.map((f) => `* ${f}`)],
    "",
    "Default completion validation:",
    "",
    "npm run review:run",
    "",
    "Optional checks require explicit request:",
    "",
    "npm run review:cross-browser",
    "npm run review:animation",
    "npm run review:thorough",
    "",
    `Context: ${path.relative(root, contextPath).replace(/\\/g, "/")}`,
    `Manifest: ${path.relative(root, manifestPath).replace(/\\/g, "/")}`,
    `Session: .autoreview/sessions/current.json`,
    "",
    "Do not include unrelated memory files. Do not auto-escalate to thorough mode.",
  ].join("\n");

  return { session, manifest, manifestPath, contextPath, printed };
}
