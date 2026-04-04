import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LaunchContext } from "../types";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
  spawn: vi.fn(),
}));

import { codexAdapter } from "./codex";
import { execFile, spawn } from "node:child_process";

const mockedExecFile = vi.mocked(execFile);
const mockedSpawn = vi.mocked(spawn);

describe("codex adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has name set to codex", () => {
    expect(codexAdapter.name).toBe("codex");
  });

  it("has install info", () => {
    expect(codexAdapter.install).toBeDefined();
    expect(codexAdapter.install.command).toBe("npm install -g @openai/codex");
    expect(codexAdapter.install.description).toBe("Codex by OpenAI");
    expect(codexAdapter.install.url).toContain("openai");
  });

  it("check() returns available: true when codex --version succeeds", async () => {
    mockedExecFile.mockImplementation((_cmd, _args, callback) => {
      (callback as Function)(null, "1.0.0", "");
      return undefined as any;
    });

    const result = await codexAdapter.check();
    expect(result).toEqual({ available: true });
    expect(mockedExecFile).toHaveBeenCalledWith(
      "codex",
      ["--version"],
      expect.any(Function)
    );
  });

  it("check() returns available: false with error when codex --version fails", async () => {
    mockedExecFile.mockImplementation((_cmd, _args, callback) => {
      (callback as Function)(new Error("not found"), "", "");
      return undefined as any;
    });

    const result = await codexAdapter.check();
    expect(result.available).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("not installed");
  });

  it("does NOT have runPrompt method", () => {
    expect(codexAdapter.runPrompt).toBeUndefined();
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
        runtime: "codex",
        createdAt: "",
        lastUsed: "",
        launchCount: 0,
        model: "o3",
        memoryBudget: { agentMemoryChars: 8000, projectMemoryChars: 8000 },
      },
      systemPrompt: "You are a test agent",
      agentDir: "/tmp/agent",
      projectDir: "/tmp/project",
    };

    const config = await codexAdapter.getSpawnConfig!(ctx);

    expect(config.args).not.toContain(ctx.systemPrompt);
    const fileArgIndex = config.args.indexOf("--system-prompt-file");
    expect(fileArgIndex).toBeGreaterThanOrEqual(0);
    const filePath = config.args[fileArgIndex + 1]!;
    const written = await readFile(filePath, "utf-8");
    expect(written).toBe(ctx.systemPrompt);
    config.cleanup?.();
  });

  it("launch() warns on resume attempt", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Create a fake process with an on method
    const fakeProc = {
      on: vi.fn(),
      stdin: null,
      stdout: null,
      stderr: null,
    };
    mockedSpawn.mockReturnValue(fakeProc as any);

    await codexAdapter.launch({
      agent: {
        version: 1,
        id: "test",
        name: "Test",
        description: "",
        runtime: "codex",
        createdAt: "",
        lastUsed: "",
        launchCount: 0,
        seed: "abc",
        memoryBudget: { agentMemoryChars: 8000, projectMemoryChars: 8000 },
      },
      systemPrompt: "test prompt",
      agentDir: "/tmp/agent",
      projectDir: "/tmp/project",
      resumeSessionId: "session-123",
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("does not support session resume")
    );
    warnSpy.mockRestore();
  });
});
