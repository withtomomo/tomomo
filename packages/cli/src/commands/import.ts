import { Command } from "commander";
import { execFile } from "node:child_process";
import { resolve, basename, relative, join } from "node:path";
import {
  agentExists,
  slugifyName,
  loadAgent,
  saveAgent,
  getAgentDir,
  getAgentGitignorePath,
  getAgentMcpConfigPath,
  ensureAgentGitignore,
  ensureDir,
  fileExists,
} from "@tomomo/core";
import { rm, readdir, rename } from "node:fs/promises";
import { tmpdir } from "node:os";

async function validateExtractedDir(dir: string): Promise<void> {
  const resolvedDir = resolve(dir);
  const entries = await readdir(dir, { recursive: true });
  for (const entry of entries) {
    const fullPath = resolve(dir, entry);
    const rel = relative(resolvedDir, fullPath);
    if (
      rel.startsWith("..") ||
      resolve(fullPath) !== fullPath.replace(/\/$/, "")
    ) {
      throw new Error("Archive contains unsafe paths. Import aborted.");
    }
  }
}

export const importCommand = new Command("import")
  .description("Import an agent from .tar.gz")
  .argument("<file>", "Path to .tar.gz file")
  .option("--json", "Output as JSON")
  .action(async (file: string, options) => {
    const filePath = resolve(file);
    // Derive agent ID from filename (e.g., "web-dev.tar.gz" -> "web-dev"), then slugify
    const rawName = basename(filePath).replace(/\.tar\.gz$/, "");
    const agentId = slugifyName(rawName);

    if (await agentExists(agentId)) {
      console.error(
        `Agent "${agentId}" already exists. Delete it first or use a different file name.`
      );
      process.exit(1);
    }

    // Extract to a temp directory first, validate, then move to final location
    const tempDir = join(tmpdir(), `tomomo-import-${Date.now()}`);
    await ensureDir(tempDir);

    try {
      // Extract to temp
      await new Promise<void>((resolve, reject) => {
        execFile("tar", ["xzf", filePath, "-C", tempDir], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Validate before moving to final location
      await validateExtractedDir(tempDir);

      // Move to final agent directory
      const agentDir = getAgentDir(agentId);
      await rename(tempDir, agentDir);

      // Post-import validation: verify the extracted archive contains a valid agent config
      const config = await loadAgent(agentId);
      if (!config) {
        await rm(agentDir, { recursive: true, force: true });
        console.error(
          `Import failed: extracted archive does not contain a valid agent config.`
        );
        process.exit(1);
      }

      if (config.id !== agentId) {
        config.id = agentId;
        await saveAgent(config);
      }

      // Never import .env (contains secrets that should not be portable)
      await rm(join(agentDir, ".env"), { force: true });

      // Ensure .gitignore exists if mcp.json is present (it references .env)
      if (await fileExists(getAgentMcpConfigPath(agentId))) {
        await ensureAgentGitignore(getAgentGitignorePath(agentId));
      }

      if (options.json) {
        console.log(JSON.stringify({ imported: agentId }, null, 2));
      } else {
        console.log(`Imported agent "${agentId}" from ${filePath}`);
      }
    } catch (err) {
      // Clean up both temp and final on failure
      await rm(tempDir, { recursive: true, force: true });
      const agentDir = getAgentDir(agentId);
      await rm(agentDir, { recursive: true, force: true });
      console.error(`Import failed: ${(err as Error).message}`);
      process.exit(1);
    }
  });
