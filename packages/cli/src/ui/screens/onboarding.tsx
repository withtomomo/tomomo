import React from "react";
import { useState, useEffect, useRef } from "react";
import { Box, Text, useInput } from "ink";
import {
  runOnboarding,
  checkRuntimes,
  genCharacter,
  renderCharacterToTerminal,
  createAgent,
  slugifyName,
  agentExists,
  generateAgentName,
} from "@tomomo/core";
import type { RuntimeCheckResult, CharacterData } from "@tomomo/core";

interface OnboardingProps {
  onComplete: (agentId?: string) => void;
}

interface CharacterOption {
  seed: string;
  character: CharacterData;
}

type Step = "init" | "runtimes" | "pick" | "name" | "creating" | "done";

function TextInputField({
  placeholder,
  initialValue = "",
  onSubmit,
}: {
  placeholder: string;
  initialValue?: string;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  useInput((input, key) => {
    if (key.return) {
      onSubmit(value);
      return;
    }
    if (key.backspace || key.delete) {
      setValue((v) => v.slice(0, -1));
      return;
    }
    if (input && !key.ctrl && !key.meta) {
      setValue((v) => v + input);
    }
  });

  return (
    <Text>
      {value || <Text dimColor>{placeholder}</Text>}
      <Text color="cyan">█</Text>
    </Text>
  );
}

export function OnboardingScreen({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>("init");
  const [runtimes, setRuntimes] = useState<RuntimeCheckResult[]>([]);
  const [options, setOptions] = useState<CharacterOption[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(1);
  const [chosenOption, setChosenOption] = useState<CharacterOption | null>(
    null
  );
  const [error, setError] = useState("");
  const completed = useRef(false);

  function finish(agentId?: string) {
    if (completed.current) return;
    completed.current = true;
    onComplete(agentId);
  }

  // Step 1: Initialize dirs + check runtimes
  useEffect(() => {
    async function init() {
      try {
        await runOnboarding();
        const results = await checkRuntimes();
        setRuntimes(results);

        // Generate 3 starter characters whose natural seed-derived colors
        // are all distinct, so the three cards never share a color and
        // the color the user sees matches the color the agent will have
        // after creation. Three unique colors out of the 8-color palette
        // is trivially fast; the attempt cap is just a safety net.
        const chars: CharacterOption[] = [];
        const usedColors = new Set<string>();
        for (let attempts = 0; attempts < 200 && chars.length < 3; attempts++) {
          const seed = crypto.randomUUID();
          const character = genCharacter(seed);
          if (usedColors.has(character.color)) continue;
          usedColors.add(character.color);
          chars.push({ seed, character });
        }
        setOptions(chars);
        setStep("runtimes");
      } catch (err) {
        setError((err as Error).message);
        setStep("done");
      }
    }
    init();
  }, []);

  // Auto-advance from runtimes to pick after a delay
  useEffect(() => {
    if (step !== "runtimes") return;
    const timer = setTimeout(() => setStep("pick"), 1500);
    return () => clearTimeout(timer);
  }, [step]);

  useInput((_input, key) => {
    if (step === "pick" && options.length > 0) {
      if (key.leftArrow) {
        setSelectedIndex((i) => (i > 0 ? i - 1 : options.length - 1));
      }
      if (key.rightArrow) {
        setSelectedIndex((i) => (i < options.length - 1 ? i + 1 : 0));
      }
      if (key.return) {
        setChosenOption(options[selectedIndex]!);
        setStep("name");
      }
    }

    if (step === "done" && key.return) {
      finish();
    }
  });

  async function handleNameSubmit(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Name cannot be empty");
      return;
    }

    const id = slugifyName(trimmed);
    if (await agentExists(id)) {
      setError(`Agent "${id}" already exists`);
      return;
    }

    if (!chosenOption) return;

    setStep("creating");
    setError("");
    try {
      await createAgent(id, trimmed, { seed: chosenOption.seed });
      setStep("done");
      setTimeout(() => finish(id), 1500);
    } catch (err) {
      setError((err as Error).message);
      setStep("name");
    }
  }

  if (step === "init") {
    return (
      <Box paddingX={1} flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>Welcome to Tomomo!</Text>
        </Box>
        <Text dimColor>Setting up...</Text>
      </Box>
    );
  }

  if (step === "runtimes") {
    return (
      <Box paddingX={1} flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>Welcome to Tomomo!</Text>
        </Box>
        <Text dimColor>Runtimes:</Text>
        {runtimes.map((rt) => (
          <Text key={rt.name}>
            {"  "}
            <Text color={rt.available ? "green" : "red"}>
              {rt.available ? "+" : "x"}
            </Text>{" "}
            {rt.name}
            {!rt.available && rt.error ? (
              <Text dimColor> ({rt.error})</Text>
            ) : null}
          </Text>
        ))}
      </Box>
    );
  }

  if (step === "pick") {
    return (
      <Box paddingX={1} flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>Choose your starter</Text>
        </Box>
        <Text dimColor>Pick your first team member</Text>
        <Box marginTop={1} gap={2}>
          {options.map((opt, i) => {
            const isSelected = i === selectedIndex;
            return (
              <Box key={opt.seed} flexDirection="column" alignItems="center">
                <Text color={isSelected ? opt.character.color : undefined}>
                  {renderCharacterToTerminal(opt.character)}
                </Text>
                <Text color={isSelected ? opt.character.color : "gray"}>
                  {isSelected ? "▲" : "·"}
                </Text>
              </Box>
            );
          })}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>← → navigate enter select</Text>
        </Box>
      </Box>
    );
  }

  if (step === "name") {
    const char = chosenOption!.character;
    return (
      <Box paddingX={1} flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>Name your agent</Text>
        </Box>
        <Text color={char.color}>{renderCharacterToTerminal(char)}</Text>
        <Box marginTop={1}>
          <Text>Name: </Text>
          <TextInputField
            initialValue={generateAgentName(chosenOption!.seed)}
            placeholder="e.g. WebDev, Reviewer, Writer..."
            onSubmit={handleNameSubmit}
          />
        </Box>
        {error && <Text color="red">{error}</Text>}
        <Text dimColor>You can shape its personality in your first chat</Text>
      </Box>
    );
  }

  if (step === "creating") {
    return (
      <Box paddingX={1} flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>Welcome to Tomomo!</Text>
        </Box>
        <Text>Creating agent...</Text>
      </Box>
    );
  }

  // done
  return (
    <Box paddingX={1} flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Welcome to Tomomo!</Text>
      </Box>
      {error ? <Text color="yellow">{error}</Text> : null}
      {!error ? (
        <Text color="green">
          {"Agent created! Run 'tomomo launch' to get started."}
        </Text>
      ) : null}
    </Box>
  );
}
