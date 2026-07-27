import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type { TaskSession } from "./types.ts";
import { ROOT } from "./config.ts";

const SESSION_DIR = path.join(ROOT, ".autoreview", "sessions");
const CURRENT_SESSION = path.join(SESSION_DIR, "current.json");

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function normalizeRepoPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}

export function hashFile(filePath: string): string | null {
  try {
    const abs = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
    if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) return null;
    const buf = fs.readFileSync(abs);
    return crypto.createHash("sha256").update(buf).digest("hex");
  } catch {
    return null;
  }
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

export function listGitStatus(): {
  staged: string[];
  unstaged: string[];
  untracked: string[];
} {
  const out = git(["status", "--porcelain", "-uall"]);
  const staged: string[] = [];
  const unstaged: string[] = [];
  const untracked: string[] = [];
  for (const line of out.split("\n")) {
    if (!line.trim()) continue;
    const code = line.slice(0, 2);
    const raw = line.slice(3);
    const file = normalizeRepoPath(raw.includes(" -> ") ? raw.split(" -> ").pop()! : raw);
    if (code === "??") {
      untracked.push(file);
      continue;
    }
    if (code[0] !== " " && code[0] !== "?") staged.push(file);
    if (code[1] !== " " && code[1] !== "?") unstaged.push(file);
  }
  return { staged, unstaged, untracked };
}

export function startSession(task: string, baseBranch = "master"): TaskSession {
  ensureDir(SESSION_DIR);
  const { staged, unstaged, untracked } = listGitStatus();
  const commit = git(["rev-parse", "HEAD"]) || "unknown";
  const existing = [...new Set([...staged, ...unstaged, ...untracked])];
  const fileHashes: Record<string, string | null> = {};
  for (const file of existing) {
    fileHashes[normalizeRepoPath(file)] = hashFile(file);
  }
  const session: TaskSession = {
    id: crypto.randomUUID(),
    task,
    startedAt: new Date().toISOString(),
    commit,
    baseBranch,
    stagedFiles: staged.map(normalizeRepoPath),
    unstagedFiles: unstaged.map(normalizeRepoPath),
    untrackedFiles: untracked.map(normalizeRepoPath),
    fileHashes,
  };
  fs.writeFileSync(CURRENT_SESSION, JSON.stringify(session, null, 2), "utf8");
  return session;
}

export function readSession(): TaskSession | null {
  if (!fs.existsSync(CURRENT_SESSION)) return null;
  try {
    const session = JSON.parse(fs.readFileSync(CURRENT_SESSION, "utf8")) as TaskSession;
    if (!session.id) {
      session.id = crypto.randomUUID();
      fs.writeFileSync(CURRENT_SESSION, JSON.stringify(session, null, 2), "utf8");
    }
    return session;
  } catch {
    return null;
  }
}

export function finishSession(): TaskSession | null {
  const session = readSession();
  if (!session) return null;
  const finished: TaskSession = { ...session, finishedAt: new Date().toISOString() };
  ensureDir(SESSION_DIR);
  const stamp = finished.finishedAt.replace(/[:.]/g, "-");
  fs.writeFileSync(path.join(SESSION_DIR, `${stamp}.json`), JSON.stringify(finished, null, 2));
  fs.writeFileSync(CURRENT_SESSION, JSON.stringify(finished, null, 2));
  return finished;
}

export function sessionStatus(): {
  active: boolean;
  session: TaskSession | null;
} {
  const session = readSession();
  if (!session) return { active: false, session: null };
  return { active: !session.finishedAt, session };
}

export { CURRENT_SESSION, SESSION_DIR };
