import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import { ROOT } from "./config.ts";

export function runProcess(
  command: string,
  args: string[],
  options: SpawnSyncOptions = {}
): {
  status: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
} {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: process.platform === "win32",
    ...options,
  });
  return {
    status: result.status,
    stdout: String(result.stdout || ""),
    stderr: String(result.stderr || ""),
    timedOut: Boolean(result.error && /TIMEOUT/i.test(String(result.error))),
  };
}
