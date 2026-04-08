import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { genCharacter } from "@tomomo/core/character";
import { Button } from "../../components/button";
import { useUiIpc } from "../../ipc-context";
import { useToast } from "../../stores/toast-store";
import { INTRO_STEPS } from "./intro-steps";
import { StarterPick, type StarterOption } from "./starter-pick";
import { NameYourAgent } from "./name-your-agent";

// Rolls random seeds until it collects three whose natural seed-derived
// colors are all distinct. Three unique colors out of the 8-color palette
// is trivially fast in expectation (a handful of rolls); the attempt cap
// is just a safety net so a broken PRNG can never spin forever. Throws if
// the cap is hit with fewer than three seeds so the StarterPick never
// renders a short trio with the default selectedIndex out of range.
function generateDistinctStarterSeeds(): string[] {
  const seeds: string[] = [];
  const colors = new Set<string>();
  for (let attempts = 0; attempts < 200 && seeds.length < 3; attempts++) {
    const seed = crypto.randomUUID();
    const { color } = genCharacter(seed);
    if (!colors.has(color)) {
      seeds.push(seed);
      colors.add(color);
    }
  }
  if (seeds.length !== 3) {
    throw new Error(
      `generateDistinctStarterSeeds: expected 3 distinct-color seeds, got ${seeds.length}`
    );
  }
  return seeds;
}

type Phase = "loading" | "intro" | "starter" | "name" | "creating";

export interface OnboardingFlowProps {
  runtimes: Array<{ name: string; available: boolean }>;
  // False while the host is still fetching the runtime list. Forwarded to
  // NameYourAgent so it can render loading vs empty vs ready states.
  runtimesLoaded: boolean;
  // Required for the first-run flow that creates an agent. Optional in
  // forceIntro replay mode, which never reaches the create step.
  onCreated?: (agentId: string) => void;
  onCreateAgent: (
    name: string,
    options: { runtime: string; seed: string }
  ) => Promise<{ id: string }>;
  // When true, always start at intro step 1 regardless of persisted state,
  // and never write to introComplete. Used by the Replay intro button.
  forceIntro?: boolean;
  // Called when the flow finishes in forceIntro mode (by reaching the last
  // step or skipping). Ignored otherwise.
  onClose?: () => void;
}

