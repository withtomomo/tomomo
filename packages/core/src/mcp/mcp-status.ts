import { getAgentMcpConfigPath, getAgentEnvPath } from "../paths";
import {
  loadMcpConfig,
  saveMcpConfig,
  parseEnvFile,
  saveEnvFile,
} from "./mcp-config";

export interface McpServerStatus {
  name: string;
  command: string;
  args: string[];
  envKeys: string[];
  status: "ready" | "missing";
  missingVars: string[];
}

const ENV_VAR_PATTERN = /\$\{([^}]+)\}/g;

export async function listMcpServerStatus(
  agentId: string
): Promise<McpServerStatus[]> {
  const config = await loadMcpConfig(getAgentMcpConfigPath(agentId));
  if (!config) return [];

  const env = await parseEnvFile(getAgentEnvPath(agentId));
  const results: McpServerStatus[] = [];

  for (const [name, server] of Object.entries(config.servers)) {
    const envEntries = Object.entries(server.env ?? {});
    const envKeys = envEntries.map(([k]) => k);
    const missingVars: string[] = [];

    for (const [, value] of envEntries) {
      // Reset lastIndex before each scan since the regex has the g flag
      ENV_VAR_PATTERN.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = ENV_VAR_PATTERN.exec(value)) !== null) {
        const varName = match[1] as string;
        if (!(varName in env) && !missingVars.includes(varName)) {
          missingVars.push(varName);
        }
      }
    }

    results.push({
      name,
      command: server.command,
      args: server.args,
      envKeys,
      status: missingVars.length === 0 ? "ready" : "missing",
      missingVars,
    });
  }

  return results;
}

export async function removeMcpServerAndCleanEnv(
  agentId: string,
  name: string
): Promise<void> {
  const mcpConfigPath = getAgentMcpConfigPath(agentId);
  const config = await loadMcpConfig(mcpConfigPath);

  if (!config || !(name in config.servers)) {
    throw new Error(`MCP server "${name}" not found`);
  }

  // Remove the target server and save
  const updatedServers = { ...config.servers };
  delete updatedServers[name];
  await saveMcpConfig(mcpConfigPath, { servers: updatedServers });

  // Collect all ${VAR} references still used by remaining servers
  const stillUsed = new Set<string>();
  for (const server of Object.values(updatedServers)) {
    for (const value of Object.values(server.env ?? {})) {
      ENV_VAR_PATTERN.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = ENV_VAR_PATTERN.exec(value)) !== null) {
        stillUsed.add(match[1] as string);
      }
    }
  }

  // Load .env and remove entries whose vars are no longer referenced
  const envPath = getAgentEnvPath(agentId);
  const env = await parseEnvFile(envPath);
  const filtered: Record<string, string> = {};
  let removed = false;

  for (const [key, value] of Object.entries(env)) {
    if (stillUsed.has(key)) {
      filtered[key] = value;
    } else {
      removed = true;
    }
  }

  if (removed) {
    await saveEnvFile(envPath, filtered);
  }
}
