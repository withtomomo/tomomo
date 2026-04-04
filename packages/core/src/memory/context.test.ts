import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

let testDir: string;

vi.mock("../paths", () => ({
  getTomomoDir: () => testDir,
  getUserMdPath: () => join(testDir, "user.md"),
  getAgentDir: (agentId: string) => join(testDir, "agents", agentId),
  getAgentSoulPath: (agentId: string) =>
    join(testDir, "agents", agentId, "soul.md"),
  getAgentMemoryPath: (agentId: string) =>
    join(testDir, "agents", agentId, "memory.md"),
  getAgentSkillsDir: (agentId: string) =>
    join(testDir, "agents", agentId, "skills"),
  getProjectMemoryPath: (agentId: string, projectHash: string) =>
    join(testDir, "agents", agentId, "projects", projectHash, "memory.md"),
}));

async function writeTestFile(filePath: string, content: string): Promise<void> {
  await mkdir(join(filePath, ".."), { recursive: true });
  await writeFile(filePath, content, "utf-8");
}

describe("assembleContext", () => {
  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "tomomo-context-"));
    vi.resetModules();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("assembles context with all layers present", async () => {
    const { assembleContext } = await import("./context");

    const agentId = "test-agent";
    const projectHash = "abc123";

    await writeTestFile(join(testDir, "user.md"), "I prefer TypeScript.");
    await writeTestFile(
      join(testDir, "agents", agentId, "soul.md"),
      "You are a helpful assistant."
    );
    await writeTestFile(
      join(testDir, "agents", agentId, "memory.md"),
      "## Summary\n\nRemember past work.\n\n## Recent\n\n### 2024-01-01: Init\n\nSetup done."
    );
    await writeTestFile(
      join(testDir, "agents", agentId, "projects", projectHash, "memory.md"),
      "## Summary\n\nProject alpha.\n\n## Recent\n\n### 2024-01-02: Feature\n\nAdded login."
    );

    const result = await assembleContext({
      agentId,
      projectHash,
      projectPath: "/home/user/project",
      agentMemoryBudget: 10_000,
      projectMemoryBudget: 10_000,
    });

    expect(result).toContain("[Tomomo Agent Context]");
    expect(result).toContain("Current project: ");
    expect(result).toContain("Current project path: /home/user/project");
    expect(result).toContain("[User Preferences]");
    expect(result).toContain("I prefer TypeScript.");
    expect(result).toContain("You are a helpful assistant.");
    expect(result).toContain("[Agent Memory]");
    expect(result).toContain("Remember past work.");
    expect(result).toContain("[Project Memory]");
    expect(result).toContain("Project alpha.");
    // Skill is always injected (bundled with the CLI)
    expect(result).toContain("[Tomomo Skill]");
    expect(result).toContain("You Are a Tomomo Agent");
  });

  it("works without user.md", async () => {
    const { assembleContext } = await import("./context");

    const agentId = "test-agent-no-user";
    await writeTestFile(
      join(testDir, "agents", agentId, "soul.md"),
      "You are a coding assistant."
    );

    const result = await assembleContext({
      agentId,
      projectHash: undefined,
      projectPath: "/tmp/myproject",
      agentMemoryBudget: 10_000,
      projectMemoryBudget: 10_000,
    });

    expect(result).toContain("[Tomomo Agent Context]");
    expect(result).not.toContain("[User Preferences]");
    expect(result).toContain("You are a coding assistant.");
    expect(result).not.toContain("[Project Memory]");
    // Skill still present
    expect(result).toContain("[Tomomo Skill]");
  });

  it("always includes the bundled tomomo-self skill", async () => {
    const { assembleContext } = await import("./context");

    const agentId = "skill-agent";
    await writeTestFile(
      join(testDir, "agents", agentId, "soul.md"),
      "You are helpful."
    );

    const result = await assembleContext({
      agentId,
      projectHash: undefined,
      projectPath: "/tmp/proj",
      agentMemoryBudget: 10_000,
      projectMemoryBudget: 10_000,
    });

    expect(result).toContain("[Tomomo Skill]");
    expect(result).toContain("You Are a Tomomo Agent");
    expect(result).toContain("Starting a Session");
    expect(result).toContain("Compaction");
    // Frontmatter should be stripped
    expect(result).not.toContain("name: tomomo-self");
  });

  it("passes through valid memory content unchanged", async () => {
    const { assembleContext } = await import("./context");

    const agentId = "valid-memory-agent";
    const validMemory =
      "## Summary\n\nValid summary.\n\n## Recent\n\n### 2024-01-01: Entry\n\nBody.";

    await writeTestFile(
      join(testDir, "agents", agentId, "soul.md"),
      "You are helpful."
    );
    await writeTestFile(
      join(testDir, "agents", agentId, "memory.md"),
      validMemory
    );

    const result = await assembleContext({
      agentId,
      projectHash: undefined,
      projectPath: "/tmp/proj",
      agentMemoryBudget: 10_000,
      projectMemoryBudget: 10_000,
    });

    expect(result).toContain("Valid summary.");
    expect(result).toContain("### 2024-01-01: Entry");
  });

  it("recovers from corrupt memory (null bytes) by backing up and resetting", async () => {
    const { assembleContext } = await import("./context");
    const { readFile } = await import("node:fs/promises");

    const agentId = "corrupt-memory-agent";
    const corruptMemory = "## Summary\n\nSome text\0binary content";
    const memoryPath = join(testDir, "agents", agentId, "memory.md");
    const backupPath = join(testDir, "agents", agentId, "memory.corrupted.bak");

    await writeTestFile(memoryPath, corruptMemory);
    await writeTestFile(
      join(testDir, "agents", agentId, "soul.md"),
      "You are helpful."
    );

    const result = await assembleContext({
      agentId,
      projectHash: undefined,
      projectPath: "/tmp/proj",
      agentMemoryBudget: 10_000,
      projectMemoryBudget: 10_000,
    });

    // Fresh memory is returned (contains ## Summary section)
    expect(result).toContain("[Agent Memory]");
    expect(result).toContain("## Summary");
    // Corrupt content should not appear
    expect(result).not.toContain("binary content");

    // Backup file should have been created with the corrupt content
    const backedUp = await readFile(backupPath, "utf-8");
    expect(backedUp).toBe(corruptMemory);

    // Original memory file should be reset to fresh content
    const reset = await readFile(memoryPath, "utf-8");
    expect(reset).toBe("## Summary\n\n## Recent\n");
  });

  it("respects memory budget (truncates large memory)", async () => {
    const { assembleContext } = await import("./context");

    const agentId = "budget-agent";

    const entries: string[] = [];
    for (let i = 1; i <= 100; i++) {
      entries.push(
        `### 2024-01-${String(i).padStart(2, "0")}: Task ${i}\n\nDetails for task ${i}. `
          .repeat(5)
          .trim()
      );
    }
    const agentMemory = `## Summary\n\nAgent summary here.\n\n## Recent\n\n${entries.join("\n\n")}`;

    await writeTestFile(
      join(testDir, "agents", agentId, "soul.md"),
      "I am an agent."
    );
    await writeTestFile(
      join(testDir, "agents", agentId, "memory.md"),
      agentMemory
    );

    const smallBudget = 800;

    const result = await assembleContext({
      agentId,
      projectHash: undefined,
      projectPath: "/tmp/proj",
      agentMemoryBudget: smallBudget,
      projectMemoryBudget: 10_000,
    });

    expect(result).toContain("[Agent Memory]");
    expect(result).toContain("Agent summary here.");

    // The truncated memory section should be smaller than the original
    const memoryStart = result.indexOf("[Agent Memory]\n");
    const memoryEnd = result.indexOf("\n\n[Tomomo Skill]");
    if (memoryStart >= 0 && memoryEnd >= 0) {
      const memorySection = result.slice(memoryStart, memoryEnd);
      expect(memorySection.length).toBeLessThan(agentMemory.length);
    }
  });

  it("loads equipped skills into context", async () => {
    const { assembleContext } = await import("./context");

    const agentId = "skill-equip-agent";
    await writeTestFile(
      join(testDir, "agents", agentId, "soul.md"),
      "You are helpful."
    );

    // Create two equipped skills
    await writeTestFile(
      join(testDir, "agents", agentId, "skills", "code-review", "SKILL.md"),
      "---\nname: code-review\ndescription: Review code\n---\n\nAlways check for bugs."
    );
    await writeTestFile(
      join(testDir, "agents", agentId, "skills", "testing", "SKILL.md"),
      "---\nname: testing\ndescription: Write tests\n---\n\nWrite tests first."
    );

    const result = await assembleContext({
      agentId,
      projectHash: undefined,
      projectPath: "/tmp/proj",
      agentMemoryBudget: 10_000,
      projectMemoryBudget: 10_000,
    });

    // Both skills injected with frontmatter stripped
    expect(result).toContain("[Skill: code-review]");
    expect(result).toContain("Always check for bugs.");
    expect(result).toContain("[Skill: testing]");
    expect(result).toContain("Write tests first.");
    expect(result).not.toContain("name: code-review");
    expect(result).not.toContain("name: testing");
  });

  it("skips hidden files and non-directories in skills folder", async () => {
    const { assembleContext } = await import("./context");

    const agentId = "skill-filter-agent";
    await writeTestFile(
      join(testDir, "agents", agentId, "soul.md"),
      "You are helpful."
    );
    await writeTestFile(
      join(testDir, "agents", agentId, "skills", "valid-skill", "SKILL.md"),
      "---\nname: valid\ndescription: Valid\n---\n\nValid skill content."
    );
    // Hidden directory
    await writeTestFile(
      join(testDir, "agents", agentId, "skills", ".hidden", "SKILL.md"),
      "---\nname: hidden\ndescription: Hidden\n---\n\nShould not appear."
    );
    // File (not directory) in skills folder
    await writeFile(
      join(testDir, "agents", agentId, "skills", ".DS_Store"),
      "junk",
      "utf-8"
    );

    const result = await assembleContext({
      agentId,
      projectHash: undefined,
      projectPath: "/tmp/proj",
      agentMemoryBudget: 10_000,
      projectMemoryBudget: 10_000,
    });

    expect(result).toContain("[Skill: valid-skill]");
    expect(result).toContain("Valid skill content.");
    expect(result).not.toContain("Should not appear");
    expect(result).not.toContain(".DS_Store");
  });

  it("handles missing skills directory gracefully", async () => {
    const { assembleContext } = await import("./context");

    const agentId = "no-skills-agent";
    await writeTestFile(
      join(testDir, "agents", agentId, "soul.md"),
      "You are helpful."
    );
    // No skills/ directory created

    const result = await assembleContext({
      agentId,
      projectHash: undefined,
      projectPath: "/tmp/proj",
      agentMemoryBudget: 10_000,
      projectMemoryBudget: 10_000,
    });

    // Should not throw, no skill sections beyond tomomo-self
    expect(result).toContain("[Tomomo Skill]");
    expect(result).not.toMatch(/\[Skill: /);
  });
});
