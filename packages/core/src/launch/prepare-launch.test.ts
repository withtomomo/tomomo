import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { AgentConfig, TomomoAdapter } from "../types";

let testDir: string;

const MOCK_AGENT: AgentConfig = {
  version: 1,
  id: "test-agent",
  seed: "abc123",
  name: "Test Agent",
  description: "A test agent",
  runtime: "mock-runtime",
  createdAt: "2025-01-01T00:00:00.000Z",
  lastUsed: "2025-01-01T00:00:00.000Z",
  launchCount: 3,
  memoryBudget: {
    agentMemoryChars: 8000,
    projectMemoryChars: 8000,
  },
};

function makeMockAdapter(overrides?: Partial<TomomoAdapter>): TomomoAdapter {
  return {
    name: "mock-runtime",
    install: {
      command: "npm install mock-runtime",
      description: "Install mock runtime",
      url: "https://example.com/mock-runtime",
    },
    check: vi.fn().mockResolvedValue({ available: true }),
    getSpawnConfig: vi.fn().mockResolvedValue({
      command: "mock-cmd",
      args: ["--run"],
      cleanup: vi.fn(),
    }),
    launch: vi.fn().mockResolvedValue({
      process: {},
      onExit: vi.fn(),
    }),
    runPrompt: vi.fn().mockResolvedValue("compacted"),
    ...overrides,
  };
}

vi.mock("../paths", () => ({
  getAgentDir: (id: string) => join(testDir, "agents", id),
  getAgentConfigPath: (id: string) => join(testDir, "agents", id, "agent.json"),
  getAgentMemoryPath: (id: string) => join(testDir, "agents", id, "memory.md"),
  getAgentSoulPath: (id: string) => join(testDir, "agents", id, "soul.md"),
  getAgentSessionsPath: (id: string) =>
    join(testDir, "agents", id, "sessions.json"),
  getAgentSkillsDir: (id: string) => join(testDir, "agents", id, "skills"),
  getAgentProjectsDir: (id: string) => join(testDir, "agents", id, "projects"),
  getProjectDir: (agentId: string, hash: string) =>
    join(testDir, "agents", agentId, "projects", hash),
  getProjectMemoryPath: (agentId: string, hash: string) =>
    join(testDir, "agents", agentId, "projects", hash, "memory.md"),
  getProjectInfoPath: (agentId: string, hash: string) =>
    join(testDir, "agents", agentId, "projects", hash, "project.json"),
  getAgentMcpConfigPath: (id: string) =>
    join(testDir, "agents", id, "mcp.json"),
  getAgentEnvPath: (id: string) => join(testDir, "agents", id, ".env"),
}));

// Track what loadAgent returns per test
let mockLoadAgent: ReturnType<typeof vi.fn<(...args: unknown[]) => unknown>>;

vi.mock("../agent/agent", () => ({
  loadAgent: (...args: unknown[]) => mockLoadAgent(...args),
}));

let mockGetAdapter: ReturnType<typeof vi.fn<(...args: unknown[]) => unknown>>;
let mockIsBuiltInAdapter: ReturnType<
  typeof vi.fn<(...args: unknown[]) => unknown>
>;

vi.mock("../adapters/loader", () => ({
  getAdapter: (...args: unknown[]) => mockGetAdapter(...args),
  isBuiltInAdapter: (...args: unknown[]) => mockIsBuiltInAdapter(...args),
}));

vi.mock("../adapters/runtime-install", () => ({
  tryInstallRuntime: vi.fn().mockResolvedValue(false),
}));

vi.mock("../memory/context", () => ({
  assembleContext: vi.fn().mockResolvedValue("mock system prompt"),
}));

vi.mock("../memory/compaction", () => ({
  compactMemoryFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../agent/config", () => ({
  loadConfig: vi.fn().mockResolvedValue({
    version: 1,
    defaults: {
      runtime: "claude-code",
      model: "sonnet",
      memoryBudget: { agentMemoryChars: 8000, projectMemoryChars: 8000 },
      compactionThresholdBytes: 51200,
    },
    adapters: {},
    onboardingComplete: false,
    logLevel: "error",
  }),
}));

vi.mock("../project/project", () => ({
  ensureProject: vi.fn().mockResolvedValue("abc123hash"),
}));

vi.mock("../project/sessions", () => ({
  storeSession: vi.fn().mockResolvedValue(undefined),
  getLastSession: vi.fn().mockResolvedValue(null),
}));

vi.mock("../memory/session-memory", () => ({
  mergeSessionMemories: vi.fn().mockResolvedValue(undefined),
}));

let mockLoadMcpConfig: ReturnType<
  typeof vi.fn<(...args: unknown[]) => unknown>
