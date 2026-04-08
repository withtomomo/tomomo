import type {
  AgentConfig,
  CharacterData,
  QuickCommand,
  RuntimeInfo,
} from "@tomomo/core";

interface TomomoApi {
  listAgents(): Promise<AgentConfig[]>;
  loadAgent(id: string): Promise<AgentConfig | null>;
  deleteAgent(id: string): Promise<void>;
  updateAgent(
    id: string,
    updates: {
      name?: string;
      description?: string;
      runtime?: string;
      model?: string;
      quickCommands?: QuickCommand[];
    }
  ): Promise<AgentConfig>;
  createAgent(
    name: string,
    options?: {
      runtime?: string;
      model?: string;
      description?: string;
      seed?: string;
    }
  ): Promise<AgentConfig>;
  previewCharacter(seed: string): Promise<CharacterData>;

  // Onboarding intro state
  hasSeenIntro(): Promise<boolean>;
  markIntroSeen(): Promise<void>;

  installAgent(source: string, name?: string): Promise<AgentConfig>;
  exportAgent(id: string): Promise<string | null>;
  getAgentDir(id: string): Promise<string>;
  getCharacter(id: string): Promise<CharacterData>;
  getProjects(
    id: string
  ): Promise<Array<{ hash: string; path: string; remote?: string }>>;
  getMemoryFull(id: string): Promise<string | null>;
  readSoul(id: string): Promise<string | null>;
  writeSoul(id: string, content: string): Promise<void>;
  getProjectMemory(id: string, projectHash: string): Promise<string | null>;
  listSkills(
    id: string
  ): Promise<
    Array<{ id: string; name: string; description: string; content: string }>
  >;
  removeSkill(id: string, skillId: string): Promise<void>;
  addSkill(
    id: string,
    sourcePath: string
  ): Promise<{ id: string; name: string }>;
  installSkillUrl(
    id: string,
    source: string
  ): Promise<{ id: string; name: string }>;

  // MCP
  listMcpServers(agentId: string): Promise<
    Array<{
      name: string;
      command: string;
      args: string[];
      envKeys: string[];
      status: "ready" | "missing";
      missingVars: string[];
    }>
  >;
  addMcpServer(
    agentId: string,
    name: string,
    server: { command: string; args: string[]; env?: Record<string, string> }
  ): Promise<{ added: string }>;
  removeMcpServer(agentId: string, name: string): Promise<{ removed: string }>;
  updateMcpEnv(agentId: string, updates: Record<string, string>): Promise<void>;

  // Runtimes
  checkRuntimes(): Promise<RuntimeInfo[]>;
  installAdapter(npmPackage: string): Promise<{ name: string }>;

  // App utilities
  selectDirectory(): Promise<string | null>;

  // Terminal
  spawnTerminal(
    agentId: string,
    projectDir: string,
    options?: {
      appendPrompt?: string;
      selfChat?: boolean;
      skipPermissions?: boolean;
    }
  ): Promise<string>;
  writeTerminal(sessionId: string, data: string): void;
  resizeTerminal(sessionId: string, cols: number, rows: number): void;
  killTerminal(sessionId: string): void;
  onTerminalData(
    callback: (sessionId: string, data: string) => void
  ): () => void;
  onTerminalExit(
    callback: (sessionId: string, exitCode: number) => void
  ): () => void;
}

declare global {
  interface Window {
    api: TomomoApi;
  }
}
