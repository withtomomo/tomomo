// Typed wrapper around window.api for use in React components
export const ipc = {
  agents: {
    list: () => window.api.listAgents(),
    load: (id: string) => window.api.loadAgent(id),
    create: (
      name: string,
      options?: {
        runtime?: string;
        model?: string;
        description?: string;
        seed?: string;
      }
    ) => window.api.createAgent(name, options),
    delete: (id: string) => window.api.deleteAgent(id),
    update: (
      id: string,
      updates: {
        name?: string;
        description?: string;
        runtime?: string;
        model?: string;
        quickCommands?: import("@tomomo/core").QuickCommand[];
      }
    ) => window.api.updateAgent(id, updates),
    export: (id: string) => window.api.exportAgent(id),
    character: (id: string) => window.api.getCharacter(id),
    projects: (id: string) => window.api.getProjects(id),
    memoryFull: (id: string) => window.api.getMemoryFull(id),
    soulRead: (id: string) => window.api.readSoul(id),
    soulWrite: (id: string, content: string) =>
      window.api.writeSoul(id, content),
    projectMemory: (id: string, projectHash: string) =>
      window.api.getProjectMemory(id, projectHash),
    skillsList: (id: string) => window.api.listSkills(id),
    skillRemove: (id: string, skillId: string) =>
      window.api.removeSkill(id, skillId),
    skillAdd: (id: string, sourcePath: string) =>
      window.api.addSkill(id, sourcePath),
    skillInstallUrl: (id: string, source: string) =>
      window.api.installSkillUrl(id, source),
    install: (source: string, name?: string) =>
      window.api.installAgent(source, name),
    getDir: (id: string) => window.api.getAgentDir(id),
  },
  mcp: {
    list: (agentId: string) => window.api.listMcpServers(agentId),
    add: (
      agentId: string,
      name: string,
      server: { command: string; args: string[]; env?: Record<string, string> }
    ) => window.api.addMcpServer(agentId, name, server),
    remove: (agentId: string, name: string) =>
      window.api.removeMcpServer(agentId, name),
    updateEnv: (agentId: string, updates: Record<string, string>) =>
      window.api.updateMcpEnv(agentId, updates),
  },
  runtimes: {
    check: () => window.api.checkRuntimes(),
    installAdapter: (npmPackage: string) =>
      window.api.installAdapter(npmPackage),
  },
  character: {
    preview: (seed: string) => window.api.previewCharacter(seed),
  },
  app: {
    selectDirectory: () => window.api.selectDirectory(),
  },
  terminal: {
    spawn: (
      agentId: string,
      projectDir: string,
      options?: {
        appendPrompt?: string;
        selfChat?: boolean;
        skipPermissions?: boolean;
      }
    ) => window.api.spawnTerminal(agentId, projectDir, options),
    write: (sessionId: string, data: string) =>
      window.api.writeTerminal(sessionId, data),
    resize: (sessionId: string, cols: number, rows: number) =>
      window.api.resizeTerminal(sessionId, cols, rows),
    kill: (sessionId: string) => window.api.killTerminal(sessionId),
    onData: (cb: (sessionId: string, data: string) => void) =>
      window.api.onTerminalData(cb),
    onExit: (cb: (sessionId: string, exitCode: number) => void) =>
      window.api.onTerminalExit(cb),
  },
};
