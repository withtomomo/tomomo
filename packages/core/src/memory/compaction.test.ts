import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TomomoAdapter } from "../types";

vi.mock("../utils/files", () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
}));

vi.mock("../utils/file-lock", () => ({
  writeWithLock: vi.fn(),
}));

import { readTextFile, writeTextFile } from "../utils/files";
import { writeWithLock } from "../utils/file-lock";
import {
  compactMemoryFile,
  validateCompactedOutput,
  buildCompactionPrompt,
} from "./compaction";

const mockRead = vi.mocked(readTextFile);
const mockWrite = vi.mocked(writeTextFile);
const mockWriteWithLock = vi.mocked(writeWithLock);

function makeAdapter(overrides: Partial<TomomoAdapter> = {}): TomomoAdapter {
  return {
    name: "test-adapter",
    install: {
      command: "npm install test-adapter",
      description: "Test Adapter",
      url: "https://test.com",
    },
    check: vi.fn().mockResolvedValue({ available: true }),
    launch: vi.fn(),
    runPrompt: vi.fn(),
    ...overrides,
  };
}

const SMALL_CONTENT =
  "## Summary\n\nShort.\n\n## Recent\n\n### Entry 1\n\nDone.";
const LARGE_CONTENT =
  "## Summary\n\n" +
  "x".repeat(60000) +
  "\n\n## Recent\n\n### Entry 1\n\nDone.";
const COMPACTED =
  "## Summary\n\nCompacted summary.\n\n## Recent\n\n### Entry 1\n\nDone.";

describe("validateCompactedOutput", () => {
  it("accepts valid output with both sections", () => {
    expect(
      validateCompactedOutput("## Summary\n\nStuff.\n\n## Recent\n\nMore.")
    ).toBe(true);
  });

  it("rejects empty output", () => {
    expect(validateCompactedOutput("")).toBe(false);
    expect(validateCompactedOutput("   ")).toBe(false);
  });

  it("rejects output missing ## Summary", () => {
    expect(validateCompactedOutput("## Recent\n\nStuff.")).toBe(false);
  });

  it("rejects output missing ## Recent", () => {
    expect(validateCompactedOutput("## Summary\n\nStuff.")).toBe(false);
  });

  it("rejects code-fenced output", () => {
    expect(
      validateCompactedOutput("```markdown\n## Summary\n\n## Recent\n```")
    ).toBe(false);
  });
});

describe("buildCompactionPrompt", () => {
  it("includes the memory content", () => {
    const prompt = buildCompactionPrompt("some memory");
    expect(prompt).toContain("some memory");
    expect(prompt).toContain("## Summary");
    expect(prompt).toContain("## Recent");
  });
});

describe("compactMemoryFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips when file is under threshold", async () => {
    mockRead.mockResolvedValue(SMALL_CONTENT);
    const adapter = makeAdapter();

    const result = await compactMemoryFile("/mem.md", adapter, 100000);

    expect(result.compacted).toBe(false);
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it("skips when file does not exist", async () => {
    mockRead.mockResolvedValue(null);
    const adapter = makeAdapter();

    const result = await compactMemoryFile("/mem.md", adapter, 1000);

    expect(result.compacted).toBe(false);
    expect(result.originalSize).toBe(0);
  });

  it("skips when adapter has no runPrompt", async () => {
    const adapter = makeAdapter({ runPrompt: undefined });

    const result = await compactMemoryFile("/mem.md", adapter, 1000);

    expect(result.compacted).toBe(false);
    expect(mockRead).not.toHaveBeenCalled();
  });

  it("compacts when file exceeds threshold", async () => {
    mockRead.mockResolvedValue(LARGE_CONTENT);
    mockWrite.mockResolvedValue(undefined);
    mockWriteWithLock.mockResolvedValue(undefined);
    const adapter = makeAdapter({
      runPrompt: vi.fn().mockResolvedValue(COMPACTED),
    });

    const result = await compactMemoryFile("/mem.md", adapter, 1000);

    expect(result.compacted).toBe(true);
    expect(result.originalSize).toBeGreaterThan(result.newSize);

    // Backup still uses writeTextFile (no lock needed for backup)
    expect(mockWrite).toHaveBeenCalledWith("/mem.md.bak", LARGE_CONTENT);
    // Final write uses writeWithLock
    expect(mockWriteWithLock).toHaveBeenCalledWith("/mem.md", COMPACTED);
  });

  it("returns error when LLM output has invalid format", async () => {
    mockRead.mockResolvedValue(LARGE_CONTENT);
    mockWrite.mockResolvedValue(undefined);
    const adapter = makeAdapter({
      runPrompt: vi.fn().mockResolvedValue("Just some text without headers"),
    });

    const result = await compactMemoryFile("/mem.md", adapter, 1000);

    expect(result.compacted).toBe(false);
    expect(result.error).toContain("## Summary");
    // Only backup was written, not the invalid content
    expect(mockWrite).toHaveBeenCalledTimes(1);
    expect(mockWrite).toHaveBeenCalledWith("/mem.md.bak", LARGE_CONTENT);
  });

  it("handles runPrompt failure gracefully", async () => {
    mockRead.mockResolvedValue(LARGE_CONTENT);
    mockWrite.mockResolvedValue(undefined);
    const adapter = makeAdapter({
      runPrompt: vi.fn().mockRejectedValue(new Error("API timeout")),
    });

    const result = await compactMemoryFile("/mem.md", adapter, 1000);

    expect(result.compacted).toBe(false);
    expect(result.error).toContain("API timeout");
  });

  it("uses adapter compactionModel when available", async () => {
    mockRead.mockResolvedValue(LARGE_CONTENT);
    mockWrite.mockResolvedValue(undefined);
    const runPrompt = vi.fn().mockResolvedValue(COMPACTED);
    const adapter = makeAdapter({
      runPrompt,
      compactionModel: "haiku",
    });

    await compactMemoryFile("/mem.md", adapter, 1000);

    expect(runPrompt).toHaveBeenCalledWith(expect.any(String), {
      model: "haiku",
    });
  });

  it("returns error when runPrompt exceeds timeout", async () => {
    mockRead.mockResolvedValue(LARGE_CONTENT);
    mockWrite.mockResolvedValue(undefined);

    // runPrompt that never resolves
    const adapter = makeAdapter({
      runPrompt: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    const result = await compactMemoryFile("/mem.md", adapter, 1000, {
      timeoutMs: 50,
    });

    expect(result.compacted).toBe(false);
    expect(result.error).toContain("timed out");
  });

  it("rejects output larger than original", async () => {
    const original =
      "## Summary\n\n" + "x".repeat(100) + "\n\n## Recent\n\n### E1\n\nDone.";
    mockRead.mockResolvedValue(original);
    mockWrite.mockResolvedValue(undefined);

    // Return something larger
    const bigger =
      "## Summary\n\n" + "x".repeat(500) + "\n\n## Recent\n\n### E1\n\nDone.";
    const adapter = makeAdapter({
      runPrompt: vi.fn().mockResolvedValue(bigger),
    });

    // Use a threshold smaller than the original
    const result = await compactMemoryFile("/mem.md", adapter, 10);

    expect(result.compacted).toBe(false);
    expect(result.error).toContain("not smaller");
  });
});
