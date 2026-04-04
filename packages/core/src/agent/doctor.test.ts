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
  getAgentGitignorePath: (id: string) =>
    join(testDir, "agents", id, ".gitignore"),
}));

vi.mock("../adapters/loader", () => ({
  listBuiltInAdapters: () => ["test-runtime"],
  getAdapter: async () => ({
    name: "test-runtime",
    check: async () => ({ available: true }),
  }),
}));

describe("doctor", () => {
  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "tomomo-doctor-"));
    vi.resetModules();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("returns diagnostics for a fresh install", async () => {
    const { runDiagnostics } = await import("./doctor");
    const results = await runDiagnostics();
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.name === "Tomomo directory")).toBe(true);
    expect(results.some((r) => r.name.startsWith("Runtime:"))).toBe(true);
    expect(results.some((r) => r.name === "Agents")).toBe(true);
  });

  it("reports agent count correctly", async () => {
    const { createAgent } = await import("./agent");
    await createAgent("test-a", "TestA");
    await createAgent("test-b", "TestB");

    const { runDiagnostics } = await import("./doctor");
    const results = await runDiagnostics();
    const agentsResult = results.find((r) => r.name === "Agents");
    expect(agentsResult!.message).toContain("2 agents");
  });
});
