import { useState, useEffect, useRef, useCallback } from "react";
import { ipc } from "../lib/ipc";
import type { AgentConfig } from "@tomomo/core";

export function useCharacters(agents: AgentConfig[] | null) {
  const [characters, setCharacters] = useState<
    Record<string, { grid: number[][]; color: string; size: number }>
  >({});
  const loadedIds = useRef(new Set<string>());

  // Load characters for agents not yet loaded
  useEffect(() => {
    if (!agents) return;
    const loadChars = async () => {
      const newChars: Record<
        string,
        { grid: number[][]; color: string; size: number }
      > = {};
      for (const agent of agents) {
        if (!loadedIds.current.has(agent.id)) {
          newChars[agent.id] = await ipc.agents.character(agent.id);
          loadedIds.current.add(agent.id);
        }
      }
      if (Object.keys(newChars).length > 0) {
        setCharacters((prev) => ({ ...prev, ...newChars }));
      }
    };
    loadChars();
  }, [agents]);

  const clearCache = useCallback(() => {
    loadedIds.current.clear();
    setCharacters({});
  }, []);

  return { characters, clearCache };
}
