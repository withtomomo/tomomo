import type { z } from "zod";
import type {
  AgentConfigSchema,
  AdapterRegistryEntrySchema,
  GlobalConfigSchema,
  ProjectInfoSchema,
  SessionInfoSchema,
  McpServerConfigSchema,
  McpConfigSchema,
  QuickCommandSchema,
  MemoryBudgetSchema,
} from "./schemas";

// Disk-serialized types inferred from Zod schemas

export type QuickCommand = z.infer<typeof QuickCommandSchema>;
export type MemoryBudget = z.infer<typeof MemoryBudgetSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type AdapterRegistryEntry = z.infer<typeof AdapterRegistryEntrySchema>;
export type GlobalConfig = z.infer<typeof GlobalConfigSchema>;
export type ProjectInfo = z.infer<typeof ProjectInfoSchema>;
export type SessionInfo = z.infer<typeof SessionInfoSchema>;
export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;
export type McpConfig = z.infer<typeof McpConfigSchema>;

// Re-export defaults from schemas so existing imports keep working

export {
  DEFAULT_MEMORY_BUDGET,
  DEFAULT_CONFIG,
  DEFAULT_AGENT,
} from "./schemas";

// Pure runtime interfaces (not serialized to disk)

export interface LaunchContext {
  agent: AgentConfig;
  systemPrompt: string;
  agentDir: string;
  projectDir: string;
  resumeSessionId?: string;
  skipPermissions?: boolean;
  mcpConfigPath?: string;
}

export interface AgentProcess {
  process: import("node:child_process").ChildProcess;
  sessionId?: string;
  onExit(callback: (code: number | null) => void): void;
}

export interface AdapterCheck {
  available: boolean;
  error?: string;
}

export interface AdapterInstall {
  command: string;
  description: string;
  url: string;
}

export interface SpawnConfig {
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  cleanup?(): void;
}

export interface TomomoAdapter {
  name: string;
  install: AdapterInstall;
  compactionModel?: string;
  check(): Promise<AdapterCheck>;
  getSpawnConfig?(ctx: LaunchContext): Promise<SpawnConfig>;
  launch(ctx: LaunchContext): Promise<AgentProcess>;
  runPrompt?(prompt: string, options?: { model?: string }): Promise<string>;
}

export interface CharacterData {
  grid: number[][];
  color: string;
  size: number;
}

export interface MemoryEntry {
  header: string;
  body: string;
  full: string;
}

export interface ParsedMemory {
  summary: string;
  entries: MemoryEntry[];
}

export interface AssembleContextOptions {
  agentId: string;
  projectHash?: string;
  projectPath: string;
  agentMemoryBudget: number;
  projectMemoryBudget: number;
  sessionId?: string;
}

export interface LaunchOptions {
  agentId: string;
  projectDir: string;
  resume?: boolean;
  skipPermissions?: boolean;
}

export interface LaunchResult {
  exitCode: number | null;
}

export interface DiagnosticResult {
  name: string;
  status: "ok" | "warn" | "error";
  message: string;
  installCommand?: string;
  installUrl?: string;
}

export interface CompactionResult {
  compacted: boolean;
  originalSize: number;
  newSize: number;
  error?: string;
}

export interface ResolvedMcpResult {
  config: McpConfig;
  skipped: Array<{ name: string; missingVars: string[] }>;
}

export interface GitHubSource {
  owner: string;
  repo: string;
  path: string;
}

export interface FetchedFile {
  path: string;
  content: string;
}

export interface RuntimeCheckResult {
  name: string;
  available: boolean;
  error?: string;
  adapter: TomomoAdapter | null;
}

export interface RuntimeInfo {
  name: string;
  type: "built-in" | "npm" | "local";
  available: boolean;
  error?: string;
  package?: string;
  install: {
    command: string;
    description: string;
    url: string;
  };
}

export interface PrepareLaunchOptions {
  agentId: string;
  projectDir: string;
  resume?: boolean;
  skipPermissions?: boolean;
  appendPrompt?: string;
  skipProject?: boolean;
}

export interface PreparedLaunch {
  agent: AgentConfig;
  spawnConfig: SpawnConfig;
  sessionId: string;
  projectHash: string;
  recordExit(): Promise<void>;
}
