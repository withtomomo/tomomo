import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

let testDir: string;

vi.mock("../paths", () => ({
  getConfigPath: () => join(testDir, "config.json"),
  getAdaptersDir: () => join(testDir, "adapters"),
}));

describe("adapter-loader", () => {
  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "tomomo-adapter-loader-"));
    vi.resetModules();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("returns the claude-code built-in adapter", async () => {
    const { getAdapter } = await import("./loader");
    const adapter = await getAdapter("claude-code");
    expect(adapter).not.toBeNull();
    expect(adapter?.name).toBe("claude-code");
  });

  it("returns the codex built-in adapter", async () => {
    const { getAdapter } = await import("./loader");
    const adapter = await getAdapter("codex");
    expect(adapter).not.toBeNull();
    expect(adapter?.name).toBe("codex");
  });

  it("returns null for an unknown runtime with no config or local file", async () => {
    const { getAdapter } = await import("./loader");
    const adapter = await getAdapter("nonexistent-runtime-xyz");
    expect(adapter).toBeNull();
  });

  it("listBuiltInAdapters returns all built-in adapters", async () => {
    const { listBuiltInAdapters } = await import("./loader");
    const names = listBuiltInAdapters();
    expect(names).toContain("claude-code");
    expect(names).toContain("codex");
    expect(names).toContain("gemini-cli");
  });

  it("isValidAdapter rejects non-objects", async () => {
    const { isValidAdapter } = await import("./loader");
    expect(isValidAdapter(null)).toBe(false);
    expect(isValidAdapter("string")).toBe(false);
    expect(isValidAdapter(42)).toBe(false);
  });

  it("isValidAdapter rejects objects missing required fields", async () => {
    const { isValidAdapter } = await import("./loader");
    expect(isValidAdapter({ name: "x" })).toBe(false);
    expect(isValidAdapter({ name: "x", check: () => undefined })).toBe(false);
  });

  it("isValidAdapter accepts a well-formed adapter", async () => {
    const { isValidAdapter } = await import("./loader");
    const fakeAdapter = {
      name: "fake",
      install: {
        command: "npm install fake",
        description: "Fake",
        url: "https://fake.com",
      },
      check: async () => ({ available: true }),
      getSpawnConfig: async () => ({ command: "fake", args: [] }),
      launch: async () => ({
        process: {} as import("node:child_process").ChildProcess,
        onExit: (_cb: (code: number | null) => void) => undefined,
      }),
    };
    expect(isValidAdapter(fakeAdapter)).toBe(true);
  });

  it("rejects adapter without install field", async () => {
    const { isValidAdapter } = await import("./loader");
    expect(
      isValidAdapter({ name: "test", check: vi.fn(), launch: vi.fn() })
    ).toBe(false);
  });

  it("rejects adapter with empty install command", async () => {
    const { isValidAdapter } = await import("./loader");
    const adapter = {
      name: "test",
      check: vi.fn(),
      launch: vi.fn(),
      install: { command: "", description: "Test", url: "https://test.com" },
    };
    expect(isValidAdapter(adapter)).toBe(false);
  });

  it("accepts adapter with valid install", async () => {
    const { isValidAdapter } = await import("./loader");
    const adapter = {
      name: "test",
      check: vi.fn(),
      getSpawnConfig: vi.fn(),
      launch: vi.fn(),
      install: {
        command: "npm install test",
        description: "Test",
        url: "https://test.com",
      },
    };
    expect(isValidAdapter(adapter)).toBe(true);
  });

  it("isValidAdapter accepts adapter without getSpawnConfig", async () => {
    const { isValidAdapter } = await import("./loader");
    const adapter = {
      name: "minimal",
      check: vi.fn(),
      launch: vi.fn(),
      install: {
        command: "npm install minimal",
        description: "Minimal",
        url: "https://minimal.com",
      },
    };
    expect(isValidAdapter(adapter)).toBe(true);
  });

  it("loads a local adapter from ~/.tomomo/adapters/<runtime>/index.js", async () => {
    // Write a minimal valid adapter as a local file
    const adapterDir = join(testDir, "adapters", "local-test");
    await mkdir(adapterDir, { recursive: true });
    const adapterCode = [
      "export default {",
      "  name: 'local-test',",
      "  install: { command: 'npm install local-test', description: 'Local Test', url: 'https://local-test.com' },",
      "  check: async () => ({ available: true }),",
      "  getSpawnConfig: async () => ({ command: 'local-test', args: [] }),",
      "  launch: async () => ({ process: {}, onExit: () => undefined }),",
      "};",
    ].join("\n");
    await writeFile(join(adapterDir, "index.js"), adapterCode, "utf-8");

    const { getAdapter } = await import("./loader");
    const adapter = await getAdapter("local-test");
    expect(adapter).not.toBeNull();
    expect(adapter?.name).toBe("local-test");
  });
});
