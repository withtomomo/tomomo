import React, { useState, useEffect, useMemo } from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { CharacterSprite, Button, Select, useToast } from "@tomomo/ui";
import { ipc } from "../../lib/ipc";
import { useRuntimes } from "../../hooks/use-runtimes";

interface CharacterOption {
  seed: string;
  character: { grid: number[][]; color: string; size: number } | null;
}

interface CreateAgentScreenProps {
  mode: "onboarding" | "add";
  onCreated: (agentId: string) => void;
  onCancel?: () => void;
}

type Step = "pick" | "create";

export function CreateAgentScreen({
  mode,
  onCreated,
  onCancel,
}: CreateAgentScreenProps) {
  const { toast } = useToast();
  const { runtimes } = useRuntimes();

  // Step 1 state (onboarding only)
  const seeds = useMemo(
    () => [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()],
    []
  );
  const [options, setOptions] = useState<CharacterOption[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(1);

  // Step 2 state
  const [step, setStep] = useState<Step>(
    mode === "onboarding" ? "pick" : "create"
  );
  const [chosenSeed, setChosenSeed] = useState(() =>
    mode === "add" ? crypto.randomUUID() : ""
  );
  const [chosenCharacter, setChosenCharacter] = useState<{
    grid: number[][];
    color: string;
    size: number;
  } | null>(null);
  const [name, setName] = useState("");
  const [runtime, setRuntime] = useState("claude-code");
  const [creating, setCreating] = useState(false);

  // Load 3 character previews for onboarding
  useEffect(() => {
    if (mode !== "onboarding") return;
    Promise.all(
      seeds.map(async (seed) => {
        try {
          const character = await ipc.character.preview(seed);
          return { seed, character } as CharacterOption;
        } catch {
          return { seed, character: null } as CharacterOption;
        }
      })
    ).then(setOptions);
  }, [seeds, mode]);

  // Load single character for add mode
  useEffect(() => {
    if (mode !== "add" || !chosenSeed) return;
    ipc.character
      .preview(chosenSeed)
      .then(setChosenCharacter)
      .catch(() => setChosenCharacter(null));
  }, [chosenSeed, mode]);

  // Update default runtime when runtimes load
  useEffect(() => {
    if (
      runtimes.length > 0 &&
      !runtimes.find((r: { name: string }) => r.name === runtime)
    ) {
      const firstAvailable = runtimes.find(
        (r: { available: boolean }) => r.available
      );
      if (firstAvailable) setRuntime(firstAvailable.name);
    }
  }, [runtimes, runtime]);

  const handlePick = () => {
    const chosen = options[selectedIndex];
    if (!chosen) return;
    setChosenSeed(chosen.seed);
    setChosenCharacter(chosen.character);
    setStep("create");
  };

  const handleBack = () => {
    setName("");
    setStep("pick");
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const created = await ipc.agents.create(name.trim(), {
        runtime,
        seed: chosenSeed,
      });
      toast({ title: `${name.trim()} is ready!`, variant: "success" });
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

  const c = chosenCharacter?.color || null;
  const hasName = name.trim().length > 0;

  // Step 1: Character pick (onboarding only)
  if (step === "pick") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <h1 className="text-fg-1 mb-1 text-3xl font-bold tracking-tight">
          Choose your starter
        </h1>
        <p className="text-fg-2 mb-10 text-sm">Pick your first team member</p>

        <div className="flex items-center gap-5">
          {options.map((opt, i) => {
            const color = opt.character?.color || "#888";
            const isSelected = i === selectedIndex;

            return (
              <button
                key={opt.seed}
                onClick={() => setSelectedIndex(i)}
                className="flex flex-col items-center gap-3 border-none bg-transparent"
              >
                <div
                  className="relative flex items-center justify-center overflow-hidden rounded-[28px] transition-all duration-[200ms]"
                  style={{
                    background: color,
                    width: isSelected ? 220 : 160,
                    height: isSelected ? 340 : 260,
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: isSelected ? 160 : 100,
                      height: isSelected ? 160 : 100,
                      background: "rgba(255,255,255,0.2)",
                    }}
                  >
                    {opt.character ? (
                      <CharacterSprite
                        grid={opt.character.grid}
                        color="#ffffff"
                        size={opt.character.size}
                        displaySize={isSelected ? 104 : 64}
                        className="rounded-xl"
                        animate={isSelected}
                      />
                    ) : (
                      <div
                        className="rounded-xl"
                        style={{
                          width: isSelected ? 104 : 64,
                          height: isSelected ? 104 : 64,
                          background: "rgba(255,255,255,0.15)",
                        }}
                      />
                    )}
                  </div>
                </div>
                <div
                  className="rounded-full transition-all duration-[200ms]"
                  style={{
                    width: isSelected ? 8 : 6,
                    height: isSelected ? 8 : 6,
                    background: isSelected ? color : "var(--bg-3)",
                  }}
                />
              </button>
            );
          })}
        </div>

        {options[selectedIndex]?.character && (
          <div className="mt-8">
            <Button
              size="lg"
              style={{
                background: options[selectedIndex]!.character!.color,
                color: "#fff",
              }}
              onClick={handlePick}
            >
              Choose this one
              <ArrowRight size={16} />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Step 2: Name + create (both modes)
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <h1 className="text-fg-1 mb-1 text-3xl font-bold tracking-tight">
        {mode === "onboarding" ? "Name your agent" : "New agent"}
      </h1>
      <p className="text-fg-2 mb-10 text-sm">
        You can shape its personality in your first chat
      </p>

      {/* Character circle */}
      <div
        className="flex items-center justify-center rounded-full transition-colors duration-[200ms]"
        style={{
          width: 160,
          height: 160,
          background: c || "var(--bg-2)",
        }}
      >
        <div
          className="flex items-center justify-center rounded-full transition-colors duration-[200ms]"
          style={{
            width: 110,
            height: 110,
            background: c ? "rgba(255,255,255,0.2)" : "var(--bg-3)",
          }}
        >
          {chosenCharacter ? (
            <CharacterSprite
              grid={chosenCharacter.grid}
              color="#ffffff"
              size={chosenCharacter.size}
              displaySize={72}
              className="rounded-xl"
              animate={hasName}
            />
          ) : (
            <span className="text-fg-4 text-2xl font-light">?</span>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="mt-8 flex w-full max-w-xs flex-col gap-4">
        {/* Name input */}
        <div>
          <label className="text-fg-2 mb-1.5 block text-xs font-medium">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            className="bg-bg-2 text-fg-1 placeholder:text-fg-4 focus:bg-bg-0 h-10 w-full rounded-full border-none px-5 text-sm transition-colors duration-[120ms] outline-none focus:shadow-[var(--shadow-focus)]"
            placeholder="Name your agent..."
            autoFocus
          />
        </div>

        {/* Runtime selector */}
        <div>
          <label className="text-fg-2 mb-1.5 block text-xs font-medium">
            Runtime
          </label>
          <Select
            value={runtime}
            options={
              runtimes.length > 0
                ? runtimes.map((r: { name: string; available: boolean }) => ({
                    value: r.name,
                    label: r.available ? r.name : `${r.name} (not installed)`,
                  }))
                : [{ value: "claude-code", label: "claude-code" }]
            }
            onChange={setRuntime}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          {mode === "onboarding" ? (
            <button
              onClick={handleBack}
              className="text-fg-3 hover:text-fg-2 flex items-center gap-1 border-none bg-transparent text-sm transition-colors duration-[120ms]"
            >
              <ArrowLeft size={14} />
              Back
            </button>
          ) : (
            <Button variant="ghost" onClick={() => onCancel?.()}>
              Cancel
            </Button>
          )}
          <Button
            onClick={handleCreate}
            disabled={!hasName || creating}
            style={c ? { background: c, color: "#fff" } : undefined}
            variant={c ? undefined : "accent"}
          >
            {creating
              ? "Creating..."
              : mode === "onboarding"
                ? "Get started"
                : "Create"}
            {!creating && <ArrowRight size={16} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
