import { useState, useEffect, useRef, useCallback } from "react";
import { disposeTerminal } from "@tomomo/ui";
import type { TerminalSession } from "@tomomo/ui";
import { ipc } from "../lib/ipc";
import type { AgentConfig } from "@tomomo/core";

export function useSessions(
  agents: AgentConfig[] | null,
  characters: Record<string, { grid: number[][]; color: string; size: number }>
) {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);

  // Track sessions that were manually closed so the auto-exit timer skips them
  const manuallyClosedRef = useRef(new Set<string>());

  // Auto-remove sessions that exit naturally
  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const cleanup = ipc.terminal.onExit((sessionId, _exitCode) => {
      if (manuallyClosedRef.current.has(sessionId)) {
        manuallyClosedRef.current.delete(sessionId);
        return;
      }
      const tid = setTimeout(() => {
        disposeTerminal(sessionId);
        setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
        timers.delete(sessionId);
      }, 3000);
      timers.set(sessionId, tid);
    });
    return () => {
      cleanup();
      for (const tid of timers.values()) clearTimeout(tid);
    };
  }, []);

  const createSession = useCallback(
    async (
      agentId: string,
      projectDir: string,
      options?: { skipPermissions?: boolean }
    ) => {
      const sessionId = await ipc.terminal.spawn(agentId, projectDir, {
        skipPermissions: options?.skipPermissions,
      });
      const agent = agents?.find((a) => a.id === agentId);
      const char = characters[agentId];
      setSessions((prev) => [
        ...prev,
        {
          sessionId,
          agentId,
          agentName: agent?.name || agentId,
          agentColor: char?.color || "#888",
          agentRuntime: agent?.runtime || "claude-code",
          character: char || null,
          projectDir,
          skipPermissions: options?.skipPermissions,
        },
      ]);
    },
    [agents, characters]
  );

  const closeSession = useCallback((sessionId: string) => {
    manuallyClosedRef.current.add(sessionId);
    ipc.terminal.kill(sessionId);
    disposeTerminal(sessionId);
    setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
  }, []);

  const reorderSessions = useCallback((fromIndex: number, toIndex: number) => {
    setSessions((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.length) return prev;
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return prev;
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  return { sessions, createSession, closeSession, reorderSessions };
}
