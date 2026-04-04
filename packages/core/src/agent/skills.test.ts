import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, mkdir, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Mock paths so getAgentSkillsDir returns a controlled directory
let mockSkillsDir: string;
vi.mock("../paths", () => ({
  getAgentSkillsDir: () => mockSkillsDir,
}));

// Mock github module to avoid network calls
vi.mock("../github/github", () => ({
  parseGitHubSource: vi.fn(),
  fetchAgentFiles: vi.fn(),
}));

// Mock utils/files
vi.mock("../utils/files", () => ({
  ensureDir: vi.fn(async (dir: string) => {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(dir, { recursive: true });
  }),
}));

import {
  listAgentSkills,
  removeAgentSkill,
  addAgentSkill,
  installSkillFromGitHub,
} from "./skills";
import { parseGitHubSource, fetchAgentFiles } from "../github/github";

const mockedParseGitHubSource = vi.mocked(parseGitHubSource);
const mockedFetchAgentFiles = vi.mocked(fetchAgentFiles);

let testDir: string;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "tomomo-skills-"));
  mockSkillsDir = join(testDir, "skills");
  await mkdir(mockSkillsDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("listAgentSkills", () => {
  it("returns empty array when skills directory does not exist", async () => {
    mockSkillsDir = join(testDir, "nonexistent");
    const result = await listAgentSkills("agent-1");
    expect(result).toEqual([]);
  });

  it("returns skills with parsed frontmatter", async () => {
    const skillDir = join(mockSkillsDir, "my-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      "---\nname: My Skill\ndescription: A cool skill\n---\n\nContent here",
      "utf-8"
    );

    const result = await listAgentSkills("agent-1");
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("my-skill");
    expect(result[0]!.name).toBe("My Skill");
    expect(result[0]!.description).toBe("A cool skill");
    expect(result[0]!.content).toContain("Content here");
  });

  it("uses directory name as name when frontmatter has no name", async () => {
    const skillDir = join(mockSkillsDir, "bare-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), "No frontmatter", "utf-8");

    const result = await listAgentSkills("agent-1");
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("bare-skill");
    expect(result[0]!.description).toBe("");
  });

  it("ignores non-directory entries", async () => {
    await writeFile(join(mockSkillsDir, "not-a-dir.txt"), "file", "utf-8");
    const skillDir = join(mockSkillsDir, "real-skill");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      "---\nname: Real\n---\n",
      "utf-8"
    );

    const result = await listAgentSkills("agent-1");
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("real-skill");
  });

  it("returns entry with empty content when SKILL.md read fails", async () => {
    const skillDir = join(mockSkillsDir, "broken-skill");
    await mkdir(skillDir, { recursive: true });
    // No SKILL.md file created

    const result = await listAgentSkills("agent-1");
    expect(result).toHaveLength(1);
    expect(result[0]!.content).toBe("");
    expect(result[0]!.name).toBe("broken-skill");
  });
});

describe("removeAgentSkill", () => {
  it("removes a skill directory", async () => {
    const skillDir = join(mockSkillsDir, "to-remove");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), "content", "utf-8");

    await removeAgentSkill("agent-1", "to-remove");
    const entries = await readdir(mockSkillsDir);
    expect(entries).not.toContain("to-remove");
  });

  it("throws on path traversal attempt", async () => {
    await expect(removeAgentSkill("agent-1", "../escape")).rejects.toThrow(
      "Invalid skill ID"
    );
  });
});

describe("addAgentSkill", () => {
  it("copies a skill from an absolute source path", async () => {
    const sourceDir = join(testDir, "source-skill");
    await mkdir(sourceDir, { recursive: true });
    await writeFile(
      join(sourceDir, "SKILL.md"),
      "---\nname: Copied Skill\n---\nBody",
      "utf-8"
    );

    const result = await addAgentSkill("agent-1", sourceDir);
    expect(result.id).toBe("source-skill");
    expect(result.name).toBe("Copied Skill");

    // Verify it was copied to the skills dir
    const copied = await readdir(join(mockSkillsDir, "source-skill"));
    expect(copied).toContain("SKILL.md");
  });

  it("throws on relative source path", async () => {
    await expect(addAgentSkill("agent-1", "relative/path")).rejects.toThrow(
      "Must be an absolute"
    );
  });

  it("throws when source has no SKILL.md", async () => {
    const sourceDir = join(testDir, "no-skill-md");
    await mkdir(sourceDir, { recursive: true });

    await expect(addAgentSkill("agent-1", sourceDir)).rejects.toThrow();
  });
});

describe("installSkillFromGitHub", () => {
  it("installs a skill from GitHub source", async () => {
    mockedParseGitHubSource.mockReturnValue({
      owner: "user",
      repo: "repo",
      path: "skills/my-skill",
    });
    mockedFetchAgentFiles.mockResolvedValue([
      { path: "SKILL.md", content: "---\nname: GH Skill\n---\nRemote content" },
      { path: "extra.txt", content: "extra" },
    ]);

    const result = await installSkillFromGitHub(
      "agent-1",
      "user/repo/skills/my-skill"
    );
    expect(result.id).toBe("my-skill");
    expect(result.name).toBe("GH Skill");

    // Verify files were written
    const entries = await readdir(join(mockSkillsDir, "my-skill"));
    expect(entries).toContain("SKILL.md");
    expect(entries).toContain("extra.txt");
  });

  it("throws when no SKILL.md in GitHub source", async () => {
    mockedParseGitHubSource.mockReturnValue({
      owner: "user",
      repo: "repo",
      path: "no-skill",
    });
    mockedFetchAgentFiles.mockResolvedValue([
      { path: "README.md", content: "no skill here" },
    ]);

    await expect(
      installSkillFromGitHub("agent-1", "user/repo/no-skill")
    ).rejects.toThrow("No SKILL.md found");
  });

  it("sanitizes skill ID from source path", async () => {
    mockedParseGitHubSource.mockReturnValue({
      owner: "user",
      repo: "repo",
      path: "skills/My Weird_Skill!",
    });
    mockedFetchAgentFiles.mockResolvedValue([
      { path: "SKILL.md", content: "---\nname: Weird\n---\n" },
    ]);

    const result = await installSkillFromGitHub(
      "agent-1",
      "user/repo/skills/My Weird_Skill!"
    );
    // Should be sanitized: lowercase, non-alphanumeric replaced with -
    expect(result.id).toMatch(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/);
  });
});
