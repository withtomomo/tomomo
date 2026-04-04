import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

let testDir: string;

vi.mock("../paths", () => ({
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
  getProjectDir: (agentId: string, hash: string) =>
    join(testDir, "agents", agentId, "projects", hash),
  getProjectInfoPath: (agentId: string, hash: string) =>
    join(testDir, "agents", agentId, "projects", hash, "project.json"),
  getProjectMemoryPath: (agentId: string, hash: string) =>
    join(testDir, "agents", agentId, "projects", hash, "memory.md"),
}));

vi.mock("../mcp/mcp-config", () => ({
  ensureAgentGitignore: vi.fn().mockResolvedValue(undefined),
}));

describe("agent", () => {
  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "tomomo-agent-"));
    vi.resetModules();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("creates agent with defaults", async () => {
    const { createAgent, loadAgent } = await import("./agent");
    const config = await createAgent("my-agent", "My Agent");
    expect(config.id).toBe("my-agent");
    expect(config.name).toBe("My Agent");
    expect(config.version).toBe(1);
    expect(config.seed).toBeDefined();
    expect(typeof config.seed).toBe("string");
    expect(config.seed.length).toBeGreaterThan(0);
    expect(config.launchCount).toBe(0);
    expect(config.runtime).toBe("claude-code");
    expect(config.createdAt).toBeTruthy();
    expect(config.lastUsed).toBeTruthy();
    const loaded = await loadAgent("my-agent");
    expect(loaded?.id).toBe("my-agent");
  });

  it("creates agent with options", async () => {
    const { createAgent } = await import("./agent");
    const config = await createAgent("custom-agent", "Custom Agent", {
      description: "A custom agent",
      runtime: "custom-runtime",
    });
    expect(config.description).toBe("A custom agent");
    expect(config.runtime).toBe("custom-runtime");
  });

  it("throws when creating duplicate agent", async () => {
    const { createAgent } = await import("./agent");
    await createAgent("dup-agent", "Dup Agent");
    await expect(createAgent("dup-agent", "Dup Agent 2")).rejects.toThrow(
      'Agent "dup-agent" already exists'
    );
  });

  it("lists agents", async () => {
    const { createAgent, listAgents } = await import("./agent");
    await createAgent("agent-a", "Agent A");
    await createAgent("agent-b", "Agent B");
    const agents = await listAgents();
    expect(agents).toHaveLength(2);
    const ids = agents.map((a) => a.id).sort();
    expect(ids).toEqual(["agent-a", "agent-b"]);
  });

  it("lists empty when no agents exist", async () => {
    const { listAgents } = await import("./agent");
    const agents = await listAgents();
    expect(agents).toEqual([]);
  });

  it("loads an agent", async () => {
    const { createAgent, loadAgent } = await import("./agent");
    await createAgent("load-test", "Load Test");
    const config = await loadAgent("load-test");
    expect(config?.id).toBe("load-test");
    expect(config?.name).toBe("Load Test");
  });

  it("returns null when loading missing agent", async () => {
    const { loadAgent } = await import("./agent");
    const result = await loadAgent("does-not-exist");
    expect(result).toBeNull();
  });

  it("saves agent", async () => {
    const { createAgent, loadAgent, saveAgent } = await import("./agent");
    const config = await createAgent("save-test", "Save Test");
    config.launchCount = 5;
    await saveAgent(config);
    const loaded = await loadAgent("save-test");
    expect(loaded?.launchCount).toBe(5);
  });

  it("deletes agent", async () => {
    const { createAgent, deleteAgent, agentExists } = await import("./agent");
    await createAgent("del-agent", "Del Agent");
    await deleteAgent("del-agent");
    const exists = await agentExists("del-agent");
    expect(exists).toBe(false);
  });

  it("throws when deleting missing agent", async () => {
    const { deleteAgent } = await import("./agent");
    await expect(deleteAgent("ghost-agent")).rejects.toThrow(
      'Agent "ghost-agent" not found'
    );
  });

  it("clones agent without project memories", async () => {
    const { createAgent, cloneAgent, loadAgent } = await import("./agent");
    const { ensureDir, writeJsonFile } = await import("../utils/files");
    // Create source agent with a fake project entry
    await createAgent("src-agent", "Source Agent");
    const projectDir = join(
      testDir,
      "agents",
      "src-agent",
      "projects",
      "abc123"
    );
    await ensureDir(projectDir);
    await writeJsonFile(join(projectDir, "project.json"), {
      path: "/some/path",
    });

    const cloned = await cloneAgent("src-agent", "dst-agent", "Dest Agent");
    expect(cloned.id).toBe("dst-agent");
    expect(cloned.name).toBe("Dest Agent");
    expect(cloned.launchCount).toBe(0);

    // The original projects should NOT be in the clone
    const { fileExists } = await import("../utils/files");
    const projectCopied = await fileExists(
      join(testDir, "agents", "dst-agent", "projects", "abc123")
    );
    expect(projectCopied).toBe(false);

    // But the projects directory itself should exist (empty)
    const projectsDirExists = await fileExists(
      join(testDir, "agents", "dst-agent", "projects")
    );
    expect(projectsDirExists).toBe(true);

    const loaded = await loadAgent("dst-agent");
    expect(loaded?.id).toBe("dst-agent");
  });

  it("logs a warning when agent.json is invalid", async () => {
    const { writeJsonFile, ensureDir } = await import("../utils/files");
    const { loadAgent } = await import("./agent");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await ensureDir(join(testDir, "agents", "broken"));
    await writeJsonFile(join(testDir, "agents", "broken", "agent.json"), {
      id: "broken",
      name: "Broken",
      // Missing version and runtime - will fail isValidAgentConfig
    });

    const result = await loadAgent("broken");
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("broken"));
    warnSpy.mockRestore();
  });

  it("slugifies name correctly", async () => {
    const { slugifyName } = await import("./agent");
    expect(slugifyName("WebDev")).toBe("web-dev");
    expect(slugifyName("web dev")).toBe("web-dev");
    expect(slugifyName("web_dev")).toBe("web-dev");
    expect(slugifyName("MyAgentName")).toBe("my-agent-name");
    expect(slugifyName("already-slugified")).toBe("already-slugified");
    expect(slugifyName("My Agent!")).toBe("my-agent");
    expect(slugifyName("Agent @home")).toBe("agent-home");
    expect(slugifyName("Test#123")).toBe("test123");
  });
});
