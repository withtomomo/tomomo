import React, { useState, useEffect, useCallback } from "react";
import { ArrowRight } from "lucide-react";
import { STARTER_COLORS } from "@tomomo/core/character";
import { CharacterSprite } from "../../components/character-sprite";
import { Button } from "../../components/button";
import { useUiIpc } from "../../ipc-context";
import { useToast } from "../../stores/toast-store";

export interface StarterCharacter {
  grid: number[][];
  color: string;
  size: number;
}

export interface StarterOption {
  seed: string;
  character: StarterCharacter;
}

export interface StarterPickProps {
  // Seeds owned by the parent so Back navigation preserves the trio across
  // re-mounts. The parent passes exactly STARTER_COLORS.length seeds.
  seeds: string[];
  onPick: (option: StarterOption) => void;
}

export function StarterPick({ seeds, onPick }: StarterPickProps) {
  const ipc = useUiIpc();
  const { toast } = useToast();
  const [options, setOptions] = useState<StarterOption[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(1);

  useEffect(() => {
    if (!ipc.character) {
      toast({
        title: "Character preview not available",
        description:
          "The host app is missing the character IPC wiring required by StarterPick.",
        variant: "error",
      });
      return;
    }
    const preview = ipc.character.preview;
    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.all(
          seeds.map(async (seed, i) => {
            const color = STARTER_COLORS[i]!;
            const character = await preview(seed, { color });
            return { seed, character };
          })
        );
        if (!cancelled) setOptions(results);
      } catch (err) {
        if (cancelled) return;
        toast({
          title: "Could not load starter characters",
          description: (err as Error).message,
          variant: "error",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ipc, seeds, toast]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore keyboard nav until the starter options have actually loaded.
      // Otherwise ArrowLeft before load would set selectedIndex to -1 and the
      // component would render with nothing highlighted once options arrive.
      if (options.length === 0) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSelectedIndex((i) => (i > 0 ? i - 1 : options.length - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setSelectedIndex((i) => (i < options.length - 1 ? i + 1 : 0));
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const chosen = options[selectedIndex];
        if (chosen) onPick(chosen);
      }
    },
    [options, selectedIndex, onPick]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const selected = options[selectedIndex];
  const selectedColor = selected?.character.color;

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <h1 className="text-fg-1 mb-1 text-3xl font-bold tracking-tight">
        Choose your starter
      </h1>
      <p className="text-fg-2 mb-10 text-sm">Pick your first partner</p>

      <div className="flex items-center gap-5">
        {options.map((opt, i) => {
          const color = opt.character.color;
          const isSelected = i === selectedIndex;
          return (
            <button
              key={opt.seed}
              type="button"
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
                  <CharacterSprite
                    grid={opt.character.grid}
                    color="#ffffff"
                    size={opt.character.size}
                    displaySize={isSelected ? 104 : 64}
                    animate={isSelected}
                  />
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

      {selected && (
        <div className="mt-8">
          <Button
            size="lg"
            style={{ background: selectedColor, color: "#fff" }}
            onClick={() => onPick(selected)}
          >
            Choose this one
            <ArrowRight size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}
