import { ipcMain, BrowserWindow, dialog } from "electron";
import {
  spawnTerminal,
  nextSessionId,
  writeToTerminal,
  resizeTerminal,
  killTerminal,
  setExitCallback,
} from "./pty-manager";

// Use dynamic import for @tomomo/core (ESM package in CJS Electron main process)
async function getCore() {
  return import("@tomomo/core");
}

// Store per-session exit handlers from prepareLaunch
const sessionExitHandlers = new Map<string, () => Promise<void>>();

export function registerIpcHandlers(): void {
  ipcMain.handle("agents:list", async () => {
    const core = await getCore();
    return core.listAgents();
  });

  ipcMain.handle("agents:load", async (_event, id: string) => {
    const core = await getCore();
    return core.loadAgent(id);
  });

  ipcMain.handle("agents:character", async (_event, id: string) => {
    const core = await getCore();
    const agent = await core.loadAgent(id);
    // Use the agent's unique seed for character generation, fall back to id
    return core.genCharacter(agent?.seed || id);
  });

  ipcMain.handle("agents:getDir", async (_event, agentId: string) => {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(agentId)) {
      throw new Error("Invalid agent ID");
    }
    const core = await getCore();
    return core.getAgentDir(agentId);
  });

  ipcMain.handle(
    "agents:create",
    async (
      _event,
      name: string,
      options?: {
        runtime?: string;
        model?: string;
        description?: string;
        seed?: string;
      }
    ) => {
      const core = await getCore();
      const id = core.slugifyName(name);
      if (await core.agentExists(id)) {
        throw new Error(`Agent "${id}" already exists`);
      }
      return core.createAgent(id, name, options);
    }
  );

  ipcMain.handle("character:preview", async (_event, seed: string) => {
    const core = await getCore();
    return core.genCharacter(seed);
  });

  ipcMain.handle(
    "agents:update",
    async (
      _event,
      id: string,
      updates: {
        name?: string;
        description?: string;
        runtime?: string;
        model?: string;
        quickCommands?: import("@tomomo/core").QuickCommand[];
      }
    ) => {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error("Invalid agent ID");
      const core = await getCore();
      const agent = await core.loadAgent(id);
      if (!agent) throw new Error(`Agent "${id}" not found`);

      if (updates.name !== undefined) agent.name = updates.name;
      if (updates.description !== undefined)
        agent.description = updates.description;
      if (updates.runtime !== undefined) agent.runtime = updates.runtime;
      if (updates.model !== undefined) agent.model = updates.model;
      if (updates.quickCommands !== undefined)
        agent.quickCommands = updates.quickCommands;

      await core.saveAgent(agent);
      return agent;
    }
  );

  ipcMain.handle("agents:delete", async (_event, id: string) => {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
      throw new Error("Invalid agent ID");
    }
    const core = await getCore();
    return core.deleteAgent(id);
  });

  ipcMain.handle("agents:export", async (event, agentId: string) => {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(agentId)) {
      throw new Error("Invalid agent ID");
    }

    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) throw new Error("No window found");

    const result = await dialog.showOpenDialog(win, {
      properties: ["openDirectory", "createDirectory"],
      title: "Export agent to folder",
    });
    if (result.canceled || result.filePaths.length === 0) return null;

    const core = await getCore();
    return core.exportAgent(agentId, result.filePaths[0]!);
  });

  ipcMain.handle("agents:projects", async (_event, agentId: string) => {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(agentId)) return [];
    const core = await getCore();
    const { readdir } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const projectsDir = core.getAgentProjectsDir(agentId);
    try {
      const entries = await readdir(projectsDir, { withFileTypes: true });
      const projects = [];
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const info = await core.readJsonFile<{ path: string; remote?: string }>(
          join(projectsDir, entry.name, "project.json")
        );
        if (info) {
          projects.push({
            hash: entry.name,
            path: info.path,
            remote: info.remote,
          });
        }
      }
      return projects;
    } catch {
      return [];
    }
  });

  ipcMain.handle("agents:memory-full", async (_event, agentId: string) => {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(agentId)) return null;
    const core = await getCore();
    const content = await core.readTextFile(core.getAgentMemoryPath(agentId));
    return content || null;
  });

  ipcMain.handle("agents:soul-read", async (_event, agentId: string) => {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(agentId)) return null;
    const core = await getCore();
    const content = await core.readTextFile(core.getAgentSoulPath(agentId));
    return content || null;
  });

  ipcMain.handle(
    "agents:soul-write",
    async (_event, agentId: string, content: string) => {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(agentId))
        throw new Error("Invalid agent ID");
      const core = await getCore();
      await core.writeTextFile(core.getAgentSoulPath(agentId), content);
    }
  );

  ipcMain.handle(
    "agents:project-memory",
    async (_event, agentId: string, projectHash: string) => {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(agentId)) return null;
      if (!/^[a-f0-9]+$/.test(projectHash)) return null;
      const core = await getCore();
      const content = await core.readTextFile(
        core.getProjectMemoryPath(agentId, projectHash)
      );
      return content || null;
    }
  );

  ipcMain.handle("agents:skills-list", async (_event, agentId: string) => {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(agentId)) return [];
    const core = await getCore();
    return core.listAgentSkills(agentId);
  });

  ipcMain.handle(
    "agents:skill-remove",
    async (_event, agentId: string, skillId: string) => {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(agentId))
        throw new Error("Invalid agent ID");
      if (!/^[a-z0-9][a-z0-9_-]*$/.test(skillId))
        throw new Error("Invalid skill ID");
      const core = await getCore();
      await core.removeAgentSkill(agentId, skillId);
    }
  );

  ipcMain.handle(
    "agents:skill-add",
    async (_event, agentId: string, sourcePath: string) => {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(agentId))
        throw new Error("Invalid agent ID");
      const core = await getCore();
      return core.addAgentSkill(agentId, sourcePath);
    }
  );

  ipcMain.handle(
    "agents:skill-install-url",
    async (_event, agentId: string, source: string) => {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(agentId))
        throw new Error("Invalid agent ID");
      const core = await getCore();
      return core.installSkillFromGitHub(agentId, source);
    }
  );

  // MCP
  ipcMain.handle("mcp:list", async (_event, agentId: string) => {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(agentId)) return [];
    const core = await getCore();
    return core.listMcpServerStatus(agentId);
  });

  ipcMain.handle(
    "mcp:add",
    async (
      _event,
      agentId: string,
      name: string,
      server: { command: string; args: string[]; env?: Record<string, string> }
    ) => {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(agentId))
        throw new Error("Invalid agent ID");
      const core = await getCore();

      const config = (await core.loadMcpConfig(
        core.getAgentMcpConfigPath(agentId)
      )) ?? {
        servers: {},
      };

      const serverConfig: {
        command: string;
        args: string[];
        env?: Record<string, string>;
      } = {
        command: server.command,
        args: server.args,
      };

      if (server.env && Object.keys(server.env).length > 0) {
        const refs: Record<string, string> = {};
        const envUpdates: Record<string, string> = {};
        for (const [key, value] of Object.entries(server.env)) {
          refs[key] = `\${${key}}`;
          envUpdates[key] = value;
        }
        serverConfig.env = refs;

        const existingEnv = await core.parseEnvFile(
          core.getAgentEnvPath(agentId)
        );
        await core.saveEnvFile(core.getAgentEnvPath(agentId), {
          ...existingEnv,
          ...envUpdates,
        });
      }

      config.servers[name] = serverConfig;
      await core.saveMcpConfig(core.getAgentMcpConfigPath(agentId), config);
      await core.ensureAgentGitignore(core.getAgentGitignorePath(agentId));

      return { added: name };
    }
  );

  ipcMain.handle(
    "mcp:remove",
    async (_event, agentId: string, name: string) => {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(agentId))
        throw new Error("Invalid agent ID");
      const core = await getCore();
      await core.removeMcpServerAndCleanEnv(agentId, name);
      return { removed: name };
    }
  );

  ipcMain.handle(
    "mcp:update-env",
    async (_event, agentId: string, updates: Record<string, string>) => {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(agentId))
        throw new Error("Invalid agent ID");
      const core = await getCore();
      const existing = await core.parseEnvFile(core.getAgentEnvPath(agentId));
      await core.saveEnvFile(core.getAgentEnvPath(agentId), {
        ...existing,
        ...updates,
      });
    }
  );

  // Runtimes
  ipcMain.handle("runtimes:check", async () => {
    const core = await getCore();
    return core.listAllRuntimes();
  });

  ipcMain.handle(
    "runtimes:installAdapter",
    async (_event, npmPackage: string) => {
      if (!npmPackage || typeof npmPackage !== "string") {
        throw new Error("Invalid package name");
      }
      const core = await getCore();
      return core.installCommunityAdapter(npmPackage);
    }
  );

  ipcMain.handle(
    "agents:install",
    async (_event, source: string, name?: string) => {
      const core = await getCore();
      const parsed = core.parseGitHubSource(source);
      const files = await core.fetchAgentFiles(parsed);
      const agentJsonFile = files.find(
        (f: { path: string }) => f.path === "agent.json"
      );
      const soulFile = files.find(
        (f: { path: string }) => f.path === "soul.md"
      );
      if (!agentJsonFile || !soulFile) throw new Error("Not a valid agent");

      const remoteConfig = JSON.parse(agentJsonFile.content);
      const agentName = name ?? remoteConfig.name;
      if (!agentName) throw new Error("Agent has no name");

      const agentId = core.slugifyName(agentName);
      if (await core.agentExists(agentId))
        throw new Error(`Agent "${agentId}" already exists`);

      const config = await core.createAgent(agentId, agentName, {
        description: remoteConfig.description,
        runtime: remoteConfig.runtime,
        model: remoteConfig.model,
      });

      await core.writeTextFile(
        core.getAgentSoulPath(agentId),
        soulFile.content
      );

      return config;
    }
  );

  // Directory picker dialog
  ipcMain.handle("app:select-directory", async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      properties: ["openDirectory"],
      title: "Select project directory",
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // Terminal operations
  ipcMain.handle(
    "terminal:spawn",
    async (
      event,
      agentId: string,
      projectDir: string,
      options?: {
        appendPrompt?: string;
        selfChat?: boolean;
        skipPermissions?: boolean;
      }
    ) => {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(agentId)) {
        throw new Error("Invalid agent ID");
      }
      const { stat: statAsync } = await import("node:fs/promises");
      let dirStat;
      try {
        dirStat = await statAsync(projectDir);
      } catch {
        throw new Error("Project directory does not exist");
      }
      if (!dirStat.isDirectory()) {
        throw new Error("Path is not a directory");
      }

      const core = await getCore();
      const prepared = await core.prepareLaunch({
        agentId,
        projectDir,
        appendPrompt: options?.appendPrompt,
        skipPermissions: options?.skipPermissions,
        skipProject: options?.selfChat,
      });
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) throw new Error("No window found");

      // Generate session ID and register exit handler BEFORE spawning
      // so that if the PTY exits immediately, recordExit is already available
      const sessionId = nextSessionId();
      sessionExitHandlers.set(sessionId, prepared.recordExit);

      spawnTerminal(
        sessionId,
        win,
        prepared.spawnConfig.command,
        prepared.spawnConfig.args,
        prepared.spawnConfig.cwd ?? projectDir,
        agentId,
        prepared.projectHash,
        prepared.spawnConfig.env,
        prepared.spawnConfig.cleanup
      );

      return sessionId;
    }
  );

  ipcMain.on("terminal:write", (_event, sessionId: string, data: string) => {
    writeToTerminal(sessionId, data);
  });

  ipcMain.on(
    "terminal:resize",
    (_event, sessionId: string, cols: number, rows: number) => {
      resizeTerminal(sessionId, cols, rows);
    }
  );

  ipcMain.on("terminal:kill", (_event, sessionId: string) => {
    const handler = sessionExitHandlers.get(sessionId);
    if (handler) {
      handler().catch(() => {});
      sessionExitHandlers.delete(sessionId);
    }
    killTerminal(sessionId);
  });

  // Use per-session exit handlers from prepareLaunch
  setExitCallback(async (info) => {
    const handler = sessionExitHandlers.get(info.sessionId);
    if (handler) {
      await handler().catch(() => {});
      sessionExitHandlers.delete(info.sessionId);
    }
  });
}
