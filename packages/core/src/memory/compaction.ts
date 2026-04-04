import { readTextFile, writeTextFile } from "../utils/files";
import { writeWithLock } from "../utils/file-lock";
import type { TomomoAdapter, CompactionResult } from "../types";

// Checks that compacted output has the required structure
export function validateCompactedOutput(output: string): boolean {
  if (!output || output.trim().length === 0) {
    return false;
  }

  // Reject code-fenced output (LLM wrapped the response in a code block)
  if (output.trimStart().startsWith("```")) {
    return false;
  }

  const hasSummary = /^## Summary/m.test(output);
  const hasRecent = /^## Recent/m.test(output);

  return hasSummary && hasRecent;
}

export function buildCompactionPrompt(memoryContent: string): string {
  return [
    "You are compacting a memory file for a coding agent.",
    "The file has two sections: ## Summary and ## Recent.",
    "",
    "Rules:",
    "1. Merge older entries into the ## Summary section, keeping it concise.",
    "2. Keep the 5 most recent entries under ## Recent.",
    "3. Preserve important facts, preferences, and decisions.",
    "4. Drop routine or redundant details.",
    "5. Output ONLY the compacted markdown. No code fences, no explanation.",
    "6. The output must start with ## Summary and contain ## Recent.",
    "",
    "Here is the memory file to compact:",
    "",
    memoryContent,
  ].join("\n");
}

interface CompactionOptions {
  timeoutMs?: number;
}

const DEFAULT_COMPACTION_TIMEOUT_MS = 60_000;

export async function compactMemoryFile(
  memoryPath: string,
  adapter: TomomoAdapter,
  thresholdBytes: number,
  options?: CompactionOptions
): Promise<CompactionResult> {
  // Skip if adapter cannot run prompts
  if (!adapter.runPrompt) {
    return { compacted: false, originalSize: 0, newSize: 0 };
  }

  // Read the file
  const content = await readTextFile(memoryPath);

  // Skip if file doesn't exist
  if (content === null) {
    return { compacted: false, originalSize: 0, newSize: 0 };
  }

  const originalSize = Buffer.byteLength(content, "utf-8");

  // Skip if under threshold
  if (originalSize <= thresholdBytes) {
    return { compacted: false, originalSize, newSize: originalSize };
  }

  // Backup before compaction
  try {
    await writeTextFile(memoryPath + ".bak", content);
  } catch (err) {
    return {
      compacted: false,
      originalSize,
      newSize: originalSize,
      error: `Backup failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Run compaction via LLM with timeout
  let compactedContent: string;
  try {
    const prompt = buildCompactionPrompt(content);
    const modelOptions = adapter.compactionModel
      ? { model: adapter.compactionModel }
      : undefined;

    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMPACTION_TIMEOUT_MS;
    let timer: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("Compaction timed out")),
        timeoutMs
      );
    });
    try {
      compactedContent = await Promise.race([
        adapter.runPrompt(prompt, modelOptions),
        timeoutPromise,
      ]);
    } finally {
      clearTimeout(timer!);
    }
  } catch (err) {
    return {
      compacted: false,
      originalSize,
      newSize: originalSize,
      error: `LLM compaction failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Validate output format
  if (!validateCompactedOutput(compactedContent)) {
    return {
      compacted: false,
      originalSize,
      newSize: originalSize,
      error:
        "Compacted output missing required ## Summary and ## Recent sections",
    };
  }

  const newSize = Buffer.byteLength(compactedContent, "utf-8");

  // Reject if output is larger than original
  if (newSize >= originalSize) {
    return {
      compacted: false,
      originalSize,
      newSize: originalSize,
      error: "Compacted output is not smaller than the original",
    };
  }

  // Write compacted content with lock to prevent concurrent writes
  try {
    await writeWithLock(memoryPath, compactedContent);
  } catch (err) {
    return {
      compacted: false,
      originalSize,
      newSize: originalSize,
      error: `Write failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  return { compacted: true, originalSize, newSize };
}
