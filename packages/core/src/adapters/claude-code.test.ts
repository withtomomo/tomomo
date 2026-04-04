import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LaunchContext } from "../types";

// Mock execFile before importing the adapter
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
  spawn: vi.fn(),
}));

import { claudeCodeAdapter } from "./claude-code";
import { execFile } from "node:child_process";

const mockedExecFile = vi.mocked(execFile);

describe("claude-code adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has name set to claude-code", () => {
    expect(claudeCodeAdapter.name).toBe("claude-code");
  });

  it("has compactionModel set to haiku", () => {
    expect(claudeCodeAdapter.compactionModel).toBe("haiku");
  });

  it("has install info", () => {
    expect(claudeCodeAdapter.install).toBeDefined();
    expect(claudeCodeAdapter.install.command).toBe(
      "npm install -g @anthropic-ai/claude-code"
    );
    expect(claudeCodeAdapter.install.description).toBe(
      "Claude Code by Anthropic"
    );
    expect(claudeCodeAdapter.install.url).toContain("anthropic.com");
  });

  it("check() returns available: true when claude --version succeeds", async () => {
    mockedExecFile.mockImplementation((_cmd, _args, callback) => {
      // execFile callback signature: (error, stdout, stderr)
      (callback as Function)(null, "1.0.0", "");
      return undefined as any;
    });

    const result = await claudeCodeAdapter.check();
    expect(result).toEqual({ available: true });
    expect(mockedExecFile).toHaveBeenCalledWith(
      "claude",
      ["--version"],
      expect.any(Function)
    );
  });

  it("check() returns available: false with error when claude --version fails", async () => {
    mockedExecFile.mockImplementation((_cmd, _args, callback) => {
      (callback as Function)(new Error("not found"), "", "");
      return undefined as any;
    });

    const result = await claudeCodeAdapter.check();
    expect(result.available).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("not installed");
  });

  it("runPrompt() calls execFile with -p and the prompt", async () => {
    mockedExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      (callback as Function)(null, { stdout: "response text", stderr: "" });
      return undefined as any;
    });

    const result = await claudeCodeAdapter.runPrompt!("hello world");
    expect(result).toBe("response text");
    expect(mockedExecFile).toHaveBeenCalledWith(
      "claude",
      ["-p", "hello world"],
      expect.objectContaining({ maxBuffer: 1024 * 1024 }),
      expect.any(Function)
    );
  });

  it("runPrompt() passes --model when model option is provided", async () => {
    mockedExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      (callback as Function)(null, { stdout: "response", stderr: "" });
      return undefined as any;
    });

    await claudeCodeAdapter.runPrompt!("test", { model: "opus" });
    expect(mockedExecFile).toHaveBeenCalledWith(
      "claude",
      ["-p", "test", "--model", "opus"],
      expect.any(Object),
      expect.any(Function)
    );
  });

  it("runPrompt() rejects when execFile returns an error", async () => {
    mockedExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      (callback as Function)(new Error("fail"), "", "some stderr");
      return undefined as any;
    });

    await expect(claudeCodeAdapter.runPrompt!("test")).rejects.toThrow(
      "Claude Code prompt failed"
    );
  });

  it("getSpawnConfig() writes system prompt to a temp file", async () => {
    const { readFile } = await import("node:fs/promises");

    const ctx: LaunchContext = {
      agent: {
        version: 1,
        id: "test",
        seed: "abc",
        name: "Test",
        description: "",
        runtime: "claude-code",
        createdAt: "",
        lastUsed: "",
        launchCount: 0,
        model: "sonnet",
        memoryBudget: { agentMemoryChars: 8000, projectMemoryChars: 8000 },
      },
      systemPrompt: "You are a test agent with special chars: $HOME & 'quotes'",
      agentDir: "/tmp/agent",
      projectDir: "/tmp/project",
    };

    const config = await claudeCodeAdapter.getSpawnConfig!(ctx);

    // Should NOT contain the raw system prompt as an arg
    expect(config.args).not.toContain(ctx.systemPrompt);
    // Should use --system-prompt-file pointing to a temp file
    const fileArgIndex = config.args.indexOf("--system-prompt-file");
    expect(fileArgIndex).toBeGreaterThanOrEqual(0);
    const filePath = config.args[fileArgIndex + 1]!;
    expect(filePath).toContain("tomomo-");
    // File should contain the system prompt
    const written = await readFile(filePath, "utf-8");
    expect(written).toBe(ctx.systemPrompt);
    // Cleanup should remove the file
    config.cleanup?.();
  });
});
