import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

let testDir: string;

vi.mock("../paths", () => ({
  getTomomoDir: () => testDir,
  getConfigPath: () => join(testDir, "config.json"),
}));

describe("config", () => {
  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "tomomo-config-"));
    vi.resetModules();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("returns default config when no config file exists", async () => {
    const { loadConfig } = await import("./config");
    const config = await loadConfig();
    expect(config.version).toBe(1);
    expect(config.defaults.runtime).toBe("claude-code");
    expect(config.onboardingComplete).toBe(false);
    expect(config.adapters).toEqual({});
  });

  it("saves and loads config", async () => {
    const { loadConfig, saveConfig } = await import("./config");
    const config = await loadConfig();
    config.onboardingComplete = true;
    await saveConfig(config);

    const loaded = await loadConfig();
    expect(loaded.onboardingComplete).toBe(true);
  });

  it("merges adapters from disk with defaults", async () => {
    const { loadConfig, saveConfig } = await import("./config");
    const config = await loadConfig();
    config.adapters["gemini"] = { package: "tomomo-adapter-gemini" };
    await saveConfig(config);

    const loaded = await loadConfig();
    expect(loaded.adapters["gemini"]).toEqual({
      package: "tomomo-adapter-gemini",
    });
  });

  it("migrates introComplete to true for existing users who completed onboarding", async () => {
    await writeFile(
      join(testDir, "config.json"),
      JSON.stringify({
        version: 1,
        defaults: {
          runtime: "claude-code",
          model: "sonnet",
          memoryBudget: { agentMemoryChars: 8000, projectMemoryChars: 8000 },
          compactionThresholdBytes: 51200,
        },
        adapters: {},
        onboardingComplete: true,
        // introComplete intentionally missing
        logLevel: "info",
      })
    );
    const { loadConfig } = await import("./config");
    const config = await loadConfig();
    expect(config.introComplete).toBe(true);
  });

  it("migrates introComplete to false for users who never completed onboarding", async () => {
    await writeFile(
      join(testDir, "config.json"),
      JSON.stringify({
        version: 1,
        defaults: {
          runtime: "claude-code",
          model: "sonnet",
          memoryBudget: { agentMemoryChars: 8000, projectMemoryChars: 8000 },
          compactionThresholdBytes: 51200,
        },
        adapters: {},
        onboardingComplete: false,
        // introComplete intentionally missing
        logLevel: "info",
      })
    );
    const { loadConfig } = await import("./config");
    const config = await loadConfig();
    expect(config.introComplete).toBe(false);
  });

  it("preserves introComplete when already present in config", async () => {
    await writeFile(
      join(testDir, "config.json"),
      JSON.stringify({
        version: 1,
        defaults: {
          runtime: "claude-code",
          model: "sonnet",
          memoryBudget: { agentMemoryChars: 8000, projectMemoryChars: 8000 },
          compactionThresholdBytes: 51200,
        },
        adapters: {},
        onboardingComplete: true,
        introComplete: false,
        logLevel: "info",
      })
    );
    const { loadConfig } = await import("./config");
    const config = await loadConfig();
    expect(config.introComplete).toBe(false);
  });
});
