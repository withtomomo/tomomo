import { rm, readdir, cp, mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import {
  getAgentsDir,
  getAgentDir,
  getAgentConfigPath,
  getAgentSoulPath,
  getAgentMemoryPath,
  getAgentSessionsPath,
  getAgentSkillsDir,
  getAgentProjectsDir,
  getAgentGitignorePath,
} from "../paths";
import {
  readJsonFile,
  writeJsonFile,
  writeTextFile,
  ensureDir,
  fileExists,
} from "../utils/files";
import { acquireLock, releaseLock } from "../utils/file-lock";
import { type AgentConfig, DEFAULT_AGENT } from "../types";
import { AgentConfigSchema } from "../schemas";
import { migrateAgent, needsMigration } from "./migrations";
import { ensureAgentGitignore } from "../mcp/mcp-config";

const VALID_ID = /^[a-z0-9][a-z0-9-]*$/;

function validateAgentId(id: string): void {
  if (!VALID_ID.test(id)) {
    throw new Error(
      `Invalid agent ID "${id}". Use only lowercase letters, numbers, and hyphens.`
    );
  }
}

export function slugifyName(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/gi, "")
    .toLowerCase()
    .replace(/^-+|-+$/g, "");
}

export async function agentExists(id: string): Promise<boolean> {
  validateAgentId(id);
  return fileExists(getAgentDir(id));
}

export async function createAgent(
  id: string,
  name: string,
  options?: Partial<
    Omit<AgentConfig, "id" | "seed" | "name" | "createdAt" | "lastUsed">
  > & { seed?: string }
): Promise<AgentConfig> {
  validateAgentId(id);
  if (await agentExists(id)) {
    throw new Error(`Agent "${id}" already exists`);
  }

  const { seed: providedSeed, ...restOptions } = options ?? {};
  const now = new Date().toISOString();
  const config: AgentConfig = {
    ...DEFAULT_AGENT,
    ...restOptions,
    id,
    seed: providedSeed || randomBytes(16).toString("hex"),
    name,
    createdAt: now,
    lastUsed: now,
  };

  const agentDir = getAgentDir(id);
  await ensureDir(agentDir);
  await writeJsonFile(getAgentConfigPath(id), config);
  await writeTextFile(getAgentSoulPath(id), `# ${name}\n`);
  await writeTextFile(getAgentMemoryPath(id), "## Summary\n\n## Recent\n");
  await writeJsonFile(getAgentSessionsPath(id), {});
  await ensureDir(getAgentSkillsDir(id));
  await ensureDir(getAgentProjectsDir(id));
  await ensureAgentGitignore(getAgentGitignorePath(id));

  return config;
}

export async function loadAgent(id: string): Promise<AgentConfig | null> {
  validateAgentId(id);
  const raw = await readJsonFile<Record<string, unknown>>(
    getAgentConfigPath(id)
  );
  if (!raw) return null;

  if (needsMigration(raw)) {
    const migrated = migrateAgent(raw);
    await writeJsonFile(getAgentConfigPath(id), migrated);
    const migratedResult = AgentConfigSchema.safeParse(migrated);
    if (!migratedResult.success) {
      console.warn(
        `Warning: agent "${id}" has invalid config after migration. ${migratedResult.error.message}`
      );
      return null;
    }
    return migratedResult.data;
  }

  const result = AgentConfigSchema.safeParse(raw);
  if (!result.success) {
    console.warn(
      `Warning: agent "${id}" has invalid config. ${result.error.message}`
    );
    return null;
  }
  return result.data;
}

export async function saveAgent(config: AgentConfig): Promise<void> {
  const configPath = getAgentConfigPath(config.id);
  const lockPath = configPath + ".lock";
  const acquired = await acquireLock(lockPath);
  if (!acquired) {
    throw new Error(`Could not acquire lock for ${configPath}`);
  }
  try {
    await writeJsonFile(configPath, config);
  } finally {
    await releaseLock(lockPath);
  }
}

