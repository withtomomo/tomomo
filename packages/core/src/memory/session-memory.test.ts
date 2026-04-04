import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mergeSessionMemories } from "./session-memory";

let testDir: string;

beforeEach(() => {
  testDir = join(
    tmpdir(),
    `session-memory-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("mergeSessionMemories", () => {
  it("does nothing when no session files exist", async () => {
    const memoryPath = join(testDir, "memory.md");
    writeFileSync(memoryPath, "## Summary\n\n## Recent\n");

    await mergeSessionMemories(memoryPath, testDir);

    expect(readFileSync(memoryPath, "utf-8")).toBe("## Summary\n\n## Recent\n");
  });

  it("does nothing when directory does not exist", async () => {
    const memoryPath = join(testDir, "nonexistent", "memory.md");
    const dirPath = join(testDir, "nonexistent");

    // Should not throw
    await mergeSessionMemories(memoryPath, dirPath);
  });

  it("merges session files into main memory and deletes them", async () => {
    const memoryPath = join(testDir, "memory.md");
    writeFileSync(
      memoryPath,
      "## Summary\n\nKey facts here\n\n## Recent\n\n### 2026-03-10: Existing entry\n\n- Already here\n"
    );

    const session1 = join(testDir, "session-abc123.md");
    writeFileSync(
      session1,
      "## Summary\n\n## Recent\n\n### 2026-03-15: Learned something\n\n- New fact from session 1\n"
    );

    const session2 = join(testDir, "session-def456.md");
    writeFileSync(
      session2,
      "## Summary\n\n## Recent\n\n### 2026-03-16: Another thing\n\n- New fact from session 2\n"
    );

    await mergeSessionMemories(memoryPath, testDir);

    const result = readFileSync(memoryPath, "utf-8");
    // Should contain the summary
    expect(result).toContain("Key facts here");
    // Should contain the existing entry
    expect(result).toContain("### 2026-03-10: Existing entry");
    expect(result).toContain("- Already here");
    // Should contain entries from both sessions
    expect(result).toContain("### 2026-03-15: Learned something");
    expect(result).toContain("- New fact from session 1");
    expect(result).toContain("### 2026-03-16: Another thing");
    expect(result).toContain("- New fact from session 2");

    // Session files should be deleted
    expect(existsSync(session1)).toBe(false);
    expect(existsSync(session2)).toBe(false);
  });

  it("handles empty session files by cleaning them up", async () => {
    const memoryPath = join(testDir, "memory.md");
    writeFileSync(memoryPath, "## Summary\n\n## Recent\n");

    const session1 = join(testDir, "session-empty1.md");
    writeFileSync(session1, "");

    const session2 = join(testDir, "session-empty2.md");
    writeFileSync(session2, "   \n  \n  ");

    await mergeSessionMemories(memoryPath, testDir);

    // Session files should be cleaned up
    expect(existsSync(session1)).toBe(false);
    expect(existsSync(session2)).toBe(false);

    // Main memory should be unchanged
    expect(readFileSync(memoryPath, "utf-8")).toBe("## Summary\n\n## Recent\n");
  });

  it("creates memory.md when it does not exist", async () => {
    const memoryPath = join(testDir, "memory.md");
    // Do NOT create memory.md

    const session1 = join(testDir, "session-new1.md");
    writeFileSync(
      session1,
      "## Summary\n\n## Recent\n\n### 2026-03-18: First memory\n\n- Something learned\n"
    );

    await mergeSessionMemories(memoryPath, testDir);

    expect(existsSync(memoryPath)).toBe(true);
    const result = readFileSync(memoryPath, "utf-8");
    expect(result).toContain("### 2026-03-18: First memory");
    expect(result).toContain("- Something learned");

    // Session file should be deleted
    expect(existsSync(session1)).toBe(false);
  });

  it("handles session files with raw content (no headers)", async () => {
    const memoryPath = join(testDir, "memory.md");
    writeFileSync(memoryPath, "## Summary\n\n## Recent\n");

    // A session file that has content but no ## Summary / ## Recent / ### headers
    const session1 = join(testDir, "session-raw1.md");
    writeFileSync(session1, "User prefers dark mode and short responses.");

    await mergeSessionMemories(memoryPath, testDir);

    const result = readFileSync(memoryPath, "utf-8");
    expect(result).toContain("User prefers dark mode and short responses.");
    expect(existsSync(session1)).toBe(false);
  });

  it("ignores non-session files in the directory", async () => {
    const memoryPath = join(testDir, "memory.md");
    writeFileSync(memoryPath, "## Summary\n\n## Recent\n");

    // These should be ignored
    writeFileSync(join(testDir, "soul.md"), "I am an agent");
    writeFileSync(join(testDir, "agent.json"), "{}");
    writeFileSync(join(testDir, "not-a-session.md"), "random file");

    await mergeSessionMemories(memoryPath, testDir);

    // Memory should be unchanged (no session files to merge)
    expect(readFileSync(memoryPath, "utf-8")).toBe("## Summary\n\n## Recent\n");
  });
});