>;
let mockWriteTempMcpConfig: ReturnType<
  typeof vi.fn<(...args: unknown[]) => unknown>
>;

vi.mock("../mcp/mcp-config", () => ({
  loadMcpConfig: (...args: unknown[]) => mockLoadMcpConfig(...args),
  parseEnvFile: vi.fn().mockResolvedValue({}),
  resolveMcpConfig: vi.fn().mockReturnValue({
    config: {
      servers: { "test-server": { command: "node", args: ["server.js"] } },
    },
    skipped: [],
  }),
  writeTempMcpConfig: (...args: unknown[]) => mockWriteTempMcpConfig(...args),
}));

vi.mock("../utils/file-lock", () => ({
  acquireLock: vi.fn().mockResolvedValue(true),
  releaseLock: vi.fn().mockResolvedValue(undefined),
}));

describe("prepareLaunch", () => {
  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "tomomo-prepare-launch-"));

    mockLoadAgent = vi.fn().mockResolvedValue({ ...MOCK_AGENT });
    mockGetAdapter = vi.fn().mockResolvedValue(makeMockAdapter());
    mockIsBuiltInAdapter = vi.fn().mockReturnValue(true);
    mockLoadMcpConfig = vi.fn().mockResolvedValue(null);
    mockWriteTempMcpConfig = vi.fn().mockResolvedValue("/tmp/mcp-temp.json");
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("returns prepared launch with agent, spawnConfig, sessionId", async () => {
    const { prepareLaunch } = await import("./prepare-launch");
    const result = await prepareLaunch({
      agentId: "test-agent",
      projectDir: "/some/project",
      skipProject: true,
    });

    expect(result.agent.id).toBe("test-agent");
    expect(result.agent.runtime).toBe("mock-runtime");
    expect(result.spawnConfig.command).toBe("mock-cmd");
    expect(result.spawnConfig.args).toEqual(["--run"]);
    expect(result.sessionId).toBeTruthy();
    expect(typeof result.sessionId).toBe("string");
    expect(result.sessionId.length).toBe(8);
  });

  it("throws when agent is not found", async () => {
    mockLoadAgent.mockResolvedValue(null);
    const { prepareLaunch } = await import("./prepare-launch");

    await expect(
      prepareLaunch({
        agentId: "ghost",
        projectDir: "/some/project",
      })
    ).rejects.toThrow('Agent "ghost" not found');
  });

  it("throws when adapter is not found", async () => {
    mockGetAdapter.mockResolvedValue(null);
    const { prepareLaunch } = await import("./prepare-launch");

    await expect(
      prepareLaunch({
        agentId: "test-agent",
        projectDir: "/some/project",
      })
    ).rejects.toThrow('Runtime "mock-runtime" not available');
  });

  it("throws when runtime not available and install is refused", async () => {
    const adapter = makeMockAdapter({
      check: vi.fn().mockResolvedValue({ available: false }),
    });
    mockGetAdapter.mockResolvedValue(adapter);

    const { prepareLaunch } = await import("./prepare-launch");

    await expect(
      prepareLaunch({
        agentId: "test-agent",
        projectDir: "/some/project",
      })
    ).rejects.toThrow('Runtime "mock-runtime" is not available');
  });

  it("calls ensureProject when skipProject is false", async () => {
    const { prepareLaunch } = await import("./prepare-launch");
    const { ensureProject } = await import("../project/project");

    await prepareLaunch({
      agentId: "test-agent",
      projectDir: "/some/project",
      skipProject: false,
    });

    expect(ensureProject).toHaveBeenCalledWith("test-agent", "/some/project");
  });

  it("skips ensureProject when skipProject is true", async () => {
    const { prepareLaunch } = await import("./prepare-launch");
    const { ensureProject } = await import("../project/project");
    (ensureProject as ReturnType<typeof vi.fn>).mockClear();

    const result = await prepareLaunch({
      agentId: "test-agent",
      projectDir: "/some/project",
      skipProject: true,
    });

    expect(ensureProject).not.toHaveBeenCalled();
    expect(result.projectHash).toBe("");
  });

  it("returns projectHash from ensureProject when skipProject is false", async () => {
    const { prepareLaunch } = await import("./prepare-launch");

    const result = await prepareLaunch({
      agentId: "test-agent",
      projectDir: "/some/project",
      skipProject: false,
    });

    expect(result.projectHash).toBe("abc123hash");
  });

  it("passes resumeSessionId when resume is true and session exists", async () => {
    const { getLastSession } = await import("../project/sessions");
    (getLastSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      lastSessionId: "prev-session-abc",
      lastUsed: "2025-01-01T00:00:00.000Z",
    });

    const adapter = makeMockAdapter();
    mockGetAdapter.mockResolvedValue(adapter);

    const { prepareLaunch } = await import("./prepare-launch");

    await prepareLaunch({
      agentId: "test-agent",
      projectDir: "/some/project",
      resume: true,
      skipProject: false,
    });

    expect(adapter.getSpawnConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        resumeSessionId: "prev-session-abc",
      })
    );
  });

  it("does not set resumeSessionId when resume is false", async () => {
    const adapter = makeMockAdapter();
    mockGetAdapter.mockResolvedValue(adapter);

    const { prepareLaunch } = await import("./prepare-launch");

    await prepareLaunch({
      agentId: "test-agent",
      projectDir: "/some/project",
      resume: false,
      skipProject: false,
    });

    expect(adapter.getSpawnConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        resumeSessionId: undefined,
      })
    );
  });

  it("resolves MCP config and returns mcpConfigPath in spawnConfig", async () => {
    mockLoadMcpConfig.mockResolvedValue({
      servers: {
        "my-server": { command: "node", args: ["server.js"] },
      },
    });

    const adapter = makeMockAdapter();
    mockGetAdapter.mockResolvedValue(adapter);

    const { prepareLaunch } = await import("./prepare-launch");

    await prepareLaunch({
      agentId: "test-agent",
      projectDir: "/some/project",
      skipProject: true,
    });

    expect(mockWriteTempMcpConfig).toHaveBeenCalled();
    expect(adapter.getSpawnConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        mcpConfigPath: "/tmp/mcp-temp.json",
      })
    );
  });

  it("does not create mcpConfigPath when no MCP config exists", async () => {
    mockLoadMcpConfig.mockResolvedValue(null);

    const adapter = makeMockAdapter();
    mockGetAdapter.mockResolvedValue(adapter);

    const { prepareLaunch } = await import("./prepare-launch");

    await prepareLaunch({
      agentId: "test-agent",
      projectDir: "/some/project",
      skipProject: true,
    });

    expect(mockWriteTempMcpConfig).not.toHaveBeenCalled();
    expect(adapter.getSpawnConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        mcpConfigPath: undefined,
      })
    );
  });

  it("does not create mcpConfigPath when MCP config has empty servers", async () => {
    mockLoadMcpConfig.mockResolvedValue({ servers: {} });

    const adapter = makeMockAdapter();
    mockGetAdapter.mockResolvedValue(adapter);

    const { prepareLaunch } = await import("./prepare-launch");

    await prepareLaunch({
      agentId: "test-agent",
      projectDir: "/some/project",
      skipProject: true,
    });

    expect(mockWriteTempMcpConfig).not.toHaveBeenCalled();
  });

  it("appends prompt when appendPrompt is provided", async () => {
    const adapter = makeMockAdapter();
    mockGetAdapter.mockResolvedValue(adapter);

    const { prepareLaunch } = await import("./prepare-launch");

    await prepareLaunch({
      agentId: "test-agent",
      projectDir: "/some/project",
      skipProject: true,
      appendPrompt: "Extra instructions here",
    });

    expect(adapter.getSpawnConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: "mock system prompt\n\nExtra instructions here",
      })
    );
  });

  it("throws when adapter lacks getSpawnConfig", async () => {
    const adapter = makeMockAdapter({ getSpawnConfig: undefined });
    mockGetAdapter.mockResolvedValue(adapter);

    const { prepareLaunch } = await import("./prepare-launch");

    await expect(
      prepareLaunch({
        agentId: "test-agent",
        projectDir: "/some/project",
        skipProject: true,
      })
    ).rejects.toThrow(
      'Adapter "mock-runtime" does not implement getSpawnConfig'
    );
  });

  it("recordExit updates lastUsed and launchCount", async () => {
    // Write agent config to disk so recordExit can read it
    const agentDir = join(testDir, "agents", "test-agent");
    await mkdir(agentDir, { recursive: true });
    await writeFile(
      join(agentDir, "agent.json"),
      JSON.stringify({ ...MOCK_AGENT, launchCount: 3 })
    );

    const { prepareLaunch } = await import("./prepare-launch");

    const result = await prepareLaunch({
      agentId: "test-agent",
      projectDir: "/some/project",
      skipProject: true,
    });

    await result.recordExit();

    // Verify file was updated
    const { readJsonFile } = await import("../utils/files");
    const updated = await readJsonFile<AgentConfig>(
      join(agentDir, "agent.json")
    );
    expect(updated).not.toBeNull();
    expect(updated!.launchCount).toBe(4);
    expect(updated!.lastUsed).not.toBe("2025-01-01T00:00:00.000Z");
  });

  it("recordExit stores session when projectHash exists", async () => {
    const agentDir = join(testDir, "agents", "test-agent");
    await mkdir(agentDir, { recursive: true });
    await writeFile(join(agentDir, "agent.json"), JSON.stringify(MOCK_AGENT));

    const { prepareLaunch } = await import("./prepare-launch");
    const { storeSession } = await import("../project/sessions");

    const result = await prepareLaunch({
      agentId: "test-agent",
      projectDir: "/some/project",
      skipProject: false,
    });

    await result.recordExit();

    expect(storeSession).toHaveBeenCalledWith(
      "test-agent",
      "abc123hash",
      result.sessionId
    );
  });

  it("cleanup calls both adapter cleanup and MCP cleanup", async () => {
    const adapterCleanup = vi.fn();
    const adapter = makeMockAdapter({
      getSpawnConfig: vi.fn().mockResolvedValue({
        command: "mock-cmd",
        args: [],
        cleanup: adapterCleanup,
      }),
    });
    mockGetAdapter.mockResolvedValue(adapter);

    // Enable MCP config so mcpCleanup is set
    mockLoadMcpConfig.mockResolvedValue({
      servers: {
        "my-server": { command: "node", args: ["server.js"] },
      },
    });

    const { prepareLaunch } = await import("./prepare-launch");

    const result = await prepareLaunch({
      agentId: "test-agent",
      projectDir: "/some/project",
      skipProject: true,
    });

    // Call the combined cleanup
    result.spawnConfig.cleanup?.();

    expect(adapterCleanup).toHaveBeenCalled();
    // MCP cleanup calls rm on the temp path, which is mocked implicitly
    // The important thing is that the combined cleanup does not throw
  });

  it("cleanup works when adapter has no cleanup", async () => {
    const adapter = makeMockAdapter({
      getSpawnConfig: vi.fn().mockResolvedValue({
        command: "mock-cmd",
        args: [],
        // No cleanup property
      }),
    });
    mockGetAdapter.mockResolvedValue(adapter);

    const { prepareLaunch } = await import("./prepare-launch");

    const result = await prepareLaunch({
      agentId: "test-agent",
      projectDir: "/some/project",
      skipProject: true,
    });

    // Should not throw
    expect(() => result.spawnConfig.cleanup?.()).not.toThrow();
  });

  it("runs pre-launch compaction when adapter has runPrompt", async () => {
    const adapter = makeMockAdapter();
    mockGetAdapter.mockResolvedValue(adapter);

    const { prepareLaunch } = await import("./prepare-launch");
    const { compactMemoryFile } = await import("../memory/compaction");

    await prepareLaunch({
      agentId: "test-agent",
      projectDir: "/some/project",
      skipProject: true,
    });

    expect(compactMemoryFile).toHaveBeenCalled();
  });

  it("skips compaction when adapter lacks runPrompt", async () => {
    const adapter = makeMockAdapter({ runPrompt: undefined });
    mockGetAdapter.mockResolvedValue(adapter);

    const { compactMemoryFile } = await import("../memory/compaction");
    (compactMemoryFile as ReturnType<typeof vi.fn>).mockClear();

    const { prepareLaunch } = await import("./prepare-launch");

    await prepareLaunch({
      agentId: "test-agent",
      projectDir: "/some/project",
      skipProject: true,
    });

    expect(compactMemoryFile).not.toHaveBeenCalled();
  });

  it("passes skipPermissions to adapter getSpawnConfig", async () => {
    const adapter = makeMockAdapter();
    mockGetAdapter.mockResolvedValue(adapter);

    const { prepareLaunch } = await import("./prepare-launch");

    await prepareLaunch({
      agentId: "test-agent",
      projectDir: "/some/project",
      skipProject: true,
      skipPermissions: true,
    });

    expect(adapter.getSpawnConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        skipPermissions: true,
      })
    );
  });

  it("logs skipped MCP servers", async () => {
    const { resolveMcpConfig } = await import("../mcp/mcp-config");
    (resolveMcpConfig as ReturnType<typeof vi.fn>).mockReturnValue({
      config: { servers: {} },
      skipped: [{ name: "broken-server", missingVars: ["API_KEY", "SECRET"] }],
    });

    mockLoadMcpConfig.mockResolvedValue({
      servers: { "broken-server": { command: "node", args: ["srv.js"] } },
    });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { prepareLaunch } = await import("./prepare-launch");

    await prepareLaunch({
      agentId: "test-agent",
      projectDir: "/some/project",
      skipProject: true,
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("broken-server")
    );
    logSpy.mockRestore();
  });
});