export async function listAgents(): Promise<AgentConfig[]> {
  const agentsDir = getAgentsDir();
  if (!(await fileExists(agentsDir))) {
    return [];
  }

  let entries: string[];
  try {
    entries = await readdir(agentsDir);
  } catch {
    return [];
  }

  const configs: AgentConfig[] = [];
  for (const entry of entries) {
    if (!VALID_ID.test(entry)) continue;
    const config = await loadAgent(entry);
    if (config) {
      configs.push(config);
    }
  }
  return configs;
}

export async function deleteAgent(id: string): Promise<void> {
  validateAgentId(id);
  if (!(await agentExists(id))) {
    throw new Error(`Agent "${id}" not found`);
  }
  await rm(getAgentDir(id), { recursive: true, force: true });
}

export async function exportAgent(
  id: string,
  destDir: string
): Promise<string> {
  validateAgentId(id);
  if (!(await agentExists(id))) {
    throw new Error(`Agent "${id}" not found`);
  }

  const agentDir = getAgentDir(id);
  const outputDir = join(destDir, id);

  // Create destination atomically. Throws EEXIST if it already exists.
  try {
    await mkdir(outputDir, { recursive: false });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EEXIST") {
      throw new Error(
        `Destination already exists: ${outputDir}. Remove it first or choose a different location.`
      );
    }
    if (code === "ENOENT") {
      throw new Error(
        `Parent directory does not exist: ${destDir}. Create it first or choose an existing location.`
      );
    }
    throw err;
  }

  // Copy agent contents into the directory we just created
  await cp(agentDir, outputDir, { recursive: true });
  await rm(join(outputDir, "projects"), { recursive: true, force: true });
  await rm(join(outputDir, "sessions.json"), { force: true });

  // Remove session memory files
  const entries = await readdir(outputDir);
  for (const entry of entries) {
    if (entry.startsWith("session-") && entry.endsWith(".md")) {
      await rm(join(outputDir, entry), { force: true });
    }
  }

  // Never export .env (contains secrets)
  await rm(join(outputDir, ".env"), { force: true });

  return outputDir;
}

export async function cloneAgent(
  sourceId: string,
  newId: string,
  newName: string
): Promise<AgentConfig> {
  validateAgentId(sourceId);
  validateAgentId(newId);
  if (!(await agentExists(sourceId))) {
    throw new Error(`Agent "${sourceId}" not found`);
  }
  if (await agentExists(newId)) {
    throw new Error(`Agent "${newId}" already exists`);
  }

  // Load source config before copying so we read from the authoritative location
  const sourceConfig = await loadAgent(sourceId);

  const sourceDir = getAgentDir(sourceId);
  const destDir = getAgentDir(newId);

  await cp(sourceDir, destDir, { recursive: true });

  // Remove projects directory from the clone
  const projectsDir = getAgentProjectsDir(newId);
  await rm(projectsDir, { recursive: true, force: true });
  await ensureDir(projectsDir);

  // Reset sessions
  await writeJsonFile(getAgentSessionsPath(newId), {});

  // Reset agent memory (clone only copies soul + skills, not memories)
  await writeTextFile(getAgentMemoryPath(newId), "## Summary\n\n## Recent\n");

  // Never clone .env (secrets are not portable)
  await rm(join(getAgentDir(newId), ".env"), { force: true });

  // Ensure .gitignore exists on the clone
  await ensureAgentGitignore(getAgentGitignorePath(newId));

  // Reset agent.json with new id/name and timestamps
  const now = new Date().toISOString();
  const newConfig: AgentConfig = {
    ...(sourceConfig ?? { ...DEFAULT_AGENT }),
    id: newId,
    seed: randomBytes(16).toString("hex"),
    name: newName,
    launchCount: 0,
    createdAt: now,
    lastUsed: now,
  };

  await writeJsonFile(getAgentConfigPath(newId), newConfig);
  return newConfig;
}
