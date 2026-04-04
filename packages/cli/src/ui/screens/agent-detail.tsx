import React from "react";
import { useState, useEffect } from "react";
import { Box, Text, useApp, useInput } from "ink";
import {
  loadAgent,
  genCharacter,
  renderCharacterToTerminal,
} from "@tomomo/core";
import { launchAgent } from "../../launcher";
import { resolve } from "node:path";
import type { AgentConfig } from "@tomomo/core";

interface AgentDetailProps {
  agentId: string;
}

export function AgentDetailScreen({ agentId }: AgentDetailProps) {
  const { exit } = useApp();
  const [agent, setAgent] = useState<AgentConfig | null>(null);

  useEffect(() => {
    loadAgent(agentId).then(setAgent);
  }, [agentId]);

  useInput((_input, key) => {
    if (!agent) return;

    if (key.return) {
      exit();
      setTimeout(async () => {
        process.stdout.write("\x1B[2J\x1B[H");
        const projectDir = resolve(".");
        try {
          const result = await launchAgent({ agentId, projectDir });
          process.exit(result.exitCode ?? 0);
        } catch (err) {
          console.error((err as Error).message);
          process.exit(1);
        }
      }, 100);
    }
  });

  if (!agent) {
    return (
      <Box paddingX={1}>
        <Text dimColor>Loading...</Text>
      </Box>
    );
  }

  const character = genCharacter(agent.seed || agent.id);
  const rendered = renderCharacterToTerminal(character);

  const charLines = rendered.split("\n");

  return (
    <Box paddingX={1} flexDirection="column">
      <Box>
        <Box flexDirection="column" marginRight={3}>
          {charLines.map((line, i) => (
            <Text key={i}>{line}</Text>
          ))}
        </Box>
        <Box flexDirection="column" justifyContent="center">
          <Text bold color={character.color}>
            {agent.name}
          </Text>
          <Text dimColor>{agent.description || "No description"}</Text>
          <Text dimColor>
            {agent.runtime}
            {agent.model ? `, ${agent.model}` : ""} | {agent.launchCount}{" "}
            launches
          </Text>
          <Box marginTop={1}>
            <Text color="cyan">▸ Launch here</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
