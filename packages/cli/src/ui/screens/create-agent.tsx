import React from "react";
import { useState } from "react";
import { randomUUID } from "node:crypto";
import { Box, Text, useInput } from "ink";
import {
  createAgent,
  slugifyName,
  agentExists,
  genCharacter,
  renderCharacterToTerminal,
} from "@tomomo/core";

function TextInputField({
  placeholder,
  onSubmit,
}: {
  placeholder: string;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState("");

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

interface CreateAgentProps {
  onDone: () => void;
  onBack: () => void;
}

type Step = "name" | "preview" | "done";

export function CreateAgentScreen({ onDone, onBack }: CreateAgentProps) {
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [seed, setSeed] = useState(() => randomUUID());

  useInput((_input, key) => {
    if (key.escape) {
      if (step === "name") onBack();
      if (step === "preview") {
        setSeed(randomUUID());
        setStep("name");
      }
    }
    if (key.return && step === "preview") {
      const id = slugifyName(name);
      createAgent(id, name, { seed })
        .then(() => {
          setStep("done");
          setTimeout(onDone, 1500);
        })
        .catch((err) => {
          setError((err as Error).message);
          setSeed(randomUUID());
          setStep("name");
        });
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

    setName(trimmed);
    setError("");
    setStep("preview");
  }

  if (step === "name") {
    return (
      <Box paddingX={1} flexDirection="column">
        <Text bold>Create a new agent</Text>
        <Box marginTop={1}>
          <Text>Name: </Text>
          <TextInputField
            placeholder="e.g. WebDev, Reviewer, Writer..."
            onSubmit={handleNameSubmit}
          />
        </Box>
        {error && <Text color="red">{error}</Text>}
        <Text dimColor>Press enter to continue, esc to cancel</Text>
      </Box>
    );
  }

  if (step === "preview") {
    const id = slugifyName(name);
    const character = genCharacter(seed);
    const rendered = renderCharacterToTerminal(character);

    return (
      <Box paddingX={1} flexDirection="column">
        <Text bold>Your new agent</Text>
        <Text>{rendered}</Text>
        <Text bold color={character.color}>
          {name}
        </Text>
        <Text dimColor>ID: {id}</Text>
        <Box marginTop={1}>
          <Text dimColor>Press enter to create, esc to go back</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box paddingX={1}>
      <Text color="green">Agent "{name}" created!</Text>
    </Box>
  );
}
