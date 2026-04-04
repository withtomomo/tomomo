import React, { useState, useEffect, useMemo } from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import {
  CharacterSprite,
  Button,
  Select,
  useIpcQuery,
  useToast,
} from "@tomomo/ui";
import { ipc } from "../lib/ipc";
import { Breadcrumb } from "./breadcrumb";
import type { RuntimeInfo } from "../types";

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
  const { data: runtimesData } = useIpcQuery<RuntimeInfo[]>(
    () => ipc.runtimes.check() as Promise<RuntimeInfo[]>
  );
  const runtimes = runtimesData ?? [];

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
    if (runtimes.length > 0 && !runtimes.find((r) => r.name === runtime)) {
      const firstAvailable = runtimes.find((r) => r.available);
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
      const created = (await ipc.agents.create(name.trim(), {
        runtime,
        seed: chosenSeed,
      })) as { id: string };
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
      <div className="flex flex-1 flex-col items-center overflow-y-auto p-4">
        <h1 className="text-fg-1 mb-1 text-xl font-bold tracking-tight">
          Choose your starter
        </h1>
        <p className="text-fg-2 mb-6 text-xs">Pick your first team member</p>

        <div className="flex w-full items-center justify-center gap-3">
          {options.map((opt, i) => {
            const color = opt.character?.color || "#888";
            const isSelected = i === selectedIndex;

            return (
              <button
                key={opt.seed}
                onClick={() => setSelectedIndex(i)}
                className="flex flex-col items-center gap-2 border-none bg-transparent"
              >
                <div
                  className="flex items-center justify-center overflow-hidden rounded-2xl transition-all duration-[200ms]"
                  style={{
                    background: color,
                    width: isSelected ? 100 : 72,
                    height: isSelected ? 140 : 100,
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: isSelected ? 80 : 52,
                      height: isSelected ? 80 : 52,
                      background: "rgba(255,255,255,0.2)",
                    }}
                  >
                    {opt.character ? (
                      <CharacterSprite
                        grid={opt.character.grid}
                        color="#ffffff"
                        size={opt.character.size}
                        displaySize={isSelected ? 52 : 36}
                        className="rounded-lg"
                        animate={isSelected}
                      />
                    ) : (
                      <div
                        className="rounded-lg"
                        style={{
                          width: isSelected ? 52 : 36,
                          height: isSelected ? 52 : 36,
                          background: "rgba(255,255,255,0.15)",
                        }}
                      />
                    )}
                  </div>
                </div>
                <div
                  className="rounded-full transition-all duration-[200ms]"
                  style={{
                    width: isSelected ? 6 : 4,
                    height: isSelected ? 6 : 4,
                    background: isSelected ? color : "var(--bg-3)",
                  }}
                />
              </button>
            );
          })}
        </div>

        {options[selectedIndex]?.character && (
          <Button
            className="mt-6 w-full"
            style={{
              background: options[selectedIndex]!.character!.color,
              color: "#fff",
            }}
            onClick={handlePick}
          >
            Choose this one
            <ArrowRight size={14} />
          </Button>
        )}
      </div>
    );
  }

  // Step 2 in add mode (with Breadcrumb header)
  if (mode === "add") {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <Breadcrumb title="New agent" onBack={() => onCancel?.()} />
        <div className="flex flex-1 flex-col items-center gap-5 overflow-y-auto p-4">
          <div
            className="flex items-center justify-center rounded-full transition-colors duration-[200ms]"
            style={{ width: 120, height: 120, background: c || "var(--bg-2)" }}
          >
            <div
              className="flex items-center justify-center rounded-full transition-colors duration-[200ms]"
              style={{
                width: 80,
                height: 80,
                background: c ? "rgba(255,255,255,0.2)" : "var(--bg-3)",
              }}
            >
              {chosenCharacter ? (
                <CharacterSprite
                  grid={chosenCharacter.grid}
                  color="#ffffff"
                  size={chosenCharacter.size}
                  displaySize={52}
                  className="rounded-xl"
                  animate={hasName}
                />
              ) : (
                <span className="text-fg-4 text-xl font-light">?</span>
              )}
            </div>
          </div>

          <div className="w-full">
            <label className="text-fg-2 mb-1 block text-xs font-medium">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              className="bg-bg-1 text-fg-1 placeholder:text-fg-4 focus:bg-bg-0 h-9 w-full rounded-full border-none px-4 text-sm transition-colors duration-[120ms] outline-none focus:shadow-[var(--shadow-focus)]"
              placeholder="Name your agent..."
              autoFocus
            />
          </div>

          <div className="w-full">
            <label className="text-fg-2 mb-1 block text-xs font-medium">
              Runtime
            </label>
            <Select
              value={runtime}
              options={
                runtimes.length > 0
                  ? runtimes.map((r) => ({
                      value: r.name,
                      label: r.available ? r.name : `${r.name} (not installed)`,
                    }))
                  : [{ value: "claude-code", label: "claude-code" }]
              }
              onChange={setRuntime}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={!hasName || creating}
            style={c ? { background: c, color: "#fff" } : undefined}
            variant={c ? undefined : "accent"}
          >
            {creating ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>
    );
  }

  // Step 2 in onboarding mode (inline, no breadcrumb)
  return (
    <div className="flex flex-1 flex-col items-center overflow-y-auto p-4">
      <h1 className="text-fg-1 mb-1 text-xl font-bold tracking-tight">
        Name your agent
      </h1>
      <p className="text-fg-2 mb-6 text-xs">
        You can shape its personality in your first chat
      </p>

      <div
        className="flex items-center justify-center rounded-full transition-colors duration-[200ms]"
        style={{ width: 120, height: 120, background: c || "var(--bg-2)" }}
      >
        <div
          className="flex items-center justify-center rounded-full transition-colors duration-[200ms]"
          style={{
            width: 80,
            height: 80,
            background: c ? "rgba(255,255,255,0.2)" : "var(--bg-3)",
          }}
        >
          {chosenCharacter ? (
            <CharacterSprite
              grid={chosenCharacter.grid}
              color="#ffffff"
              size={chosenCharacter.size}
              displaySize={52}
              className="rounded-xl"
              animate={hasName}
            />
          ) : (
            <span className="text-fg-4 text-xl font-light">?</span>
          )}
        </div>
      </div>

      <div className="mt-5 w-full">
        <label className="text-fg-2 mb-1 block text-xs font-medium">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
          className="bg-bg-1 text-fg-1 placeholder:text-fg-4 focus:bg-bg-0 h-9 w-full rounded-full border-none px-4 text-sm transition-colors duration-[120ms] outline-none focus:shadow-[var(--shadow-focus)]"
          placeholder="Name your agent..."
          autoFocus
        />
      </div>

      <div className="mt-3 w-full">
        <label className="text-fg-2 mb-1 block text-xs font-medium">
          Runtime
        </label>
        <Select
          value={runtime}
          options={
            runtimes.length > 0
              ? runtimes.map((r) => ({
                  value: r.name,
                  label: r.available ? r.name : `${r.name} (not installed)`,
                }))
              : [{ value: "claude-code", label: "claude-code" }]
          }
          onChange={setRuntime}
        />
      </div>

      <div className="mt-4 flex w-full items-center justify-between">
        <button
          onClick={handleBack}
          className="text-fg-3 hover:text-fg-2 flex cursor-pointer items-center gap-1 border-none bg-transparent text-xs transition-colors duration-[120ms]"
        >
          <ArrowLeft size={12} />
          Back
        </button>
        <Button
          onClick={handleCreate}
          disabled={!hasName || creating}
          style={c ? { background: c, color: "#fff" } : undefined}
          variant={c ? undefined : "accent"}
        >
          {creating ? "Creating..." : "Get started"}
          {!creating && <ArrowRight size={14} />}
        </Button>
      </div>
    </div>
  );
}
