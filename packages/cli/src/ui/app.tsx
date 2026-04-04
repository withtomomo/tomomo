import React from "react";
import { useState, useEffect } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { Home } from "./screens/home";
import { AgentDetailScreen } from "./screens/agent-detail";
import { CreateAgentScreen } from "./screens/create-agent";
import { OnboardingScreen } from "./screens/onboarding";
import { isOnboarded, version } from "@tomomo/core";

type Screen =
  | { name: "loading" }
  | { name: "onboarding" }
  | { name: "home" }
  | { name: "agent-detail"; agentId: string }
  | { name: "create-agent" };

export function App() {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>({ name: "loading" });
  const [homeKey, setHomeKey] = useState(0);

  // Check onboarding status on mount
  useEffect(() => {
    isOnboarded().then((onboarded) => {
      if (onboarded) {
        setScreen({ name: "home" });
      } else {
        setScreen({ name: "onboarding" });
      }
    });
  }, []);

  useInput((input, key) => {
    if (input === "q" && screen.name === "home") {
      exit();
    }
    if (
      key.escape &&
      screen.name !== "home" &&
      screen.name !== "onboarding" &&
      screen.name !== "loading"
    ) {
      setScreen({ name: "home" });
      setHomeKey((k) => k + 1);
    }
  });

  const helpText =
    screen.name === "home"
      ? "↑↓ navigate  enter select  c create  q quit"
      : screen.name === "onboarding" || screen.name === "loading"
        ? ""
        : "esc back";

  return (
    <Box flexDirection="column" width="100%">
      <Box paddingX={1} paddingY={1}>
        <Text bold color="cyan">
          tomomo
        </Text>
        <Text dimColor> v{version}</Text>
      </Box>

      {screen.name === "loading" && (
        <Box paddingX={1}>
          <Text dimColor>Loading...</Text>
        </Box>
      )}

      {screen.name === "onboarding" && (
        <OnboardingScreen
          onComplete={(agentId) => {
            if (agentId) {
              setScreen({ name: "agent-detail", agentId });
            } else {
              setScreen({ name: "home" });
            }
            setHomeKey((k) => k + 1);
          }}
        />
      )}

      {screen.name === "home" && (
        <Home
          key={homeKey}
          onSelectAgent={(agentId) =>
            setScreen({ name: "agent-detail", agentId })
          }
          onCreateAgent={() => setScreen({ name: "create-agent" })}
        />
      )}

      {screen.name === "agent-detail" && (
        <AgentDetailScreen agentId={screen.agentId} />
      )}

      {screen.name === "create-agent" && (
        <CreateAgentScreen
          onDone={() => {
            setScreen({ name: "home" });
            setHomeKey((k) => k + 1);
          }}
          onBack={() => {
            setScreen({ name: "home" });
            setHomeKey((k) => k + 1);
          }}
        />
      )}

      {helpText && (
        <Box paddingX={1} paddingTop={1}>
          <Text dimColor>{helpText}</Text>
        </Box>
      )}
    </Box>
  );
}
