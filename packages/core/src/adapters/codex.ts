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

export const codexAdapter: TomomoAdapter = {
  name: "codex",
  install: {
    command: "npm install -g @openai/codex",
    description: "Codex by OpenAI",
    url: "https://github.com/openai/codex",
  },

  async check(): Promise<AdapterCheck> {
    try {
      await execFileAsync("codex", ["--version"]);
      return { available: true };
    } catch {
      return { available: false, error: "Codex is not installed" };
    }
  },

  async getSpawnConfig(ctx: LaunchContext): Promise<SpawnConfig> {
    if (ctx.resumeSessionId) {
      console.warn(
        "Warning: Codex does not support session resume. Starting a new session."
      );
    }

    const tmpId = randomBytes(8).toString("hex");
    const tmpDirPath = join(tmpdir(), "tomomo-codex");
    await mkdir(tmpDirPath, { recursive: true });
    const systemPromptPath = join(tmpDirPath, `system-${tmpId}.md`);
    await writeFile(systemPromptPath, ctx.systemPrompt, {
      encoding: "utf-8",
      mode: 0o600,
    });

    const args: string[] = [];

    args.push("--system-prompt-file", systemPromptPath);

    if (ctx.skipPermissions) {
      args.push("--full-auto");
    }

    if (ctx.agent.model) {
      args.push("--model", ctx.agent.model);
    }

    if (ctx.mcpConfigPath) {
      args.push("--mcp-config", ctx.mcpConfigPath);
    }

    args.push(ctx.projectDir);

    return {
      command: "codex",
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
};
