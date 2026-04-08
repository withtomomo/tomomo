import React, { useState, useEffect } from "react";
import { Shuffle } from "lucide-react";
import { useUiIpc } from "../../ipc-context";
import { useToast } from "../../stores/toast-store";
import { Button } from "../../components/button";
import { NameYourAgent } from "./name-your-agent";

export interface CreateAgentScreenProps {
  runtimes: Array<{ name: string; available: boolean }>;
  // False while the host is still fetching the runtime list. Forwarded to
  // NameYourAgent so it can render loading vs empty vs ready states.
  runtimesLoaded: boolean;
  onCreated: (agentId: string) => void;
  onCancel: () => void;
  onCreateAgent: (
    name: string,
    options: { runtime: string; seed: string }
  ) => Promise<{ id: string }>;
}

// Shared "Add agent" screen used by desktop and vscode when the user clicks
// the + button in the agent sidebar. Single random character with a shuffle
// button to re-roll. Reuses NameYourAgent in addMode for the form.
export function CreateAgentScreen({
  runtimes,
  runtimesLoaded,
  onCreated,
  onCancel,
  onCreateAgent,
}: CreateAgentScreenProps) {
  const ipc = useUiIpc();
  const { toast } = useToast();
  const [seed, setSeed] = useState(() => crypto.randomUUID());
  const [character, setCharacter] = useState<{
    grid: number[][];
    color: string;
    size: number;
  } | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!ipc.character) {
      toast({
        title: "Character preview not available",
        description:
          "The host app is missing the character IPC wiring required by CreateAgentScreen.",
        variant: "error",
      });
      return;
    }
    const preview = ipc.character.preview;
    let cancelled = false;
    (async () => {
      try {
        const result = await preview(seed);
        if (!cancelled) setCharacter(result);
      } catch (err) {
        if (cancelled) return;
        toast({
          title: "Could not load character",
          description: (err as Error).message,
          variant: "error",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ipc, seed, toast]);

  const handleShuffle = () => {
    setSeed(crypto.randomUUID());
  };

  const handleCreate = async (name: string, runtime: string) => {
    setCreating(true);
    try {
      const created = await onCreateAgent(name, { runtime, seed });
      toast({ title: `${name} is ready!`, variant: "success" });
      onCreated(created.id);
    } catch (err) {
      toast({
        title: "Failed to create agent",
        description: (err as Error).message,
        variant: "error",
      });
    } finally {
      setCreating(false);
    }
  };

  if (!character) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-fg-2 text-sm">Rolling a character...</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <NameYourAgent
        chosenSeed={seed}
        chosenCharacter={character}
        runtimes={runtimes}
        runtimesLoaded={runtimesLoaded}
        creating={creating}
        onBack={onCancel}
        onCreate={handleCreate}
        addMode
      />
      <div className="absolute top-6 right-6">
        <Button variant="ghost" onClick={handleShuffle} disabled={creating}>
          <Shuffle size={14} />
          Shuffle
        </Button>
      </div>
    </div>
  );
}
