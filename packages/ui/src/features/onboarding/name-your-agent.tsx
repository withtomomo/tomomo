import React, { useState, useEffect, useRef } from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { generateAgentName } from "@tomomo/core/character";
import { CharacterSprite } from "../../components/character-sprite";
import { Button } from "../../components/button";
import { Select } from "../../components/select";

export interface NameYourAgentProps {
  chosenSeed: string;
  chosenCharacter: { grid: number[][]; color: string; size: number };
  runtimes: Array<{ name: string; available: boolean }>;
  // When false, the component renders a "Loading runtimes..." placeholder and
  // keeps the Create button disabled. When true with a non-empty runtimes
  // array, the user can pick one and submit. When true with an empty array,
  // the component renders a "no runtimes installed" error state.
  runtimesLoaded: boolean;
  creating: boolean;
  onBack: () => void;
  onCreate: (name: string, runtime: string) => void;
  // When true, the back button label becomes "Cancel" and the primary button
  // label becomes "Create" instead of "Get started". Used by the sidebar
  // add-agent flow which has no preceding starter pick step.
  addMode?: boolean;
}

export function NameYourAgent({
  chosenSeed,
  chosenCharacter,
  runtimes,
  runtimesLoaded,
  creating,
  onBack,
  onCreate,
  addMode = false,
}: NameYourAgentProps) {
  const [name, setName] = useState(() => generateAgentName(chosenSeed));
  const [hasEditedName, setHasEditedName] = useState(false);
  const [runtime, setRuntime] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pick a default runtime once the host has loaded the list. Prefer the
  // first available one; fall back to the first entry regardless of
  // availability so the field is never empty when runtimes do exist.
  // Stays null until runtimes arrive, which disables the Create button
  // and guards against submitting a hardcoded "claude-code" on a machine
  // that does not actually have it installed.
  useEffect(() => {
    if (runtime !== null || runtimes.length === 0) return;
    const firstAvailable = runtimes.find((r) => r.available);
    setRuntime(firstAvailable?.name ?? runtimes[0]!.name);
  }, [runtime, runtimes]);

  // Regenerate the suggested name when the chosen seed changes (e.g. user
  // shuffled the character or went back and picked a different starter),
  // unless they have manually edited the field.
  useEffect(() => {
    if (!hasEditedName) {
      setName(generateAgentName(chosenSeed));
    }
  }, [chosenSeed, hasEditedName]);

  // Select the prefilled name on mount so the first keystroke replaces it.
  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  const handleNameChange = (value: string) => {
    setName(value);
    setHasEditedName(true);
  };

  const handleCreate = () => {
    if (!name.trim() || creating || !runtime) return;
    onCreate(name.trim(), runtime);
  };

  const color = chosenCharacter.color;
  const hasName = name.trim().length > 0;
  const runtimesEmpty = runtimesLoaded && runtimes.length === 0;
  const runtimesReady =
    runtimesLoaded && runtimes.length > 0 && runtime !== null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <h1 className="text-fg-1 mb-1 text-3xl font-bold tracking-tight">
        Name your agent
      </h1>
      <p className="text-fg-2 mb-10 text-sm">
        You can shape its personality in your first chat
      </p>

      <div
        className="flex items-center justify-center rounded-full transition-colors duration-[200ms]"
        style={{ width: 160, height: 160, background: color }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 110,
            height: 110,
            background: "rgba(255,255,255,0.2)",
          }}
        >
          <CharacterSprite
            grid={chosenCharacter.grid}
            color="#ffffff"
            size={chosenCharacter.size}
            displaySize={72}
            animate={hasName}
          />
        </div>
      </div>

      <div className="mt-8 flex w-full max-w-xs flex-col gap-4">
        <div>
          <label className="text-fg-2 mb-1.5 block text-xs font-medium">
            Name
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            className="bg-bg-2 text-fg-1 placeholder:text-fg-4 focus:bg-bg-0 h-10 w-full rounded-full border-none px-5 text-sm transition-colors duration-[120ms] outline-none focus:shadow-[var(--shadow-focus)]"
            placeholder="Name your agent..."
          />
        </div>

        <div>
          <label className="text-fg-2 mb-1.5 block text-xs font-medium">
            Runtime
          </label>
          {runtimesReady ? (
            <Select
              value={runtime!}
              onChange={setRuntime}
              options={runtimes.map((r) => ({
                value: r.name,
                label: r.available ? r.name : `${r.name} (not installed)`,
              }))}
            />
          ) : runtimesEmpty ? (
            <div className="bg-error/10 text-error flex min-h-10 w-full items-center rounded-2xl px-5 py-2 text-xs leading-snug">
              No runtimes installed. Install Claude Code, Codex, or Gemini CLI
              to continue.
            </div>
          ) : (
            <div className="bg-bg-2 text-fg-3 flex h-10 w-full items-center rounded-full px-5 text-sm">
              Loading runtimes...
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          {addMode ? (
            <Button variant="ghost" onClick={onBack}>
              Cancel
            </Button>
          ) : (
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft size={14} />
              Back
            </Button>
          )}
          <Button
            onClick={handleCreate}
            disabled={!hasName || creating || !runtimesReady}
            style={{ background: color, color: "#fff" }}
          >
            {creating ? "Creating..." : addMode ? "Create" : "Get started"}
            {!creating && <ArrowRight size={16} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
