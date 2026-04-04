import { spawn } from "node:child_process";
import type { TomomoAdapter, LaunchContext, AgentProcess } from "../types";

// Shared launch implementation that all adapters can use.
// Calls getSpawnConfig() then spawns with proper exit and error handling.
export async function launchFromConfig(
  adapter: TomomoAdapter,
  ctx: LaunchContext
): Promise<AgentProcess> {
  if (!adapter.getSpawnConfig) {
    throw new Error(
      `Adapter "${adapter.name}" does not implement getSpawnConfig. Use a custom launch() instead.`
    );
  }
  const config = await adapter.getSpawnConfig(ctx);

  const proc = spawn(config.command, config.args, {
    stdio: "inherit",
    cwd: config.cwd ?? ctx.projectDir,
    env: { ...process.env, ...(config.env ?? {}) },
  });

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    config.cleanup?.();
  };

  return {
    process: proc,
    onExit(callback) {
      let called = false;
      const once = (code: number | null) => {
        if (called) return;
        called = true;
        cleanup();
        callback(code);
      };
      proc.on("exit", (code) => once(code));
      // Spawn failures (e.g., ENOENT) may never emit "exit".
      proc.on("error", () => once(null));
    },
  };
}
