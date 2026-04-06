import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

vi.mock("node:readline", () => ({
  createInterface: vi.fn(() => ({
    question: vi.fn((_prompt: string, cb: (answer: string) => void) => cb("y")),
    close: vi.fn(),
  })),
}));

import { tryInstallRuntime } from "./runtime-install";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { TomomoAdapter } from "../types";

function makeMockAdapter(overrides?: Partial<TomomoAdapter>): TomomoAdapter {
  return {
    name: "test-runtime",
    install: {
      command: "npm install -g test-runtime",
      description: "Test Runtime",
      url: "https://test-runtime.dev",
    },
    check: vi.fn().mockResolvedValue({ available: true }),
    launch: vi.fn(),
    ...overrides,
  };
}

function mockSpawnSuccess(): void {
  vi.mocked(spawn).mockImplementation(() => {
    const emitter = new EventEmitter();
    setTimeout(() => emitter.emit("close", 0), 0);
    return emitter as any;
  });
}

function mockSpawnFailure(code: number = 1): void {
  vi.mocked(spawn).mockImplementation(() => {
    const emitter = new EventEmitter();
    setTimeout(() => emitter.emit("close", code), 0);
    return emitter as any;
  });
}

describe("tryInstallRuntime (trusted / built-in)", () => {
  const originalIsTTY = process.stdin.isTTY;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      writable: true,
    });
    vi.mocked(createInterface).mockReturnValue({
      question: vi.fn((_prompt: string, cb: (answer: string) => void) =>
        cb("y")
      ),
      close: vi.fn(),
    } as any);
  });

  afterEach(() => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: originalIsTTY,
      writable: true,
    });
  });

  it("auto-installs when trusted and user confirms", async () => {
    mockSpawnSuccess();

    const adapter = makeMockAdapter();
    const result = await tryInstallRuntime(adapter, true);
    expect(result).toBe(true);
    expect(vi.mocked(spawn)).toHaveBeenCalledWith(
      "npm",
      ["install", "-g", "test-runtime"],
      { stdio: "inherit" }
    );
  });

  it("returns false when user declines", async () => {
    vi.mocked(createInterface).mockReturnValue({
      question: vi.fn((_prompt: string, cb: (answer: string) => void) =>
        cb("n")
      ),
      close: vi.fn(),
    } as any);

    const result = await tryInstallRuntime(makeMockAdapter(), true);
    expect(result).toBe(false);
  });

  it("returns false when install command fails", async () => {
    mockSpawnFailure();

    const result = await tryInstallRuntime(makeMockAdapter(), true);
    expect(result).toBe(false);
  });

  it("returns false when check fails after install", async () => {
    mockSpawnSuccess();

    const adapter = makeMockAdapter({
      check: vi
        .fn()
        .mockResolvedValue({ available: false, error: "not found" }),
    });
    const result = await tryInstallRuntime(adapter, true);
    expect(result).toBe(false);
  });

  it("splits command into executable and args", async () => {
    mockSpawnSuccess();

    const adapter = makeMockAdapter({
      install: {
        command: "pip install aider-chat",
        description: "Aider",
        url: "https://aider.chat",
      },
    });
    await tryInstallRuntime(adapter, true);
    expect(vi.mocked(spawn)).toHaveBeenCalledWith(
      "pip",
      ["install", "aider-chat"],
      { stdio: "inherit" }
    );
  });
});

describe("tryInstallRuntime (untrusted / community)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows install instructions without executing", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const adapter = makeMockAdapter();
    const result = await tryInstallRuntime(adapter, false);

    expect(result).toBe(false);
    expect(vi.mocked(spawn)).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("npm install -g test-runtime")
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("https://test-runtime.dev")
    );

    logSpy.mockRestore();
  });

  it("does not prompt for confirmation", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});

    await tryInstallRuntime(makeMockAdapter(), false);

    expect(vi.mocked(createInterface)).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});
