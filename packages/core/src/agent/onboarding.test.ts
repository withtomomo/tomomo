import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

let testDir: string;

vi.mock("../paths", () => ({
  getTomomoDir: () => testDir,
  getAgentsDir: () => join(testDir, "agents"),
  getAgentDir: (id: string) => join(testDir, "agents", id),
  getAgentConfigPath: (id: string) => join(testDir, "agents", id, "agent.json"),
  getAgentSoulPath: (id: string) => join(testDir, "agents", id, "soul.md"),
  getAgentMemoryPath: (id: string) => join(testDir, "agents", id, "memory.md"),
  getAgentSessionsPath: (id: string) =>
    join(testDir, "agents", id, "sessions.json"),
  getAgentSkillsDir: (id: string) => join(testDir, "agents", id, "skills"),
  getAgentProjectsDir: (id: string) => join(testDir, "agents", id, "projects"),
  getConfigPath: () => join(testDir, "config.json"),
  getSkillsDir: () => join(testDir, "skills"),
  getLogsDir: () => join(testDir, "logs"),
  getTmpDir: () => join(testDir, "tmp"),
  getAdaptersDir: () => join(testDir, "adapters"),
}));

const mockAdapter = {
  name: "test-runtime",
  install: {
    command: "npm install -g test-runtime",
    description: "Test Runtime",
    url: "https://test.dev",
  },
  check: async () => ({ available: true }),
  launch: async () => ({ process: null, onExit: () => {} }),
};

vi.mock("../adapters/loader", () => ({
  listBuiltInAdapters: () => ["test-runtime"],
  getAdapter: async () => mockAdapter,
}));

describe("onboarding", () => {
  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "tomomo-onboarding-"));
    vi.resetModules();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("reports not onboarded on fresh install", async () => {
    const { isOnboarded } = await import("./onboarding");
    expect(await isOnboarded()).toBe(false);
  });

  it("initializes directory structure", async () => {
    const { initializeTomomoDir } = await import("./onboarding");
    const { fileExists } = await import("../utils/files");

    await initializeTomomoDir();

    expect(await fileExists(testDir)).toBe(true);
    expect(await fileExists(join(testDir, "agents"))).toBe(true);
    expect(await fileExists(join(testDir, "skills"))).toBe(true);
    expect(await fileExists(join(testDir, "logs"))).toBe(true);
    expect(await fileExists(join(testDir, "tmp"))).toBe(true);
  });

  it("checks runtime availability", async () => {
    const { checkRuntimes } = await import("./onboarding");
    const runtimes = await checkRuntimes();

    expect(runtimes).toHaveLength(1);
    expect(runtimes[0]!.name).toBe("test-runtime");
    expect(runtimes[0]!.available).toBe(true);
    expect(runtimes[0]!.adapter).toBe(mockAdapter);
  });

  it("runs full onboarding and marks complete", async () => {
    const { runOnboarding, isOnboarded } = await import("./onboarding");

    await runOnboarding();

    expect(await isOnboarded()).toBe(true);
  });

  it("skips if already onboarded", async () => {
    const { runOnboarding, isOnboarded } = await import("./onboarding");

    await runOnboarding();
    // Second call should be a no-op
    await runOnboarding();

    expect(await isOnboarded()).toBe(true);
  });

  it("hasSeenIntro returns false by default", async () => {
    const { hasSeenIntro } = await import("./onboarding");
    expect(await hasSeenIntro()).toBe(false);
  });

  it("markIntroComplete sets the flag", async () => {
    const { hasSeenIntro, markIntroComplete } = await import("./onboarding");
    await markIntroComplete();
    expect(await hasSeenIntro()).toBe(true);
  });

  it("markIntroComplete is idempotent", async () => {
    const { hasSeenIntro, markIntroComplete } = await import("./onboarding");
    await markIntroComplete();
    await markIntroComplete();
    expect(await hasSeenIntro()).toBe(true);
  });

  it("hasSeenIntro returns true for old configs missing introComplete (migration)", async () => {
    const { writeFile, mkdir } = await import("node:fs/promises");
    const { getConfigPath } = await import("../paths");
    const { hasSeenIntro } = await import("./onboarding");

    // Simulate an upgraded user: pre-introComplete config on disk with
    // onboardingComplete already set.
    await mkdir(testDir, { recursive: true });
    await writeFile(
      getConfigPath(),
      JSON.stringify({ onboardingComplete: true })
    );

    expect(await hasSeenIntro()).toBe(true);
  });

  it("hasSeenIntro returns false for old configs that never onboarded", async () => {
    const { writeFile, mkdir } = await import("node:fs/promises");
    const { getConfigPath } = await import("../paths");
    const { hasSeenIntro } = await import("./onboarding");

    await mkdir(testDir, { recursive: true });
    await writeFile(
      getConfigPath(),
      JSON.stringify({ onboardingComplete: false })
    );

    expect(await hasSeenIntro()).toBe(false);
  });

  it("runOnboarding sets both onboardingComplete and introComplete", async () => {
    const { runOnboarding } = await import("./onboarding");
    const { loadConfig } = await import("./config");

    await runOnboarding();

    const config = await loadConfig();
    expect(config.onboardingComplete).toBe(true);
    expect(config.introComplete).toBe(true);
  });
});
