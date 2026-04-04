import { describe, it, expect } from "vitest";
import {
  parseMemoryFile,
  truncateWithinBudget,
  basicCompact,
  isValidMemoryFormat,
} from "./budget";

const SAMPLE = `## Summary

This agent handles frontend tasks.

## Recent

### 2024-01-03: Fixed bug

Resolved a null pointer exception in the renderer.

### 2024-01-04: Added feature

Implemented dark mode support.

### 2024-01-05: Refactored

Cleaned up the component tree.`;

describe("parseMemoryFile", () => {
  it("parses Summary and Recent sections correctly", () => {
    const result = parseMemoryFile(SAMPLE);
    expect(result.summary).toBe("This agent handles frontend tasks.");
    expect(result.entries).toHaveLength(3);
    expect(result.entries[0]!.header).toBe("### 2024-01-03: Fixed bug");
    expect(result.entries[1]!.header).toBe("### 2024-01-04: Added feature");
    expect(result.entries[2]!.header).toBe("### 2024-01-05: Refactored");
    expect(result.entries[0]!.body).toBe(
      "Resolved a null pointer exception in the renderer."
    );
    expect(result.entries[2]!.body).toBe("Cleaned up the component tree.");
  });

  it("handles missing Summary", () => {
    const content = `## Recent\n\n### 2024-01-01: Entry\n\nSome body.`;
    const result = parseMemoryFile(content);
    expect(result.summary).toBe("");
    expect(result.entries).toHaveLength(1);
  });

  it("handles missing Recent", () => {
    const content = `## Summary\n\nJust a summary.`;
    const result = parseMemoryFile(content);
    expect(result.summary).toBe("Just a summary.");
    expect(result.entries).toHaveLength(0);
  });

  it("handles empty content", () => {
    const result = parseMemoryFile("");
    expect(result.summary).toBe("");
    expect(result.entries).toHaveLength(0);
  });
});

describe("truncateWithinBudget", () => {
  it("returns full content when within budget", () => {
    const result = truncateWithinBudget(SAMPLE, 100_000);
    expect(result).toBe(SAMPLE);
  });

  it("keeps Summary and drops older entries when over budget", () => {
    // Budget large enough for summary + newest entry but not all entries
    const summarySection = `## Summary\n\nThis agent handles frontend tasks.`;
    const newestEntry = `### 2024-01-05: Refactored\n\nCleaned up the component tree.`;
    const minBudget =
      summarySection.length +
      "\n\n## Recent\n\n".length +
      newestEntry.length +
      10;

    const result = truncateWithinBudget(SAMPLE, minBudget);
    expect(result).toContain("This agent handles frontend tasks.");
    expect(result).toContain("### 2024-01-05: Refactored");
    // Oldest entries should be dropped
    expect(result).not.toContain("### 2024-01-03: Fixed bug");
  });

  it("keeps at least Summary when budget is very small", () => {
    const result = truncateWithinBudget(SAMPLE, 50);
    expect(result).toContain("## Summary");
    expect(result).not.toContain("## Recent");
  });
});

describe("isValidMemoryFormat", () => {
  it("accepts valid memory with both sections", () => {
    expect(isValidMemoryFormat(SAMPLE)).toBe(true);
  });

  it("accepts empty/minimal memory", () => {
    expect(isValidMemoryFormat("## Summary\n\n## Recent\n")).toBe(true);
  });

  it("rejects null bytes (binary content)", () => {
    expect(isValidMemoryFormat("## Summary\n\nSome text\0more text")).toBe(
      false
    );
  });

  it("rejects content without ## Summary", () => {
    expect(
      isValidMemoryFormat("## Recent\n\n### 2024-01-01: Entry\n\nBody")
    ).toBe(false);
  });

  it("accepts empty string (no memory yet)", () => {
    expect(isValidMemoryFormat("")).toBe(true);
  });
});

describe("basicCompact", () => {
  it("returns content unchanged when few entries", () => {
    const content =
      "## Summary\n\nFact\n\n## Recent\n\n### 2024-01-01: Entry\n\n- Detail\n";
    const result = basicCompact(content, 5);
    expect(result).toBe(content);
  });

  it("compacts old entries into summary", () => {
    let content = "## Summary\n\nExisting fact\n\n## Recent\n\n";
    for (let i = 1; i <= 10; i++) {
      content += `### 2024-01-${String(i).padStart(2, "0")}: Entry ${i}\n\n- Detail ${i}\n\n`;
    }

    const result = basicCompact(content, 3);
    expect(result).toContain("Existing fact");
    expect(result).toContain("Detail 1"); // compacted into summary
    expect(result).toContain("Entry 8"); // kept in recent
    expect(result).toContain("Entry 9");
    expect(result).toContain("Entry 10");
  });

  it("keeps all bullets from compacted entries in summary", () => {
    const content = [
      "## Summary",
      "",
      "- Existing fact",
      "",
      "## Recent",
      "",
      "### 2024-01-01: Old entry 1",
      "- Fact A",
      "- Fact B",
      "- Fact C",
      "",
      "### 2024-01-02: Old entry 2",
      "- Fact D",
      "",
      "### 2024-01-03: Recent 1",
      "- Recent fact 1",
      "",
      "### 2024-01-04: Recent 2",
      "- Recent fact 2",
      "",
      "### 2024-01-05: Recent 3",
      "- Recent fact 3",
      "",
      "### 2024-01-06: Recent 4",
      "- Recent fact 4",
      "",
      "### 2024-01-07: Recent 5",
      "- Recent fact 5",
    ].join("\n");

    const result = basicCompact(content, 5);
    expect(result).toContain("- Fact A");
    expect(result).toContain("- Fact B");
    expect(result).toContain("- Fact C");
    expect(result).toContain("- Fact D");
    expect(result).toContain("- Existing fact");
    expect(result).toContain("### 2024-01-03: Recent 1");
    expect(result).toContain("### 2024-01-07: Recent 5");
  });

  it("uses header as fallback when entry has no bullets", () => {
    const content = [
      "## Summary",
      "",
      "## Recent",
      "",
      "### 2024-01-01: Old entry",
      "Some paragraph text without bullets.",
      "",
      "### 2024-01-02: Recent 1",
      "- Fact",
    ].join("\n");

    const result = basicCompact(content, 1);
    expect(result).toContain("- 2024-01-01: Old entry");
  });
});
