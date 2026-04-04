import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import type {
  TomomoAdapter,
  AdapterCheck,
  LaunchContext,
  AgentProcess,
} from "../types";

const execFileAsync = promisify(execFile);

export const geminiCliAdapter: TomomoAdapter = {
  name: "gemini-cli",
  install: {
    command: "npm install -g @google/gemini-cli",
    description: "Gemini CLI by Google",
    url: "https://github.com/google-gemini/gemini-cli",
  },

  async check(): Promise<AdapterCheck> {
    try {
      await execFileAsync("gemini", ["--version"]);
      return { available: true };
    } catch {
      return { available: false, error: "Gemini CLI is not installed" };
    }
  },

  async launch(ctx: LaunchContext): Promise<AgentProcess> {
    // Write system prompt to temp file (owned by launch, cleaned up on exit)
    const tmpId = randomBytes(8).toString("hex");
    const tmpDirPath = join(tmpdir(), "tomomo-gemini");
    await mkdir(tmpDirPath, { recursive: true });
    const systemMdPath = join(tmpDirPath, `system-${tmpId}.md`);
    await writeFile(systemMdPath, ctx.systemPrompt, {
      encoding: "utf-8",
      mode: 0o600,
    });

    const args: string[] = [];

    if (ctx.skipPermissions) {
      args.push("--yolo");
    }

    if (ctx.agent.model) {
      args.push("--model", ctx.agent.model);
    }

    if (ctx.resumeSessionId) {
      args.push("--resume", ctx.resumeSessionId);
    }

    if (ctx.mcpConfigPath) {
      args.push("--mcp-config", ctx.mcpConfigPath);
    }

    const proc = spawn("gemini", args, {
      stdio: "inherit",
      cwd: ctx.projectDir,
      env: { ...process.env, GEMINI_SYSTEM_MD: systemMdPath },
    });

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      unlink(systemMdPath).catch((err) => {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
          console.warn("Failed to clean up system prompt:", err);
        }
      });
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
        proc.on("error", () => once(null));
      },
    };
  },

  async runPrompt(
    prompt: string,
    options?: { model?: string }
  ): Promise<string> {
    const args = ["-p", prompt];
    if (options?.model) {
      args.push("--model", options.model);
    }
    try {
      const { stdout } = await execFileAsync("gemini", args, {
        maxBuffer: 1024 * 1024,
      });
      return stdout;
    } catch (err) {
      const execErr = err as Error & { stderr?: string };
      throw new Error(
        `Gemini CLI prompt failed: ${execErr.stderr || execErr.message}`
      );
    }
  },
};
