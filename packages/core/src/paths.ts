import { join } from "node:path";
import { homedir } from "node:os";

const TOMOMO_DIR = join(homedir(), ".tomomo");

export function getTomomoDir(): string {
  return TOMOMO_DIR;
}

export function getAgentsDir(): string {
  return join(TOMOMO_DIR, "agents");
}

export function getAgentDir(agentId: string): string {
  return join(TOMOMO_DIR, "agents", agentId);
}

export function getConfigPath(): string {
  return join(TOMOMO_DIR, "config.json");
}

export function getUserMdPath(): string {
  return join(TOMOMO_DIR, "user.md");
}

export function getSkillsDir(): string {
  return join(TOMOMO_DIR, "skills");
}

export function getAdaptersDir(): string {
  return join(TOMOMO_DIR, "adapters");
}

export function getLogsDir(): string {
  return join(TOMOMO_DIR, "logs");
}

export function getTmpDir(): string {
  return join(TOMOMO_DIR, "tmp");
}

export function getAgentSoulPath(agentId: string): string {
  return join(getAgentDir(agentId), "soul.md");
}

export function getAgentMemoryPath(agentId: string): string {
  return join(getAgentDir(agentId), "memory.md");
}

export function getAgentConfigPath(agentId: string): string {
  return join(getAgentDir(agentId), "agent.json");
}

export function getAgentSessionsPath(agentId: string): string {
  return join(getAgentDir(agentId), "sessions.json");
}

export function getAgentSkillsDir(agentId: string): string {
  return join(getAgentDir(agentId), "skills");
}

export function getAgentProjectsDir(agentId: string): string {
  return join(getAgentDir(agentId), "projects");
}

export function getProjectDir(agentId: string, projectHash: string): string {
  return join(getAgentProjectsDir(agentId), projectHash);
}

export function getProjectMemoryPath(
  agentId: string,
  projectHash: string
): string {
  return join(getProjectDir(agentId, projectHash), "memory.md");
}

export function getProjectInfoPath(
  agentId: string,
  projectHash: string
): string {
  return join(getProjectDir(agentId, projectHash), "project.json");
}

export function getProjectSessionMemoryPath(
  agentId: string,
  projectHash: string,
  sessionId: string
): string {
  return join(getProjectDir(agentId, projectHash), `session-${sessionId}.md`);
}

export function getAgentSessionMemoryPath(
  agentId: string,
  sessionId: string
): string {
  return join(getAgentDir(agentId), `session-${sessionId}.md`);
}

export function getAgentMcpConfigPath(agentId: string): string {
  return join(getAgentDir(agentId), "mcp.json");
}

export function getAgentEnvPath(agentId: string): string {
  return join(getAgentDir(agentId), ".env");
}

export function getAgentGitignorePath(agentId: string): string {
  return join(getAgentDir(agentId), ".gitignore");
}
