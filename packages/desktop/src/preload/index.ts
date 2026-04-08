import { contextBridge, ipcRenderer } from "electron";

const api = {
  // Agents
  listAgents: () => ipcRenderer.invoke("agents:list"),
  loadAgent: (id: string) => ipcRenderer.invoke("agents:load", id),
  deleteAgent: (id: string) => ipcRenderer.invoke("agents:delete", id),
  updateAgent: (
    id: string,
    updates: {
      name?: string;
      description?: string;
      runtime?: string;
      model?: string;
      quickCommands?: import("@tomomo/core").QuickCommand[];
    }
  ) => ipcRenderer.invoke("agents:update", id, updates),
  getAgentDir: (id: string) => ipcRenderer.invoke("agents:getDir", id),
  getCharacter: (id: string) => ipcRenderer.invoke("agents:character", id),
  createAgent: (
    name: string,
    options?: {
      runtime?: string;
      model?: string;
      description?: string;
      seed?: string;
    }
  ) => ipcRenderer.invoke("agents:create", name, options),
  previewCharacter: (seed: string) =>
    ipcRenderer.invoke("character:preview", seed),

  // Onboarding intro state
  hasSeenIntro: () => ipcRenderer.invoke("intro:hasSeen"),
  markIntroSeen: () => ipcRenderer.invoke("intro:markSeen"),

  installAgent: (source: string, name?: string) =>
    ipcRenderer.invoke("agents:install", source, name),
  exportAgent: (id: string) => ipcRenderer.invoke("agents:export", id),
  getProjects: (id: string) => ipcRenderer.invoke("agents:projects", id),
  getMemoryFull: (id: string) => ipcRenderer.invoke("agents:memory-full", id),
  readSoul: (id: string) => ipcRenderer.invoke("agents:soul-read", id),
  writeSoul: (id: string, content: string) =>
    ipcRenderer.invoke("agents:soul-write", id, content),
  getProjectMemory: (id: string, projectHash: string) =>
    ipcRenderer.invoke("agents:project-memory", id, projectHash),
  listSkills: (id: string) => ipcRenderer.invoke("agents:skills-list", id),
  removeSkill: (id: string, skillId: string) =>
    ipcRenderer.invoke("agents:skill-remove", id, skillId),
  addSkill: (id: string, sourcePath: string) =>
    ipcRenderer.invoke("agents:skill-add", id, sourcePath),
  installSkillUrl: (id: string, source: string) =>
    ipcRenderer.invoke("agents:skill-install-url", id, source),

  // MCP
  listMcpServers: (agentId: string) => ipcRenderer.invoke("mcp:list", agentId),
  addMcpServer: (
    agentId: string,
    name: string,
    server: { command: string; args: string[]; env?: Record<string, string> }
  ) => ipcRenderer.invoke("mcp:add", agentId, name, server),
  removeMcpServer: (agentId: string, name: string) =>
    ipcRenderer.invoke("mcp:remove", agentId, name),
  updateMcpEnv: (agentId: string, updates: Record<string, string>) =>
    ipcRenderer.invoke("mcp:update-env", agentId, updates),

  // Runtimes
  checkRuntimes: () => ipcRenderer.invoke("runtimes:check"),
  installAdapter: (npmPackage: string) =>
    ipcRenderer.invoke("runtimes:installAdapter", npmPackage),

  // App utilities
  selectDirectory: () => ipcRenderer.invoke("app:select-directory"),

  // Terminal
  spawnTerminal: (
    agentId: string,
    projectDir: string,
    options?: {
      appendPrompt?: string;
      selfChat?: boolean;
      skipPermissions?: boolean;
    }
  ) => ipcRenderer.invoke("terminal:spawn", agentId, projectDir, options),
  writeTerminal: (sessionId: string, data: string) =>
    ipcRenderer.send("terminal:write", sessionId, data),
  resizeTerminal: (sessionId: string, cols: number, rows: number) =>
    ipcRenderer.send("terminal:resize", sessionId, cols, rows),
  killTerminal: (sessionId: string) =>
    ipcRenderer.send("terminal:kill", sessionId),
  onTerminalData: (callback: (sessionId: string, data: string) => void) => {
    const handler = (_event: unknown, sessionId: string, data: string) =>
      callback(sessionId, data);
    ipcRenderer.on("terminal:data", handler);
    return () => ipcRenderer.removeListener("terminal:data", handler);
  },
  onTerminalExit: (callback: (sessionId: string, exitCode: number) => void) => {
    const handler = (_event: unknown, sessionId: string, exitCode: number) =>
      callback(sessionId, exitCode);
    ipcRenderer.on("terminal:exit", handler);
    return () => ipcRenderer.removeListener("terminal:exit", handler);
  },
};

contextBridge.exposeInMainWorld("api", api);
