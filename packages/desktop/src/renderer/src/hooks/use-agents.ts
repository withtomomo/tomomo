import { useState, useEffect } from "react";
import { useIpcQuery, getStoredValue, setStoredValue } from "@tomomo/ui";
import { ipc } from "../lib/ipc";
import type { AgentConfig } from "@tomomo/core";

export function useAgents() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const { data: agents, refetch: refetchAgents } = useIpcQuery<AgentConfig[]>(
    () => ipc.agents.list()
  );

  // Auto-select: last used agent, or most recent, or first available
  useEffect(() => {
    if (!agents || agents.length === 0 || selectedAgentId) return;

    const lastSelected = getStoredValue<string>("last-agent", "");
    if (lastSelected && agents.some((a) => a.id === lastSelected)) {
      setSelectedAgentId(lastSelected);
      return;
    }

    const sorted = [...agents].sort((a, b) => {
      if (!a.lastUsed) return 1;
      if (!b.lastUsed) return -1;
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    });
    if (sorted[0]) {
      setSelectedAgentId(sorted[0].id);
    }
  }, [agents]);

  // Persist selected agent
  useEffect(() => {
    if (selectedAgentId) {
      setStoredValue("last-agent", selectedAgentId);
    }
  }, [selectedAgentId]);

  return { agents, selectedAgentId, setSelectedAgentId, refetchAgents };
}
