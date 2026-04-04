import { randomBytes } from "node:crypto";
import { rm } from "node:fs/promises";
import { loadAgent } from "../agent/agent";
import { getAdapter, isBuiltInAdapter } from "../adapters/loader";
import { assembleContext } from "../memory/context";
import { compactMemoryFile } from "../memory/compaction";
import { loadConfig } from "../agent/config";
import { ensureProject } from "../project/project";
import { storeSession, getLastSession } from "../project/sessions";
import {
  getAgentDir,
  getAgentMemoryPath,
  getProjectMemoryPath,
  getProjectDir,
  getAgentMcpConfigPath,
  getAgentEnvPath,
  getAgentConfigPath,
} from "../paths";
import { mergeSessionMemories } from "../memory/session-memory";
import {
  loadMcpConfig,
  parseEnvFile,
  resolveMcpConfig,
  writeTempMcpConfig,
} from "../mcp/mcp-config";
import { readJsonFile, writeJsonFile } from "../utils/files";
import { acquireLock, releaseLock } from "../utils/file-lock";
import type {
  PrepareLaunchOptions,
  PreparedLaunch,
  AgentConfig,
} from "../types";

export async function prepareLaunch(
  options: PrepareLaunchOptions
): Promise<PreparedLaunch> {
  // 1. Load agent
  const agent = await loadAgent(options.agentId);
  if (!agent) {
    throw new Error(
      `Agent "${options.agentId}" not found. Run 'tomomo list' to see your agents.`
    );
  }

  // 2. Resolve adapter
  const adapter = await getAdapter(agent.runtime);
  if (!adapter) {
    throw new Error(
      `Runtime "${agent.runtime}" not available. Check 'tomomo doctor' for help.`
    );
  }

  // 3. Pre-flight check (with guided install for built-in adapters)
  const check = await adapter.check();
  if (!check.available) {
    const { tryInstallRuntime } = await import("../adapters/runtime-install");
    const installed = await tryInstallRuntime(
      adapter,
      isBuiltInAdapter(agent.runtime)
    );
    if (!installed) {
      throw new Error(
        `Runtime "${agent.runtime}" is not available. More info: ${adapter.install.url}`
      );
    }
  }

  // 4. Resolve project
  let projectHash = "";
  if (!options.skipProject) {
    projectHash = await ensureProject(options.agentId, options.projectDir);
  }

  // 5. Check for resume session
  let resumeSessionId: string | undefined;
  if (options.resume && projectHash) {
    const session = await getLastSession(options.agentId, projectHash);
    if (session) {
      resumeSessionId = session.lastSessionId;
    }
  }

  // 6. Merge previous session memories
  await mergeSessionMemories(
    getAgentMemoryPath(options.agentId),
    getAgentDir(options.agentId)
  );
  if (projectHash) {
    await mergeSessionMemories(
      getProjectMemoryPath(options.agentId, projectHash),
      getProjectDir(options.agentId, projectHash)
    );
  }

  // 7. Pre-launch compaction
  if (adapter.runPrompt) {
    const config = await loadConfig();
    const threshold = config.defaults.compactionThresholdBytes;
    await compactMemoryFile(
      getAgentMemoryPath(options.agentId),
      adapter,
      threshold
    );
    if (projectHash) {
      await compactMemoryFile(
        getProjectMemoryPath(options.agentId, projectHash),
        adapter,
        threshold
      );
    }
  }

  // 8. Assemble context
  const sessionId = randomBytes(4).toString("hex");
  let systemPrompt = await assembleContext({
    agentId: options.agentId,
    projectHash: projectHash || undefined,
    projectPath: options.projectDir,
    agentMemoryBudget: agent.memoryBudget.agentMemoryChars,
    projectMemoryBudget: agent.memoryBudget.projectMemoryChars,
    sessionId,
  });

  // 9. Append prompt
  if (options.appendPrompt) {
    systemPrompt += "\n\n" + options.appendPrompt;
  }

  // 10. Resolve MCP config
  let mcpConfigPath: string | undefined;
  let mcpCleanup: (() => void) | undefined;

  const mcpConfig = await loadMcpConfig(getAgentMcpConfigPath(options.agentId));
  if (mcpConfig && Object.keys(mcpConfig.servers).length > 0) {
    const agentEnv = await parseEnvFile(getAgentEnvPath(options.agentId));
    const resolved = resolveMcpConfig(mcpConfig, agentEnv);

    for (const skip of resolved.skipped) {
      console.log(
        `Skipping "${skip.name}" server: ${skip.missingVars.join(", ")} not set in .env`
      );
    }

    if (Object.keys(resolved.config.servers).length > 0) {
      mcpConfigPath = await writeTempMcpConfig(resolved.config);
      mcpCleanup = () => {
        rm(mcpConfigPath!, { force: true }).catch((err) => {
          console.warn("Failed to clean up temp MCP config:", err);
        });
      };
    }
  }

  // 11. Get spawn config from adapter
  if (!adapter.getSpawnConfig) {
    throw new Error(
      `Adapter "${adapter.name}" does not implement getSpawnConfig.`
    );
  }
  const spawnConfig = await adapter.getSpawnConfig({
    agent,
    systemPrompt,
    agentDir: getAgentDir(options.agentId),
    projectDir: options.projectDir,
    resumeSessionId,
    skipPermissions: options.skipPermissions,
    mcpConfigPath,
  });

  // Chain MCP cleanup with adapter cleanup
  const originalCleanup = spawnConfig.cleanup;
  spawnConfig.cleanup = () => {
    originalCleanup?.();
    mcpCleanup?.();
  };

  const agentId = options.agentId;

  return {
    agent,
    spawnConfig,
    sessionId,
    projectHash,
    async recordExit() {
      // Atomic read-modify-write under file lock
      try {
        const configPath = getAgentConfigPath(agentId);
        const lockPath = configPath + ".lock";
        const acquired = await acquireLock(lockPath);
        if (!acquired) return;
        try {
          const current = await readJsonFile<AgentConfig>(configPath);
          if (current) {
            current.lastUsed = new Date().toISOString();
            current.launchCount++;
            await writeJsonFile(configPath, current);
          }
        } finally {
          await releaseLock(lockPath);
        }
        if (projectHash) {
          await storeSession(agentId, projectHash, sessionId);
        }
      } catch (err) {
        console.warn("recordExit failed (non-fatal):", err);
      }
    },
  };
}
