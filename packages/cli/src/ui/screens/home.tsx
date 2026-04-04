import React from "react";
import { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { listAgents } from "@tomomo/core";
import { AgentListItem } from "../components/agent-list-item";
import type { AgentConfig } from "@tomomo/core";

interface HomeProps {
  onSelectAgent: (agentId: string) => void;
  onCreateAgent: () => void;
}

export function Home({ onSelectAgent, onCreateAgent }: HomeProps) {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAgents().then((list) => {
      setAgents(list);
      setLoading(false);
    });
  }, []);

  useInput((input, key) => {
    if (loading || agents.length === 0) {
      if (input === "c") onCreateAgent();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    }
    if (key.downArrow) {
      setSelectedIndex((i) => Math.min(agents.length - 1, i + 1));
    }
    if (key.return && agents.length > 0) {
      const agent = agents[selectedIndex];
      if (agent) onSelectAgent(agent.id);
    }
    if (input === "c") {
      onCreateAgent();
    }
  });

  if (loading) {
    return (
      <Box paddingX={1}>
        <Text dimColor>Loading agents...</Text>
      </Box>
    );
  }

  if (agents.length === 0) {
    return (
      <Box paddingX={1} flexDirection="column" gap={1}>
        <Text>No agents yet.</Text>
        <Text dimColor>Press c to create your first agent.</Text>
      </Box>
    );
  }

  return (
    <Box paddingX={1} flexDirection="column">
      <Box marginBottom={1}>
        <Text dimColor>
          Your team ({agents.length} agent{agents.length === 1 ? "" : "s"})
        </Text>
      </Box>
      {agents.map((agent, i) => (
        <AgentListItem
          key={agent.id}
          agent={agent}
          isSelected={i === selectedIndex}
        />
      ))}
    </Box>
  );
}
