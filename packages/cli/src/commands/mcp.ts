import { Command } from "commander";
import {
  agentExists,
  getAgentMcpConfigPath,
  getAgentEnvPath,
  getAgentGitignorePath,
  loadMcpConfig,
  saveMcpConfig,
  parseEnvFile,
  saveEnvFile,
  ensureAgentGitignore,
} from "@tomomo/core";
import type { McpConfig } from "@tomomo/core";

// Pattern to find ${VAR_NAME} references in env values
const VAR_PATTERN = /\$\{([^}]+)\}/g;

// Derive a server name from command parts
// ["npx", "-y", "@modelcontextprotocol/server-github"] → "server-github"
function deriveServerName(parts: string[]): string {
  let pkg = "";
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]!;
    if (!part.startsWith("-")) {
      pkg = part;
      break;
    }
  }
  if (!pkg) return "";
  if (pkg.includes("/")) {
    pkg = pkg.split("/").pop()!;
  }
  return pkg.replace(/\.[^.]+$/, "");
}

function getMissingVars(
  serverEnv: Record<string, string>,
  dotenv: Record<string, string>
): string[] {
  const missing: string[] = [];
  for (const value of Object.values(serverEnv)) {
    const refs = [...value.matchAll(VAR_PATTERN)].map((m) => m[1] as string);
    for (const ref of refs) {
      if (!(ref in dotenv) && !missing.includes(ref)) {
        missing.push(ref);
      }
    }
  }
  return missing;
}

async function listMcpServers(agentId: string, json: boolean): Promise<void> {
  const mcpPath = getAgentMcpConfigPath(agentId);
  const envPath = getAgentEnvPath(agentId);

  const config = await loadMcpConfig(mcpPath);
  const dotenv = await parseEnvFile(envPath);

  if (!config || Object.keys(config.servers).length === 0) {
    if (json) {
      console.log(JSON.stringify([], null, 2));
    } else {
      console.log("No MCP servers configured.");
    }
    return;
  }

  if (json) {
    const result = Object.entries(config.servers).map(([name, server]) => {
      const missingVars = server.env ? getMissingVars(server.env, dotenv) : [];
      return {
        name,
        command: server.command,
        args: server.args,
        env: server.env ?? {},
        status:
          missingVars.length > 0
            ? `missing ${missingVars.join(", ")}`
            : "ready",
      };
    });
    console.log(JSON.stringify(result, null, 2));
  } else {
    for (const [name, server] of Object.entries(config.servers)) {
      const missingVars = server.env ? getMissingVars(server.env, dotenv) : [];
      const cmdStr = [server.command, ...server.args].join(" ");
      const status =
        missingVars.length > 0 ? `missing ${missingVars.join(", ")}` : "ready";
      console.log(`  ${name}  ${cmdStr}  [${status}]`);
    }
  }
}

async function addMcpServer(
  agentId: string,
  explicitName: string | undefined,
  commandParts: string[],
  envPairs: string[],
  json: boolean
): Promise<void> {
  if (commandParts.length === 0) {
    console.error(
      "No command provided. Example: tomomo mcp larry add -- npx -y @org/server"
    );
    process.exit(1);
  }
  const name = explicitName || deriveServerName(commandParts);
  if (!name) {
    console.error(
      "Could not derive server name from command. Provide one explicitly: tomomo mcp larry add <name> -- <command...>"
    );
    process.exit(1);
  }
  const cmd = commandParts[0]!;
  const args = commandParts.slice(1);
  const mcpPath = getAgentMcpConfigPath(agentId);
  const envPath = getAgentEnvPath(agentId);
  const gitignorePath = getAgentGitignorePath(agentId);

  const existing = await loadMcpConfig(mcpPath);
  const config: McpConfig = existing ?? { servers: {} };

  if (name in config.servers) {
    console.error(`MCP server "${name}" already exists. Remove it first.`);
    process.exit(1);
  }

  // Parse KEY=VALUE env pairs
  const serverEnv: Record<string, string> = {};
  const dotenv = await parseEnvFile(envPath);

  for (const pair of envPairs) {
    const eqIndex = pair.indexOf("=");
    if (eqIndex === -1) {
      console.error(`Invalid --env pair. Expected KEY=VALUE format.`);
      process.exit(1);
    }
    const key = pair.slice(0, eqIndex);
    const value = pair.slice(eqIndex + 1);
    // Store a ${KEY} reference in mcp.json
    serverEnv[key] = `\${${key}}`;
    // Store actual value in .env
    dotenv[key] = value;
  }

  config.servers[name] = {
    command: cmd,
    args,
    ...(Object.keys(serverEnv).length > 0 ? { env: serverEnv } : {}),
  };

  await saveMcpConfig(mcpPath, config);

  if (Object.keys(dotenv).length > 0) {
    await saveEnvFile(envPath, dotenv);
    await ensureAgentGitignore(gitignorePath);
  }

  if (json) {
    console.log(JSON.stringify({ added: name }, null, 2));
  } else {
    console.log(`MCP server "${name}" added to agent "${agentId}".`);
  }
}

