import React from "react";
import {
  AgentIdentityIllustration,
  RuntimePillRow,
  PillarCardsRow,
  MiniTerminalHeaderIllustration,
  StarterTeaseIllustration,
} from "./intro-illustrations";

// Each step renders its optional illustration, title, and body. Tomo himself
// is rendered by the parent OnboardingFlow orchestrator and stays mounted
// across all steps so his idle animation is continuous.

export function Step1Hello() {
  return (
    <>
      <div className="text-fg-1 text-4xl font-bold tracking-tight">Hello!</div>
      <div className="text-fg-2 max-w-md text-lg">
        Welcome to the world of Tomomo. I'm Tomo, and I'll show you around.
      </div>
    </>
  );
}

export function Step2Agents() {
  return (
    <>
      <AgentIdentityIllustration />
      <div className="text-fg-1 text-4xl font-bold tracking-tight">
        Meet your agents
      </div>
      <div className="text-fg-2 max-w-md text-lg">
        Agents are partners, not tools. Each one has a personality, a voice, and
        a way of working all its own.
      </div>
    </>
  );
}

export function Step3Runtimes() {
  return (
    <>
      <RuntimePillRow />
      <div className="text-fg-1 text-4xl font-bold tracking-tight">
        Powered by anything
      </div>
      <div className="text-fg-2 max-w-md text-lg">
        Your agents run on Claude Code, Codex, Gemini, or whatever you've got
        installed. Tomomo handles the rest.
      </div>
    </>
  );
}

export function Step4SoulSkillsMemory() {
  return (
    <>
      <PillarCardsRow />
      <div className="text-fg-1 text-4xl font-bold tracking-tight">
        What makes them yours
      </div>
      <div className="text-fg-2 max-w-md text-lg">
        Soul, skills, memory. You shape the soul. You teach the skills. They
        keep the memories from every project.
      </div>
    </>
  );
}

export function Step5LaunchAnywhere() {
  return (
    <>
      <MiniTerminalHeaderIllustration />
      <div className="text-fg-1 text-4xl font-bold tracking-tight">
        Launch them anywhere
      </div>
      <div className="text-fg-2 max-w-md text-lg">
        On any project, any folder, any repo. They code, write, research, plan,
        create. Do anything.
      </div>
    </>
  );
}

export function Step6PickStarter() {
  return (
    <>
      <StarterTeaseIllustration />
      <div className="text-fg-1 text-4xl font-bold tracking-tight">
        Let's build your team
      </div>
      <div className="text-fg-2 max-w-md text-lg">
        Pick your first partner and get started.
      </div>
    </>
  );
}

// Ordered list of all 6 intro steps. The OnboardingFlow renders them by index.
export const INTRO_STEPS: ReadonlyArray<() => React.ReactElement> = [
  Step1Hello,
  Step2Agents,
  Step3Runtimes,
  Step4SoulSkillsMemory,
  Step5LaunchAnywhere,
  Step6PickStarter,
];
