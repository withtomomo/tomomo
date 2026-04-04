import { spawn } from "node:child_process";
import { prepareLaunch } from "@tomomo/core";
import type { LaunchOptions, LaunchResult } from "@tomomo/core";

export async function launchAgent(
  options: LaunchOptions
): Promise<LaunchResult> {
  const prepared = await prepareLaunch(options);

  const proc = spawn(prepared.spawnConfig.command, prepared.spawnConfig.args, {
    stdio: "inherit",
    cwd: prepared.spawnConfig.cwd,
    env: { ...process.env, ...(prepared.spawnConfig.env ?? {}) },
  });

  return new Promise((resolve) => {
    let exited = false;
    const done = async (code: number | null) => {
      if (exited) return;
      exited = true;
      prepared.spawnConfig.cleanup?.();
      await prepared.recordExit().catch(() => {});
      resolve({ exitCode: code });
    };
    proc.on("exit", (code) => done(code));
    proc.on("error", () => done(null));
  });
}
