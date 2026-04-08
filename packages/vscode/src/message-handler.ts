import type * as vscode from "vscode";
import type { RequestMessage, ResponseMessage } from "./shared/messages";
import {
  spawnTerminal,
  nextSessionId,
  writeToTerminal,
  resizeTerminal,
  killTerminal,
} from "./pty-manager";
import { getCore } from "./cli";
import { log, logError } from "./log";

type Handler = (
  args: unknown[],
  context: vscode.ExtensionContext
) => Promise<unknown>;

const AGENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

function requireArg<T>(args: unknown[], index: number, name: string): T {
  if (index >= args.length || args[index] === undefined) {
    throw new Error(`Missing required argument: ${name}`);
  }
  return args[index] as T;
}

const sessionExitHandlers = new Map<string, () => Promise<void>>();

const handlers: Record<string, Handler> = {
  "agents.list": async () => {
    const core = await getCore();
    return core.listAgents();
  },

  "agents.load": async (args) => {
    const core = await getCore();
    const id = requireArg<string>(args, 0, "id");
    if (!AGENT_ID_PATTERN.test(id)) throw new Error("Invalid agent ID");
    return core.loadAgent(id);
  },

  "agents.character": async (args) => {
    const core = await getCore();
    const id = requireArg<string>(args, 0, "id");
    if (!AGENT_ID_PATTERN.test(id)) throw new Error("Invalid agent ID");
    const agent = await core.loadAgent(id);
    // Use the agent's unique seed for character generation, fall back to id
    return core.genCharacter(agent?.seed || id);
  },

  "agents.getDir": async (args) => {
    const core = await getCore();
    const agentId = requireArg<string>(args, 0, "agentId");
    if (!AGENT_ID_PATTERN.test(agentId)) {
      throw new Error("Invalid agent ID");
    }
    return core.getAgentDir(agentId);
  },

  "agents.create": async (args) => {
    const core = await getCore();
    const name = requireArg<string>(args, 0, "name");
    const options = args[1] as
      | {
          runtime?: string;
          model?: string;
          description?: string;
          seed?: string;
        }
      | undefined;
    const id = core.slugifyName(name);
    if (await core.agentExists(id)) {
      throw new Error(`Agent "${id}" already exists`);
    }
    return core.createAgent(id, name, options);
  },

  "character.preview": async (args) => {
    const core = await getCore();
    const seed = requireArg<string>(args, 0, "seed");
    return core.genCharacter(seed);
  },

  "intro.hasSeen": async () => {
    const core = await getCore();
    return core.hasSeenIntro();
  },

  "intro.markSeen": async () => {
    const core = await getCore();
    await core.markIntroComplete();
  },

  "agents.update": async (args) => {
    const core = await getCore();
    const id = requireArg<string>(args, 0, "id");
    const updates = requireArg<{
      name?: string;
      description?: string;
      runtime?: string;
      model?: string;
      quickCommands?: import("@tomomo/core").QuickCommand[];
    }>(args, 1, "updates");
    if (!AGENT_ID_PATTERN.test(id)) throw new Error("Invalid agent ID");
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
  },

  "agents.delete": async (args) => {
    const core = await getCore();
    const id = requireArg<string>(args, 0, "id");
    if (!AGENT_ID_PATTERN.test(id)) {
      throw new Error("Invalid agent ID");
    }
    return core.deleteAgent(id);
  },

  "agents.export": async (args) => {
    const core = await getCore();
    const agentId = requireArg<string>(args, 0, "agentId");
    if (!AGENT_ID_PATTERN.test(agentId)) {
      throw new Error("Invalid agent ID");
    }

    const vscodeApi = await import("vscode");
    const result = await vscodeApi.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      openLabel: "Export agent to folder",
    });
    if (!result || result.length === 0) return null;
    return core.exportAgent(agentId, result[0]!.fsPath);
  },

  "agents.projects": async (args) => {
    const core = await getCore();
    const agentId = requireArg<string>(args, 0, "agentId");
    if (!AGENT_ID_PATTERN.test(agentId)) return [];
    const { readdir } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const projectsDir = core.getAgentProjectsDir(agentId);
    try {
      const entries = await readdir(projectsDir, { withFileTypes: true });
      const projects = [];
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const info = (await core.readJsonFile(
          join(projectsDir, entry.name, "project.json")
        )) as { path?: string; remote?: string } | null;
        if (info?.path) {
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
  },

  "agents.memory-full": async (args) => {
    const core = await getCore();
    const agentId = requireArg<string>(args, 0, "agentId");
    if (!AGENT_ID_PATTERN.test(agentId)) return null;
    const content = await core.readTextFile(core.getAgentMemoryPath(agentId));
    return content || null;
  },

  "agents.soul-read": async (args) => {
    const core = await getCore();
    const agentId = requireArg<string>(args, 0, "agentId");
    if (!AGENT_ID_PATTERN.test(agentId)) return null;
    const content = await core.readTextFile(core.getAgentSoulPath(agentId));
    return content || null;
  },

  "agents.soul-write": async (args) => {
    const core = await getCore();
    const agentId = requireArg<string>(args, 0, "agentId");
    const content = requireArg<string>(args, 1, "content");
    if (!AGENT_ID_PATTERN.test(agentId)) throw new Error("Invalid agent ID");
    await core.writeTextFile(core.getAgentSoulPath(agentId), content);
  },

  "agents.project-memory": async (args) => {
    const core = await getCore();
    const agentId = requireArg<string>(args, 0, "agentId");
    const projectHash = requireArg<string>(args, 1, "projectHash");
    if (!AGENT_ID_PATTERN.test(agentId)) return null;
    if (!/^[a-f0-9]+$/.test(projectHash)) return null;
    const content = await core.readTextFile(
      core.getProjectMemoryPath(agentId, projectHash)
    );
    return content || null;
  },

  "agents.skills-list": async (args) => {
    const core = await getCore();
    const agentId = requireArg<string>(args, 0, "agentId");
    if (!AGENT_ID_PATTERN.test(agentId)) return [];
    return core.listAgentSkills(agentId);
  },

  "agents.skill-remove": async (args) => {
    const core = await getCore();
    const agentId = requireArg<string>(args, 0, "agentId");
    const skillId = requireArg<string>(args, 1, "skillId");
    if (!AGENT_ID_PATTERN.test(agentId)) throw new Error("Invalid agent ID");
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(skillId))
      throw new Error("Invalid skill ID");
    await core.removeAgentSkill(agentId, skillId);
  },

  "agents.skill-add": async (args) => {
    const core = await getCore();
    const agentId = requireArg<string>(args, 0, "agentId");
    const sourcePath = requireArg<string>(args, 1, "sourcePath");
    if (!AGENT_ID_PATTERN.test(agentId)) throw new Error("Invalid agent ID");
    return core.addAgentSkill(agentId, sourcePath);
  },

  "agents.skill-install-url": async (args) => {
    const core = await getCore();
    const agentId = requireArg<string>(args, 0, "agentId");
    const source = requireArg<string>(args, 1, "source");
    if (!AGENT_ID_PATTERN.test(agentId)) throw new Error("Invalid agent ID");
    return core.installSkillFromGitHub(agentId, source);
  },

  // MCP
  "mcp.list": async (args) => {
    const core = await getCore();
    const agentId = requireArg<string>(args, 0, "agentId");
    if (!AGENT_ID_PATTERN.test(agentId)) return [];
    return core.listMcpServerStatus(agentId);
  },

  "mcp.add": async (args) => {
    const core = await getCore();
    const agentId = requireArg<string>(args, 0, "agentId");
    const name = requireArg<string>(args, 1, "name");
    const server = requireArg<{
      command: string;
      args: string[];
      env?: Record<string, string>;
    }>(args, 2, "server");
    if (!AGENT_ID_PATTERN.test(agentId)) throw new Error("Invalid agent ID");
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
  },

  "mcp.remove": async (args) => {
    const core = await getCore();
    const agentId = requireArg<string>(args, 0, "agentId");
    const name = requireArg<string>(args, 1, "name");
    if (!AGENT_ID_PATTERN.test(agentId)) throw new Error("Invalid agent ID");
    await core.removeMcpServerAndCleanEnv(agentId, name);
    return { removed: name };
  },

  "mcp.update-env": async (args) => {
    const core = await getCore();
    const agentId = requireArg<string>(args, 0, "agentId");
    const updates = requireArg<Record<string, string>>(args, 1, "updates");
    if (!AGENT_ID_PATTERN.test(agentId)) throw new Error("Invalid agent ID");
    const existing = await core.parseEnvFile(core.getAgentEnvPath(agentId));
    await core.saveEnvFile(core.getAgentEnvPath(agentId), {
      ...existing,
      ...updates,
    });
  },

  // Runtimes
  "runtimes.check": async () => {
    const core = await getCore();
    return core.listAllRuntimes();
  },

  "runtimes.installAdapter": async (args) => {
    const core = await getCore();
    const npmPackage = requireArg<string>(args, 0, "npmPackage");
    if (typeof npmPackage !== "string" || !npmPackage) {
      throw new Error("Invalid package name");
    }
    return core.installCommunityAdapter(npmPackage);
  },

  "agents.install": async (args) => {
    const core = await getCore();
    const source = requireArg<string>(args, 0, "source");
    const name = args[1] as string | undefined;
    const parsed = core.parseGitHubSource(source);
    const files = await core.fetchAgentFiles(parsed);
    const agentJsonFile = files.find(
      (f: { path: string }) => f.path === "agent.json"
    );
    const soulFile = files.find((f: { path: string }) => f.path === "soul.md");
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

    await core.writeTextFile(core.getAgentSoulPath(agentId), soulFile.content);

    return config;
  },

  // Directory picker (VS Code version)
  "app.selectDirectory": async () => {
    const vscodeApi = await import("vscode");
    const folders = vscodeApi.workspace.workspaceFolders;

    // If exactly one workspace folder, return it directly
    if (folders && folders.length === 1) {
      return folders[0]!.uri.fsPath;
    }

    // If multiple workspace folders, show quick pick
    if (folders && folders.length > 1) {
      const items = folders.map((f) => ({
        label: f.name,
        detail: f.uri.fsPath,
      }));
      const picked = await vscodeApi.window.showQuickPick(items, {
        placeHolder: "Select project directory",
      });
      if (!picked) return null;
      return picked.detail;
    }

    // No workspace folders, show open dialog
    const result = await vscodeApi.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      openLabel: "Select project directory",
    });
    if (!result || result.length === 0) return null;
    return result[0]!.fsPath;
  },

  // VS Code specific: get workspace folders
  "app.getWorkspaceFolders": async () => {
    const vscodeApi = await import("vscode");
    const folders = vscodeApi.workspace.workspaceFolders;
    if (!folders) return [];
    return folders.map((f) => ({ name: f.name, path: f.uri.fsPath }));
  },

  // Terminal operations
  "terminal.spawn": async (args) => {
    const core = await getCore();
    const agentId = requireArg<string>(args, 0, "agentId");
    const projectDir = requireArg<string>(args, 1, "projectDir");
    const options = args[2] as
      | {
          appendPrompt?: string;
          selfChat?: boolean;
          skipPermissions?: boolean;
        }
      | undefined;

    if (!AGENT_ID_PATTERN.test(agentId)) {
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

    const prepared = await core.prepareLaunch({
      agentId,
      projectDir,
      appendPrompt: options?.appendPrompt,
      skipPermissions: options?.skipPermissions,
      skipProject: options?.selfChat,
    });

    // Generate session ID and register exit handler BEFORE spawning
    // so that if the PTY exits immediately, recordExit is already available
    const sessionId = nextSessionId();
    sessionExitHandlers.set(sessionId, prepared.recordExit);

    spawnTerminal(
      sessionId,
      prepared.spawnConfig.command,
      prepared.spawnConfig.args,
      prepared.spawnConfig.cwd ?? projectDir,
      agentId,
      prepared.projectHash,
      prepared.spawnConfig.env,
      prepared.spawnConfig.cleanup
    );

    return sessionId;
  },

  "terminal.write": async (args) => {
    const sessionId = requireArg<string>(args, 0, "sessionId");
    const data = requireArg<string>(args, 1, "data");
    writeToTerminal(sessionId, data);
  },

  "terminal.resize": async (args) => {
    const sessionId = requireArg<string>(args, 0, "sessionId");
    const cols = requireArg<number>(args, 1, "cols");
    const rows = requireArg<number>(args, 2, "rows");
    resizeTerminal(sessionId, cols, rows);
  },

  "terminal.kill": async (args) => {
    const sessionId = requireArg<string>(args, 0, "sessionId");
    const handler = sessionExitHandlers.get(sessionId);
    if (handler) {
      try {
        await handler();
      } catch (err) {
        logError("recordExit failed for session:", sessionId, err);
      }
      sessionExitHandlers.delete(sessionId);
    }
    killTerminal(sessionId);
  },
};

export function getSessionExitHandler(
  sessionId: string
): (() => Promise<void>) | undefined {
  const handler = sessionExitHandlers.get(sessionId);
  if (handler) {
    sessionExitHandlers.delete(sessionId);
  }
  return handler;
}

export function handleMessage(
  message: unknown,
  webview: vscode.Webview,
  context: vscode.ExtensionContext
): void {
  const msg = message as RequestMessage;
  if (msg.type !== "request" || !msg.id || !msg.method) return;

  const handler = handlers[msg.method];
  if (!handler) {
    const response: ResponseMessage = {
      id: msg.id,
      type: "response",
      error: `Unknown method: ${msg.method}`,
    };
    webview.postMessage(response);
    return;
  }

  log("Handling:", msg.method);
  handler(msg.args, context)
    .then((result) => {
      const response: ResponseMessage = {
        id: msg.id,
        type: "response",
        result,
      };
      webview.postMessage(response);
    })
    .catch((err: unknown) => {
      logError("Handler error:", msg.method, err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      const response: ResponseMessage = {
        id: msg.id,
        type: "response",
        error: errorMessage,
      };
      webview.postMessage(response);
    });
}
