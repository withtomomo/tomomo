import React from "react";
import { Box, Text } from "ink";
import { genCharacter } from "@tomomo/core";
import type { AgentConfig } from "@tomomo/core";

interface AgentListItemProps {
  agent: AgentConfig;
  isSelected: boolean;
}

export function AgentListItem({ agent, isSelected }: AgentListItemProps) {
  const character = genCharacter(agent.seed || agent.id);

  return (
    <Box>
      <Text color={isSelected ? character.color : undefined}>
        {isSelected ? "▸ " : "  "}
      </Text>
      <Text bold={isSelected} color={isSelected ? character.color : undefined}>
        {agent.name}
      </Text>
      <Text dimColor>
        {"  "}
        {agent.description || agent.runtime}
        {"  "}
        {agent.launchCount} launches
      </Text>
    </Box>
  );
}
