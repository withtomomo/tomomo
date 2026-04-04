import type { MemoryEntry, ParsedMemory } from "../types";

export function isValidMemoryFormat(content: string): boolean {
  // Empty is valid (no memory yet)
  if (!content || !content.trim()) return true;
  // Binary content check (null bytes)
  if (content.includes("\0")) return false;
  // Must have at least ## Summary section
  return /^## Summary/m.test(content);
}

export function parseMemoryFile(content: string): ParsedMemory {
  // Extract ## Summary section
  const summaryMatch = content.match(
    /^## Summary\s*\n([\s\S]*?)(?=\n## |\n?$)/m
  );
  const summaryRaw: string | undefined = summaryMatch?.[1];
  const summary = summaryRaw !== undefined ? summaryRaw.trim() : "";

  // Extract ## Recent section
  const recentMatch = content.match(/^## Recent\s*\n([\s\S]*)$/m);
  const recentRaw: string | undefined = recentMatch?.[1];
  const recentContent: string = recentRaw ?? "";

  // Split recent content into entries by "### " headings
  const entries: MemoryEntry[] = [];
  if (recentContent.trim()) {
    // Split on lines that start with "### "
    const parts = recentContent.split(/(?=^### )/m);
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const headerLineEnd = trimmed.indexOf("\n");
      const header =
        headerLineEnd === -1 ? trimmed : trimmed.slice(0, headerLineEnd).trim();
      const body =
        headerLineEnd === -1 ? "" : trimmed.slice(headerLineEnd + 1).trim();
      entries.push({ header, body, full: trimmed });
    }
  }

  return { summary, entries };
}

// Basic mechanical compaction (extracts all bullets from each old entry).
// This is a fallback. Full LLM-driven compaction happens during agent sessions
// via the tomomo-self skill, or via a spawned non-interactive runtime session.
export function basicCompact(content: string, keepRecent: number = 5): string {
  const parsed = parseMemoryFile(content);

  if (parsed.entries.length <= keepRecent) {
    return content;
  }

  const oldEntries = parsed.entries.slice(
    0,
    parsed.entries.length - keepRecent
  );
  const recentEntries = parsed.entries.slice(
    parsed.entries.length - keepRecent
  );

  const compactedFacts = oldEntries
    .map((e) => {
      const bullets = e.body
        .split("\n")
        .filter((l) => l.trim().startsWith("- "))
        .map((l) => l.trim());
      if (bullets.length > 0) {
        return bullets.join("\n");
      }
      // Fallback: use header text (strip ### prefix)
      const headerText = e.header.replace(/^###\s*/, "");
      return `- ${headerText}`;
    })
    .join("\n");

  let newSummary = parsed.summary;
  if (compactedFacts) {
    newSummary = newSummary
      ? `${newSummary}\n${compactedFacts}`
      : compactedFacts;
  }

  let result = "## Summary\n\n";
  result += newSummary + "\n\n";
  result += "## Recent\n\n";
  result += recentEntries.map((e) => e.full).join("\n\n");

  return result;
}

export function truncateWithinBudget(
  content: string,
  budgetChars: number
): string {
  if (content.length <= budgetChars) return content;

  const parsed = parseMemoryFile(content);

  // Build summary section
  const summarySection = parsed.summary
    ? `## Summary\n\n${parsed.summary}`
    : `## Summary`;

  // If no entries, just return summary section (truncated if necessary)
  if (parsed.entries.length === 0) {
    return summarySection.length <= budgetChars
      ? summarySection
      : summarySection.slice(0, budgetChars);
  }

  // Start building from newest entries (last in array)
  const recentHeader = "\n\n## Recent\n\n";
  const base = summarySection + recentHeader;

  const selectedEntries: string[] = [];
  for (let i = parsed.entries.length - 1; i >= 0; i--) {
    const entry: MemoryEntry | undefined = parsed.entries[i];
    if (!entry) continue;
    const separator = selectedEntries.length > 0 ? "\n\n" : "";
    const candidate =
      base + entry.full + separator + selectedEntries.join("\n\n");
    if (candidate.length <= budgetChars) {
      selectedEntries.unshift(entry.full);
    } else {
      break;
    }
  }

  if (selectedEntries.length === 0) {
    // Not even one entry fits; return just the summary section
    return summarySection.length <= budgetChars
      ? summarySection
      : summarySection.slice(0, budgetChars);
  }

  return summarySection + recentHeader + selectedEntries.join("\n\n");
}
