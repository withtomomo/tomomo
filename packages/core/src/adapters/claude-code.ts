import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { launchFromConfig } from "./shared";
import type {
  TomomoAdapter,
  AdapterCheck,
  LaunchContext,
  AgentProcess,
  SpawnConfig,
} from "../types";

const execFileAsync = promisify(execFile);

export const claudeCodeAdapter: TomomoAdapter = {
  name: "claude-code",
  compactionModel: "haiku",
  install: {
    command: "npm install -g @anthropic-ai/claude-code",
    description: "Claude Code by Anthropic",
    url: "https://docs.anthropic.com/en/docs/claude-code",
  },

  async check(): Promise<AdapterCheck> {
    try {
      await execFileAsync("claude", ["--version"]);
      return { available: true };
    } catch {
      return { available: false, error: "Claude Code is not installed" };
    }
  },

  async getSpawnConfig(ctx: LaunchContext): Promise<SpawnConfig> {
    const tmpId = randomBytes(8).toString("hex");
    const tmpDirPath = join(tmpdir(), "tomomo-claude");
    await mkdir(tmpDirPath, { recursive: true });
    const systemPromptPath = join(tmpDirPath, `system-${tmpId}.md`);
    await writeFile(systemPromptPath, ctx.systemPrompt, {
      encoding: "utf-8",
      mode: 0o600,
    });

    const args: string[] = [];

    args.push("--system-prompt-file", systemPromptPath);
    args.push("--add-dir", ctx.agentDir);

    if (ctx.agent.model) {
      args.push("--model", ctx.agent.model);
    }

    if (ctx.resumeSessionId) {
      args.push("--resume", ctx.resumeSessionId);
    }

    if (ctx.skipPermissions) {
      args.push("--dangerously-skip-permissions");
    }

    args.push("--name", ctx.agent.name);

    if (ctx.mcpConfigPath) {
      args.push("--mcp-config", ctx.mcpConfigPath);
    }

    args.push(ctx.projectDir);

    return {
      command: "claude",
      args,
      cleanup() {
        unlink(systemPromptPath).catch((err) => {
          if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
            console.warn("Failed to clean up system prompt:", err);
          }
        });
      },
    };
  },

  async launch(ctx: LaunchContext): Promise<AgentProcess> {
    return launchFromConfig(this, ctx);
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
      const { stdout } = await execFileAsync("claude", args, {
        maxBuffer: 1024 * 1024,
      });
      return stdout;
    } catch (err) {
      const execErr = err as Error & { stderr?: string };
      throw new Error(
        `Claude Code prompt failed: ${execErr.stderr || execErr.message}`
      );
    }
  },
};
