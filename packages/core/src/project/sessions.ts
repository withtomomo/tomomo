import type { SessionInfo } from "../types";
import { getAgentSessionsPath } from "../paths";
import { readJsonFile, writeJsonFile } from "../utils/files";
import { acquireLock, releaseLock } from "../utils/file-lock";

// Sessions file schema: map from projectHash to SessionInfo
type SessionsMap = Record<string, SessionInfo>;

export async function getLastSession(
  agentId: string,
  projectHash: string
): Promise<SessionInfo | null> {
  const sessionsPath = getAgentSessionsPath(agentId);
  const sessions = await readJsonFile<SessionsMap>(sessionsPath);
  if (!sessions) return null;
  return sessions[projectHash] ?? null;
}

export async function storeSession(
  agentId: string,
  projectHash: string,
  sessionId: string
): Promise<void> {
  const sessionsPath = getAgentSessionsPath(agentId);
  const lockPath = sessionsPath + ".lock";
  const acquired = await acquireLock(lockPath);
  if (!acquired) {
    throw new Error(`Could not acquire lock for ${sessionsPath}`);
  }
  try {
    const existing = await readJsonFile<SessionsMap>(sessionsPath);
    const sessions: SessionsMap = existing ?? {};
    sessions[projectHash] = {
      lastSessionId: sessionId,
      lastUsed: new Date().toISOString(),
    };
    await writeJsonFile(sessionsPath, sessions);
  } finally {
    await releaseLock(lockPath);
  }
}
