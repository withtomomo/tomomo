import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LaunchContext } from "../types";

// Mock child_process before importing the adapter
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
  spawn: vi.fn(),
}));

import { geminiCliAdapter } from "./gemini-cli";
import { execFile, spawn } from "node:child_process";

const mockedExecFile = vi.mocked(execFile);
const mockedSpawn = vi.mocked(spawn);

describe("gemini-cli adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has name set to gemini-cli", () => {
    expect(geminiCliAdapter.name).toBe("gemini-cli");
  });

  it("has install info", () => {
    expect(geminiCliAdapter.install).toBeDefined();
    expect(geminiCliAdapter.install.command).toBe(
      "npm install -g @google/gemini-cli"
    );
    expect(geminiCliAdapter.install.description).toBe("Gemini CLI by Google");
    expect(geminiCliAdapter.install.url).toContain("gemini");
  });

  it("check() returns available: true when gemini --version succeeds", async () => {
    mockedExecFile.mockImplementation((_cmd, _args, callback) => {
      (callback as Function)(null, "1.0.0", "");
      return undefined as any;
    });

    const result = await geminiCliAdapter.check();
    expect(result).toEqual({ available: true });
    expect(mockedExecFile).toHaveBeenCalledWith(
      "gemini",
      ["--version"],
      expect.any(Function)
    );
  });

  it("check() returns available: false when gemini --version fails", async () => {
    mockedExecFile.mockImplementation((_cmd, _args, callback) => {
      (callback as Function)(new Error("not found"), "", "");
      return undefined as any;
    });

    const result = await geminiCliAdapter.check();
    expect(result.available).toBe(false);
    expect(result.error).toContain("not installed");
  });

  it("runPrompt() calls execFile with -p and the prompt", async () => {
    mockedExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      (callback as Function)(null, { stdout: "response text", stderr: "" });
      return undefined as any;
    });

    const result = await geminiCliAdapter.runPrompt!("hello world");
    expect(result).toBe("response text");
    expect(mockedExecFile).toHaveBeenCalledWith(
      "gemini",
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

    await geminiCliAdapter.runPrompt!("test", { model: "gemini-pro" });
    expect(mockedExecFile).toHaveBeenCalledWith(
      "gemini",
      ["-p", "test", "--model", "gemini-pro"],
      expect.any(Object),
      expect.any(Function)
    );
  });

  it("runPrompt() rejects when execFile returns an error", async () => {
    mockedExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      (callback as Function)(new Error("fail"), "", "some stderr");
      return undefined as any;
    });

    await expect(geminiCliAdapter.runPrompt!("test")).rejects.toThrow(
      "Gemini CLI prompt failed"
    );
  });

  it("launch() spawns gemini with correct args and env", async () => {
    const fakeProc = {
      on: vi.fn(),
      stdin: null,
      stdout: null,
      stderr: null,
    };
    mockedSpawn.mockReturnValue(fakeProc as any);

    const ctx: LaunchContext = {
      agent: {
        version: 1,
        id: "test",
        seed: "abc",
        name: "Test",
        description: "",
        runtime: "gemini-cli",
        createdAt: "",
        lastUsed: "",
        launchCount: 0,
        model: "gemini-pro",
        memoryBudget: { agentMemoryChars: 8000, projectMemoryChars: 8000 },
      },
      systemPrompt: "You are a test agent",
      agentDir: "/tmp/agent",
      projectDir: "/tmp/project",
    };

    const result = await geminiCliAdapter.launch(ctx);
    expect(result.process).toBe(fakeProc);

    // Should spawn gemini with --model
    expect(mockedSpawn).toHaveBeenCalledWith(
      "gemini",
      expect.arrayContaining(["--model", "gemini-pro"]),
      expect.objectContaining({
        stdio: "inherit",
        cwd: "/tmp/project",
        env: expect.objectContaining({
          GEMINI_SYSTEM_MD: expect.stringContaining("tomomo-gemini"),
        }),
      })
    );
  });

  it("launch() passes --yolo when skipPermissions is true", async () => {
    const fakeProc = {
      on: vi.fn(),
      stdin: null,
      stdout: null,
      stderr: null,
    };
    mockedSpawn.mockReturnValue(fakeProc as any);

    const ctx: LaunchContext = {
      agent: {
        version: 1,
        id: "test",
        seed: "abc",
        name: "Test",
        description: "",
        runtime: "gemini-cli",
        createdAt: "",
        lastUsed: "",
        launchCount: 0,
        memoryBudget: { agentMemoryChars: 8000, projectMemoryChars: 8000 },
      },
      systemPrompt: "test",
      agentDir: "/tmp/agent",
      projectDir: "/tmp/project",
      skipPermissions: true,
    };

    await geminiCliAdapter.launch(ctx);
    const spawnArgs = mockedSpawn.mock.calls[0]![1] as string[];
    expect(spawnArgs).toContain("--yolo");
  });

  it("launch() passes --resume when resumeSessionId is set", async () => {
    const fakeProc = {
      on: vi.fn(),
      stdin: null,
      stdout: null,
      stderr: null,
    };
    mockedSpawn.mockReturnValue(fakeProc as any);

    const ctx: LaunchContext = {
      agent: {
        version: 1,
        id: "test",
        seed: "abc",
        name: "Test",
        description: "",
        runtime: "gemini-cli",
        createdAt: "",
        lastUsed: "",
        launchCount: 0,
        memoryBudget: { agentMemoryChars: 8000, projectMemoryChars: 8000 },
      },
      systemPrompt: "test",
      agentDir: "/tmp/agent",
      projectDir: "/tmp/project",
      resumeSessionId: "session-456",
    };

    await geminiCliAdapter.launch(ctx);
    const spawnArgs = mockedSpawn.mock.calls[0]![1] as string[];
    expect(spawnArgs).toContain("--resume");
    expect(spawnArgs).toContain("session-456");
  });

  it("launch() passes --mcp-config when mcpConfigPath is set", async () => {
    const fakeProc = {
      on: vi.fn(),
      stdin: null,
      stdout: null,
      stderr: null,
    };
    mockedSpawn.mockReturnValue(fakeProc as any);

    const ctx: LaunchContext = {
      agent: {
        version: 1,
        id: "test",
        seed: "abc",
        name: "Test",
        description: "",
        runtime: "gemini-cli",
        createdAt: "",
        lastUsed: "",
        launchCount: 0,
        memoryBudget: { agentMemoryChars: 8000, projectMemoryChars: 8000 },
      },
      systemPrompt: "test",
      agentDir: "/tmp/agent",
      projectDir: "/tmp/project",
      mcpConfigPath: "/tmp/mcp.json",
    };

    await geminiCliAdapter.launch(ctx);
    const spawnArgs = mockedSpawn.mock.calls[0]![1] as string[];
    expect(spawnArgs).toContain("--mcp-config");
    expect(spawnArgs).toContain("/tmp/mcp.json");
  });

  it("launch() onExit calls cleanup and callback", async () => {
    let exitHandler: ((code: number | null) => void) | undefined;
    const fakeProc = {
      on: vi.fn((event: string, handler: any) => {
        if (event === "exit") exitHandler = handler;
      }),
      stdin: null,
      stdout: null,
      stderr: null,
    };
    mockedSpawn.mockReturnValue(fakeProc as any);

    const ctx: LaunchContext = {
      agent: {
        version: 1,
        id: "test",
        seed: "abc",
        name: "Test",
        description: "",
        runtime: "gemini-cli",
        createdAt: "",
        lastUsed: "",
        launchCount: 0,
        memoryBudget: { agentMemoryChars: 8000, projectMemoryChars: 8000 },
      },
      systemPrompt: "test",
      agentDir: "/tmp/agent",
      projectDir: "/tmp/project",
    };

    const result = await geminiCliAdapter.launch(ctx);
    const callback = vi.fn();
    result.onExit(callback);

    // Simulate process exit
    exitHandler!(0);
    expect(callback).toHaveBeenCalledWith(0);

    // Second call should be ignored (once guard)
    exitHandler!(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
