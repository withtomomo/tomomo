import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TomomoAdapter, LaunchContext, SpawnConfig } from "../types";

// Mock child_process before importing
vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

import { launchFromConfig } from "./shared";
import { spawn } from "node:child_process";

const mockedSpawn = vi.mocked(spawn);

function makeCtx(overrides?: Partial<LaunchContext>): LaunchContext {
  return {
    agent: {
      version: 1,
      id: "test",
      seed: "abc",
      name: "Test",
      description: "",
      runtime: "test-adapter",
      createdAt: "",
      lastUsed: "",
      launchCount: 0,
      memoryBudget: { agentMemoryChars: 8000, projectMemoryChars: 8000 },
    },
    systemPrompt: "test prompt",
    agentDir: "/tmp/agent",
    projectDir: "/tmp/project",
    ...overrides,
  };
}

describe("launchFromConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if adapter has no getSpawnConfig", async () => {
    const adapter: TomomoAdapter = {
      name: "no-spawn",
      install: {
        command: "npm i -g no-spawn",
        description: "No Spawn",
        url: "http://example.com",
      },
      async check() {
        return { available: true };
      },
      async launch() {
        return undefined as any;
      },
    };

    await expect(launchFromConfig(adapter, makeCtx())).rejects.toThrow(
      "does not implement getSpawnConfig"
    );
  });

  it("spawns a process using config from getSpawnConfig", async () => {
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

    const cleanupFn = vi.fn();
    const adapter: TomomoAdapter = {
      name: "test-adapter",
      install: {
        command: "npm i -g test",
        description: "Test",
        url: "http://example.com",
      },
      async check() {
        return { available: true };
      },
      async launch(ctx) {
        return launchFromConfig(this, ctx);
      },
      async getSpawnConfig(): Promise<SpawnConfig> {
        return {
          command: "test-cmd",
          args: ["--flag", "value"],
          env: { CUSTOM: "var" },
          cleanup: cleanupFn,
        };
      },
    };

    const result = await launchFromConfig(adapter, makeCtx());
    expect(result.process).toBe(fakeProc);
    expect(mockedSpawn).toHaveBeenCalledWith(
      "test-cmd",
      ["--flag", "value"],
      expect.objectContaining({
        stdio: "inherit",
        cwd: "/tmp/project",
        env: expect.objectContaining({ CUSTOM: "var" }),
      })
    );

    // Verify cleanup is called on exit
    const callback = vi.fn();
    result.onExit(callback);
    exitHandler!(0);
    expect(callback).toHaveBeenCalledWith(0);
    expect(cleanupFn).toHaveBeenCalledTimes(1);
  });

  it("uses config.cwd when provided", async () => {
    const fakeProc = {
      on: vi.fn(),
      stdin: null,
      stdout: null,
      stderr: null,
    };
    mockedSpawn.mockReturnValue(fakeProc as any);

    const adapter: TomomoAdapter = {
      name: "test-adapter",
      install: {
        command: "npm i -g test",
        description: "Test",
        url: "http://example.com",
      },
      async check() {
        return { available: true };
      },
      async launch(ctx) {
        return launchFromConfig(this, ctx);
      },
      async getSpawnConfig(): Promise<SpawnConfig> {
        return {
          command: "test-cmd",
          args: [],
          cwd: "/custom/cwd",
        };
      },
    };

    await launchFromConfig(adapter, makeCtx());
    expect(mockedSpawn).toHaveBeenCalledWith(
      "test-cmd",
      [],
      expect.objectContaining({ cwd: "/custom/cwd" })
    );
  });

  it("cleanup is only called once even if exit fires multiple times", async () => {
    let exitHandler: ((code: number | null) => void) | undefined;
    let errorHandler: (() => void) | undefined;
    const fakeProc = {
      on: vi.fn((event: string, handler: any) => {
        if (event === "exit") exitHandler = handler;
        if (event === "error") errorHandler = handler;
      }),
      stdin: null,
      stdout: null,
      stderr: null,
    };
    mockedSpawn.mockReturnValue(fakeProc as any);

    const cleanupFn = vi.fn();
    const adapter: TomomoAdapter = {
      name: "test-adapter",
      install: {
        command: "npm i -g test",
        description: "Test",
        url: "http://example.com",
      },
      async check() {
        return { available: true };
      },
      async launch(ctx) {
        return launchFromConfig(this, ctx);
      },
      async getSpawnConfig(): Promise<SpawnConfig> {
        return { command: "cmd", args: [], cleanup: cleanupFn };
      },
    };

    const result = await launchFromConfig(adapter, makeCtx());
    const callback = vi.fn();
    result.onExit(callback);

    exitHandler!(0);
    errorHandler!();

    // Both callback and cleanup should only be called once
    expect(callback).toHaveBeenCalledTimes(1);
    expect(cleanupFn).toHaveBeenCalledTimes(1);
  });

  it("onExit handles error event with null code", async () => {
    let errorHandler: (() => void) | undefined;
    const fakeProc = {
      on: vi.fn((event: string, handler: any) => {
        if (event === "error") errorHandler = handler;
      }),
      stdin: null,
      stdout: null,
      stderr: null,
    };
    mockedSpawn.mockReturnValue(fakeProc as any);

    const adapter: TomomoAdapter = {
      name: "test-adapter",
      install: {
        command: "npm i -g test",
        description: "Test",
        url: "http://example.com",
      },
      async check() {
        return { available: true };
      },
      async launch(ctx) {
        return launchFromConfig(this, ctx);
      },
      async getSpawnConfig(): Promise<SpawnConfig> {
        return { command: "cmd", args: [] };
      },
    };

    const result = await launchFromConfig(adapter, makeCtx());
    const callback = vi.fn();
    result.onExit(callback);

    errorHandler!();
    expect(callback).toHaveBeenCalledWith(null);
  });
});
