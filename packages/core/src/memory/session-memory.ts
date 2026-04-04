import { readdir, rm, rename } from "node:fs/promises";
import { join } from "node:path";
import { readTextFile } from "../utils/files";
import { writeWithLock } from "../utils/file-lock";
import { parseMemoryFile } from "./budget";

// Merge all session-*.md files into the main memory.md
// Called before context assembly on each launch
export async function mergeSessionMemories(
  memoryPath: string,
  dirPath: string
): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(dirPath);
  } catch {
    return;
  }

  // Pick up leftover .merging.md files from a previous crashed merge
  const alreadyStaged = entries.filter(
    (f) => f.startsWith("session-") && f.endsWith(".merging.md")
  );
  const sessionFiles = entries.filter(
    (f) =>
      f.startsWith("session-") &&
      f.endsWith(".md") &&
      !f.endsWith(".merging.md")
  );

  if (sessionFiles.length === 0 && alreadyStaged.length === 0) return;

  // Rename session files before reading to prevent race with concurrent sessions.
  // A running session writing to session-abc.md will create a fresh file after rename.
  // The renamed file is safe to read and delete.
  const stagedFiles: string[] = alreadyStaged.map((f) => join(dirPath, f));
  for (const file of sessionFiles) {
    const src = join(dirPath, file);
    const dst = join(dirPath, file.replace(".md", ".merging.md"));
    try {
      await rename(src, dst);
      stagedFiles.push(dst);
    } catch {
      // File may have been deleted by another merge or doesn't exist. Skip.
    }
  }

  if (stagedFiles.length === 0) return;

  // Read the main memory file
  const mainContent =
    (await readTextFile(memoryPath)) ?? "## Summary\n\n## Recent\n";
  const mainParsed = parseMemoryFile(mainContent);

  // Read and collect all session entries
  const newEntries: string[] = [];
  for (const filePath of stagedFiles) {
    const content = await readTextFile(filePath);
    if (!content || !content.trim()) continue;

    const parsed = parseMemoryFile(content);
    for (const entry of parsed.entries) {
      newEntries.push(entry.full);
    }

    // If there's content but no parsed entries, treat the whole thing as one entry
    if (parsed.entries.length === 0 && content.trim()) {
      newEntries.push(content.trim());
    }
  }

  if (newEntries.length === 0) {
    // Staged files have no content. Clean them up.
    for (const filePath of stagedFiles) {
      await rm(filePath, { force: true });
    }
    return;
  }

  // Append new entries to the main memory's Recent section
  let merged = "## Summary\n\n";
  if (mainParsed.summary) {
    merged += mainParsed.summary + "\n\n";
  }
  merged += "## Recent\n\n";

  const allEntries = [...mainParsed.entries.map((e) => e.full), ...newEntries];
  merged += allEntries.join("\n\n");

  // Write merged content
  await writeWithLock(memoryPath, merged);

  // Clean up staged files
  for (const filePath of stagedFiles) {
    await rm(filePath, { force: true });
  }
}
