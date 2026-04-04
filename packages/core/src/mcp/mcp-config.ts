import { readFile, writeFile, chmod } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readJsonFile, writeJsonFile } from "../utils/files";
import { acquireLock, releaseLock } from "../utils/file-lock";
import { McpConfigSchema } from "../schemas";
import type { McpConfig, ResolvedMcpResult } from "../types";

// Pattern to match ${VAR_NAME} references
const ENV_REF = /\$\{([^}]+)\}/g;

export async function parseEnvFile(
  filePath: string
): Promise<Record<string, string>> {
  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw err;
  }
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    let trimmed = line.trim();
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) continue;
    // Strip optional "export " prefix
    if (trimmed.startsWith("export ")) {
      trimmed = trimmed.slice(7);
    }
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex);
    let value = trimmed.slice(eqIndex + 1);
    // Strip surrounding quotes (common .env convention)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      // Strip inline comments for unquoted values (# preceded by space)
      const commentIndex = value.indexOf(" #");
      if (commentIndex !== -1) {
        value = value.slice(0, commentIndex);
      }
    }
    result[key] = value;
  }
  return result;
}

export async function saveEnvFile(
  filePath: string,
  env: Record<string, string>
): Promise<void> {
  const lines = Object.entries(env).map(([k, v]) => `${k}=${v}`);
  const content = lines.join("\n") + (lines.length > 0 ? "\n" : "");
  await writeFile(filePath, content, { encoding: "utf-8", mode: 0o600 });
  // Explicitly set permissions to ensure 0600 regardless of umask
  await chmod(filePath, 0o600);
}

export function resolveMcpConfig(
  config: McpConfig,
  env: Record<string, string>
): ResolvedMcpResult {
  const resolvedServers: Record<string, McpConfig["servers"][string]> = {};
  const skipped: ResolvedMcpResult["skipped"] = [];

  for (const [name, server] of Object.entries(config.servers)) {
    if (!server.env) {
      resolvedServers[name] = server;
      continue;
    }

    const missingVars: string[] = [];
    const resolvedEnv: Record<string, string> = {};

    for (const [key, value] of Object.entries(server.env)) {
      const refs = [...value.matchAll(ENV_REF)].map((m) => m[1] as string);
      const missing = refs.filter((ref) => !(ref in env));
      if (missing.length > 0) {
        missingVars.push(...missing);
      } else {
        resolvedEnv[key] = value.replace(
          ENV_REF,
          (_, varName) => env[varName] ?? ""
        );
      }
    }

    if (missingVars.length > 0) {
      skipped.push({ name, missingVars });
    } else {
      resolvedServers[name] = { ...server, env: resolvedEnv };
    }
  }

  return {
    config: { servers: resolvedServers },
    skipped,
  };
}

export async function loadMcpConfig(
  mcpConfigPath: string
): Promise<McpConfig | null> {
  const raw = await readJsonFile<Record<string, unknown>>(mcpConfigPath);
  if (!raw) return null;
  const result = McpConfigSchema.safeParse(raw);
  if (!result.success) {
    console.warn(`Warning: invalid mcp.json. ${result.error.message}`);
    return null;
  }
  return result.data;
}

export async function saveMcpConfig(
  mcpConfigPath: string,
  config: McpConfig
): Promise<void> {
  const lockPath = mcpConfigPath + ".lock";
  const acquired = await acquireLock(lockPath);
  if (!acquired) {
    throw new Error(`Could not acquire lock for ${mcpConfigPath}`);
  }
  try {
    await writeJsonFile(mcpConfigPath, config);
  } finally {
    await releaseLock(lockPath);
  }
}

export async function writeTempMcpConfig(config: McpConfig): Promise<string> {
  const name = `tomomo-mcp-${randomBytes(8).toString("hex")}.json`;
  const filePath = join(tmpdir(), name);
  // Runtimes expect mcpServers key, not servers
  const output = { mcpServers: config.servers };
  const content = JSON.stringify(output, null, 2) + "\n";
  await writeFile(filePath, content, { encoding: "utf-8", mode: 0o600 });
  await chmod(filePath, 0o600);
  return filePath;
}

export async function ensureAgentGitignore(
  gitignorePath: string
): Promise<void> {
  let existing = "";
  try {
    existing = await readFile(gitignorePath, "utf-8");
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }

  // Check if .env is already listed as its own line
  const lines = existing.split("\n");
  const hasEnv = lines.some((line) => line.trim() === ".env");
  if (hasEnv) return;

  const separator = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
  await writeFile(gitignorePath, existing + separator + ".env\n", "utf-8");
}