async function removeMcpServer(
  agentId: string,
  name: string,
  json: boolean
): Promise<void> {
  const mcpPath = getAgentMcpConfigPath(agentId);
  const envPath = getAgentEnvPath(agentId);

  const config = await loadMcpConfig(mcpPath);

  if (!config || !(name in config.servers)) {
    console.error(`MCP server "${name}" not found.`);
    process.exit(1);
  }

  delete config.servers[name];
  await saveMcpConfig(mcpPath, config);

  // Collect all ${VAR} refs still used by remaining servers
  const stillUsed = new Set<string>();
  for (const server of Object.values(config.servers)) {
    if (!server.env) continue;
    for (const value of Object.values(server.env)) {
      const refs = [...value.matchAll(VAR_PATTERN)].map((m) => m[1] as string);
      for (const ref of refs) stillUsed.add(ref);
    }
  }

  // Remove env vars that are no longer referenced by any server
  const dotenv = await parseEnvFile(envPath);
  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(dotenv)) {
    if (stillUsed.has(k)) filtered[k] = v;
  }
  if (Object.keys(filtered).length !== Object.keys(dotenv).length) {
    await saveEnvFile(envPath, filtered);
  }

  if (json) {
    console.log(JSON.stringify({ removed: name }, null, 2));
  } else {
    console.log(`MCP server "${name}" removed from agent "${agentId}".`);
  }
}

export const mcpCommand = new Command("mcp")
  .description("Manage MCP servers for an agent")
  .argument("<agent>", "Agent ID")
  .option("--json", "Output as JSON")
  .action(async (agentId, options) => {
    if (!(await agentExists(agentId))) {
      console.error(`Agent "${agentId}" not found.`);
      process.exit(1);
    }
    await listMcpServers(agentId, options.json);
  });

mcpCommand
  .command("list")
  .description("List MCP servers with status")
  .option("--json", "Output as JSON")
  .action(async function (this: Command, options) {
    const agentId = this.parent!.args[0]!;
    if (!(await agentExists(agentId))) {
      console.error(`Agent "${agentId}" not found.`);
      process.exit(1);
    }
    await listMcpServers(agentId, options.json);
  });

mcpCommand
  .command("add")
  .description(
    "Add an MCP server (e.g., tomomo mcp agent add -- npx -y @org/server)"
  )
  .argument("[name]", "Server name (derived from command if omitted)")
  .argument("[command...]", "Command to run the MCP server (after --)")
  .option("--env <pairs...>", "Environment variables in KEY=VALUE format")
  .option("--json", "Output as JSON")
  .action(async function (this: Command, name, commandParts, options) {
    const agentId = this.parent!.parent!.args[0]!;
    if (!(await agentExists(agentId))) {
      console.error(`Agent "${agentId}" not found.`);
      process.exit(1);
    }
    const envPairs: string[] = options.env ?? [];
    await addMcpServer(agentId, name, commandParts, envPairs, options.json);
  });

mcpCommand
  .command("remove")
  .description("Remove an MCP server")
  .argument("<name>", "Server name to remove")
  .option("--json", "Output as JSON")
  .action(async function (this: Command, name, options) {
    const agentId = this.parent!.parent!.args[0]!;
    if (!(await agentExists(agentId))) {
      console.error(`Agent "${agentId}" not found.`);
      process.exit(1);
    }
    await removeMcpServer(agentId, name, options.json);
  });