export function OnboardingFlow({
  runtimes,
  runtimesLoaded,
  onCreated,
  onCreateAgent,
  forceIntro = false,
  onClose,
}: OnboardingFlowProps) {
  const ipc = useUiIpc();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("loading");
  const [introStep, setIntroStep] = useState(0);

  // Seeds for the starter trio. Generated once on mount and kept stable
  // across Back navigation so the user always sees the same three
  // characters. The three seeds are guaranteed to produce three distinct
  // natural colors, so every starter pick shows three visually different
  // agents and the color the user sees is the color the agent will have
  // after creation.
  // Host apps must NOT unmount/remount this component mid-flow or the
  // trio will reshuffle. Both desktop and vscode currently render it
  // inline at the root, which preserves identity. If you add route-based
  // mounting, lift these seeds into the parent.
  const starterSeeds = useMemo(() => generateDistinctStarterSeeds(), []);
  const [chosenStarter, setChosenStarter] = useState<StarterOption | null>(
    null
  );

  // On mount, decide whether to show the intro or jump straight to the
  // starter pick based on persisted state (or forceIntro override).
  useEffect(() => {
    if (forceIntro) {
      setPhase("intro");
      setIntroStep(0);
      return;
    }
    if (!ipc.intro) {
      // No intro IPC wired up by the host. Skip the intro entirely.
      setPhase("starter");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const seen = await ipc.intro!.hasSeen();
        if (cancelled) return;
        setPhase(seen ? "starter" : "intro");
      } catch {
        // If the persistence read fails we fall through to the starter pick
        // rather than getting stuck on the loading screen forever. The worst
        // case is a returning user briefly sees the starter instead of nothing,
        // which is better than a hang.
        if (cancelled) return;
        setPhase("starter");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [forceIntro, ipc]);

  const finishIntro = useCallback(async () => {
    if (!forceIntro && ipc.intro) {
      try {
        await ipc.intro.markSeen();
      } catch {
        // Non-fatal: if we cannot persist the flag the user will see the intro
        // again next launch, but there is no value in blocking them here.
      }
    }
    if (forceIntro) {
      onClose?.();
    } else {
      setPhase("starter");
    }
  }, [forceIntro, ipc, onClose]);

  const nextIntroStep = useCallback(() => {
    if (introStep >= INTRO_STEPS.length - 1) {
      void finishIntro();
    } else {
      setIntroStep((s) => s + 1);
    }
  }, [introStep, finishIntro]);

  const prevIntroStep = useCallback(() => {
    setIntroStep((s) => Math.max(0, s - 1));
  }, []);

  // Intro keyboard shortcuts. Enter / Space / Right for next, Left for back,
  // Escape for back or close in replay mode. Disabled when focus is in a text
  // input.
  useEffect(() => {
    if (phase !== "intro") return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ) {
        return;
      }
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
        e.preventDefault();
        nextIntroStep();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevIntroStep();
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (forceIntro) {
          onClose?.();
        } else {
          prevIntroStep();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, nextIntroStep, prevIntroStep, forceIntro, onClose]);

  const handleStarterPick = (option: StarterOption) => {
    setChosenStarter(option);
    setPhase("name");
  };

  const handleNameBack = () => {
    setPhase("starter");
  };

  const handleCreate = async (name: string, runtime: string) => {
    if (!chosenStarter) return;
    setPhase("creating");
    try {
      const created = await onCreateAgent(name, {
        runtime,
        seed: chosenStarter.seed,
      });
      toast({ title: `${name} is ready!`, variant: "success" });
      onCreated?.(created.id);
    } catch (err) {
      toast({
        title: "Failed to create agent",
        description: (err as Error).message,
        variant: "error",
      });
      setPhase("name");
    }
  };

  if (phase === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-fg-2 text-sm">Loading...</p>
      </div>
    );
  }

  if (phase === "intro") {
    const StepComponent = INTRO_STEPS[introStep]!;
    const isLast = introStep === INTRO_STEPS.length - 1;
    return (
      <div className="flex h-full flex-1 flex-col p-8">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => void finishIntro()}
            className="text-fg-3 hover:text-fg-2 cursor-pointer border-none bg-transparent text-sm font-medium transition-colors duration-[120ms]"
          >
            Skip intro
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
          <StepComponent />
        </div>

        <div className="flex items-center justify-between pt-6">
          <Button
            variant="ghost"
            onClick={prevIntroStep}
            disabled={introStep === 0}
          >
            <ArrowLeft size={16} />
            Back
          </Button>
          <div className="flex items-center gap-1.5">
            {INTRO_STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1 w-5 rounded-full transition-colors duration-[120ms]"
                style={{
                  background: i === introStep ? "#5B6CFF" : "var(--bg-3)",
                }}
              />
            ))}
          </div>
          <Button
            onClick={nextIntroStep}
            style={{ background: "#5B6CFF", color: "#fff" }}
          >
            {isLast ? "Begin" : "Next"}
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "starter") {
    return <StarterPick seeds={starterSeeds} onPick={handleStarterPick} />;
  }

  if (phase === "name" || phase === "creating") {
    if (!chosenStarter) return null;
    return (
      <NameYourAgent
        chosenSeed={chosenStarter.seed}
        chosenCharacter={chosenStarter.character}
        runtimes={runtimes}
        runtimesLoaded={runtimesLoaded}
        creating={phase === "creating"}
        onBack={handleNameBack}
        onCreate={handleCreate}
      />
    );
  }

  return null;
}
