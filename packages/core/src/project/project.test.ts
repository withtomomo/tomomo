import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

let testDir: string;

vi.mock("../paths", () => ({
  getProjectDir: (agentId: string, hash: string) =>
    join(testDir, "agents", agentId, "projects", hash),
  getProjectInfoPath: (agentId: string, hash: string) =>
    join(testDir, "agents", agentId, "projects", hash, "project.json"),
  getProjectMemoryPath: (agentId: string, hash: string) =>
    join(testDir, "agents", agentId, "projects", hash, "memory.md"),
}));

describe("project", () => {
  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "tomomo-project-"));
    vi.resetModules();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("resolveProjectHash returns a 12-character hex string", async () => {
    const { resolveProjectHash } = await import("./project");
    const hash = await resolveProjectHash("/tmp");
    expect(hash).toMatch(/^[0-9a-f]{12}$/);
  });

  it("resolveProjectHash is deterministic for the same path", async () => {
    const { resolveProjectHash } = await import("./project");
    const hash1 = await resolveProjectHash("/tmp");
    const hash2 = await resolveProjectHash("/tmp");
    expect(hash1).toBe(hash2);
  });

  it("different paths produce different hashes", async () => {
    const { resolveProjectHash } = await import("./project");
    const hashA = await resolveProjectHash("/tmp/path-a-unique-12345");
    const hashB = await resolveProjectHash("/tmp/path-b-unique-67890");
    expect(hashA).not.toBe(hashB);
  });

  it("ensureProject creates directory with project.json", async () => {
    const { ensureProject } = await import("./project");
    const { fileExists, readJsonFile } = await import("../utils/files");

    const hash = await ensureProject("test-agent", "/tmp");
    expect(hash).toMatch(/^[0-9a-f]{12}$/);

    const projectDir = join(testDir, "agents", "test-agent", "projects", hash);
    expect(await fileExists(projectDir)).toBe(true);

    const info = await readJsonFile<{ path: string }>(
      join(projectDir, "project.json")
    );
    expect(info?.path).toBe("/tmp");

    const memoryExists = await fileExists(join(projectDir, "memory.md"));
    expect(memoryExists).toBe(true);
  });

  it("ensureProject is idempotent (does not throw on second call)", async () => {
    const { ensureProject } = await import("./project");
    const hash1 = await ensureProject("test-agent", "/tmp");
    const hash2 = await ensureProject("test-agent", "/tmp");
    expect(hash1).toBe(hash2);
  });

  it("ensureProject updates path when local checkout moves", async () => {
    vi.doMock("../utils/git", () => ({
      getGitRemoteUrl: vi
        .fn()
        .mockResolvedValue("https://github.com/test/repo"),
    }));

    const { ensureProject } = await import("./project");
    const { readJsonFile } = await import("../utils/files");

    const hash = await ensureProject("test-agent", "/old/path");
    await ensureProject("test-agent", "/new/path");

    const infoPath = join(
      testDir,
      "agents",
      "test-agent",
      "projects",
      hash,
      "project.json"
    );
    const info = await readJsonFile<{ path: string }>(infoPath);
    expect(info?.path).toBe("/new/path");

    vi.doUnmock("../utils/git");
  });
});
