import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT } from "./config.ts";
import { hashFile, listGitStatus, normalizeRepoPath, readSession } from "./session.ts";
import type { TaskSession } from "./types.ts";

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

function fileExistsInHead(file: string): boolean {
  try {
    execFileSync("git", ["cat-file", "-e", `HEAD:${file.replace(/\\/g, "/")}`], {
      cwd: ROOT,
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

function isSourceish(file: string): boolean {
  return /\.(tsx?|jsx?|css|scss|mdx?|json)$/i.test(file);
}

function ignoreAutoreviewNoise(file: string): boolean {
  const n = normalizeRepoPath(file);
  return (
    n.startsWith(".autoreview/") ||
    n.startsWith("node_modules/") ||
    n.startsWith("dist/") ||
    n.startsWith("coverage/") ||
    n.startsWith("playwright-report/") ||
    n.startsWith("test-results/")
  );
}

/**
 * Pure task-isolation filter: include only files new/changed after session snapshot.
 */
export function filterSessionChanges(input: {
  session: TaskSession;
  currentDirtyFiles: string[];
  currentHashes: Record<string, string | null>;
}): { changedFiles: string[]; excludedPreexisting: string[] } {
  const baseline = new Set(
    [
      ...input.session.stagedFiles,
      ...input.session.unstagedFiles,
      ...input.session.untrackedFiles,
    ].map(normalizeRepoPath)
  );

  const changed: string[] = [];
  const excludedPreexisting: string[] = [];

  for (const raw of input.currentDirtyFiles) {
    const file = normalizeRepoPath(raw);
    if (ignoreAutoreviewNoise(file)) continue;
    const wasPresent = baseline.has(file);
    const startHash = input.session.fileHashes[file] ?? null;
    const nowHash = input.currentHashes[file] ?? null;

    if (!wasPresent) {
      changed.push(file);
      continue;
    }
    if (startHash !== nowHash) {
      changed.push(file);
    } else {
      excludedPreexisting.push(file);
    }
  }

  return {
    changedFiles: [...new Set(changed)],
    excludedPreexisting: [...new Set(excludedPreexisting)],
  };
}

/**
 * Files changed during the current task session.
 * Excludes files that were already dirty at session start unless their hash changed further.
 */
export function detectTaskChangedFiles(options?: {
  explicitFiles?: string[];
  baseBranch?: string;
}): {
  changedFiles: string[];
  session: TaskSession | null;
  isolationWarning?: string;
  excludedPreexisting: string[];
} {
  const session = readSession();
  const explicit = (options?.explicitFiles ?? []).map(normalizeRepoPath);

  if (explicit.length > 0) {
    return {
      changedFiles: explicit.filter((f) => !ignoreAutoreviewNoise(f)),
      session,
      excludedPreexisting: [],
      isolationWarning: session
        ? undefined
        : "Task isolation is less precise: explicit files provided without an active session.",
    };
  }

  if (session && !session.finishedAt) {
    const { staged, unstaged, untracked } = listGitStatus();
    const currentDirty = [...new Set([...staged, ...unstaged, ...untracked])]
      .map(normalizeRepoPath)
      .filter((f) => !ignoreAutoreviewNoise(f));

    const currentHashes: Record<string, string | null> = {};
    for (const file of currentDirty) {
      currentHashes[file] = hashFile(file);
    }

    const filtered = filterSessionChanges({
      session,
      currentDirtyFiles: currentDirty,
      currentHashes,
    });

    const changed = [...filtered.changedFiles];
    const excludedPreexisting = [...filtered.excludedPreexisting];

    // Also include files that were modified and then staged/committed mid-session
    // relative to the session commit (uncommitted only is primary; this catches more)
    const sinceCommit = git(["diff", "--name-only", session.commit]);
    const baseline = new Set(
      [...session.stagedFiles, ...session.unstagedFiles, ...session.untrackedFiles].map(
        normalizeRepoPath
      )
    );
    for (const line of sinceCommit.split("\n")) {
      const file = normalizeRepoPath(line.trim());
      if (!file || ignoreAutoreviewNoise(file)) continue;
      if (!changed.includes(file) && !excludedPreexisting.includes(file)) {
        if (!baseline.has(file) || session.fileHashes[file] !== hashFile(file)) {
          changed.push(file);
        }
      }
    }

    return {
      changedFiles: [...new Set(changed)],
      session,
      excludedPreexisting: [...new Set(excludedPreexisting)],
    };
  }

  // Fallback chain without session
  const { staged, unstaged, untracked } = listGitStatus();
  const dirty = [...new Set([...staged, ...unstaged, ...untracked])]
    .map(normalizeRepoPath)
    .filter((f) => !ignoreAutoreviewNoise(f));

  if (dirty.length > 0) {
    return {
      changedFiles: dirty,
      session: null,
      excludedPreexisting: [],
      isolationWarning:
        "Verification is less precise: no task session exists. Using staged/unstaged Git changes. Run `npm run review:start` before implementation for task isolation.",
    };
  }

  const base = options?.baseBranch ?? "master";
  const branchDiff = git(["diff", "--name-only", `${base}...HEAD`]);
  const fromBranch = branchDiff
    .split("\n")
    .map((l) => normalizeRepoPath(l.trim()))
    .filter((f) => f && !ignoreAutoreviewNoise(f));

  if (fromBranch.length > 0) {
    return {
      changedFiles: fromBranch,
      session: null,
      excludedPreexisting: [],
      isolationWarning:
        "Verification is less precise: no task session exists. Using branch diff against base branch.",
    };
  }

  const commitDiff = git(["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"]);
  const fromCommit = commitDiff
    .split("\n")
    .map((l) => normalizeRepoPath(l.trim()))
    .filter((f) => f && !ignoreAutoreviewNoise(f));

  return {
    changedFiles: fromCommit,
    session: null,
    excludedPreexisting: [],
    isolationWarning:
      "Verification is less precise: no task session exists. Falling back to current commit diff.",
  };
}

export function prioritizeFiles(
  files: string[],
  max: number
): {
  included: string[];
  excluded: string[];
} {
  const scored = files.map((file) => {
    let score = 0;
    if (/\.(tsx|jsx)$/.test(file)) score += 50;
    if (file.includes("/pages/") || file.includes("/components/")) score += 30;
    if (file.includes("/layout/")) score += 25;
    if (/\.(css|scss)$/.test(file)) score += 20;
    if (file.includes("/hooks/") || file.includes("/utils/")) score += 10;
    if (/\.test\.(ts|tsx)$/.test(file) || file.includes("/tests/")) score += 5;
    if (!fs.existsSync(path.join(ROOT, file))) score -= 100;
    // Prefer newly created (untracked) — absence in HEAD
    const inHead = fileExistsInHead(file);
    if (!inHead && fs.existsSync(path.join(ROOT, file))) score += 40;
    if (isSourceish(file)) score += 5;
    return { file, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const included = scored.slice(0, max).map((s) => s.file);
  const excluded = scored.slice(max).map((s) => s.file);
  return { included, excluded };
}
