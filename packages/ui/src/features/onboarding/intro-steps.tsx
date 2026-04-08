import React from "react";
import {
  HelloIllustration,
  AgentsLineupIllustration,
  RuntimeStackIllustration,
  PillarsIllustration,
  LaunchIllustration,
} from "./intro-illustrations";

// Intro steps 1-5 render the same structure so title and body sit at the
// exact same vertical position across all five illustrated slides:
//   1. A fixed 560x300 illustration slot (SLOT_CLASS in intro-illustrations).
//   2. A single-line text-4xl title.
//   3. A text-lg body pinned to a 2-line minimum height so 1-line bodies
//      reserve the same vertical space as 2-line bodies.
// Step 6 is the exception: it intentionally skips the illustration slot so
// the title + body sit centered in the intro content area, acting as a
// clean "ready to begin" transition into the starter pick screen.
// Every body MUST be two lines or fewer at the current max-w-md width.

// Fixed 2-line vertical slot for the body, matching text-lg line-height
// (roughly 1.75rem per line). 3.5rem = exactly 2 lines reserved.
const BODY_CLASS = "text-fg-2 max-w-md text-lg min-h-[3.5rem]";
const TITLE_CLASS = "text-fg-1 text-4xl font-bold tracking-tight";

export function Step1Hello() {
  return (
    <>
      <HelloIllustration />
      <div className={TITLE_CLASS}>Hello!</div>
      <div className={BODY_CLASS}>
        Welcome to the world of Tomomo. I'm Tomo, and I'll show you around.
      </div>
    </>
  );
}

export function Step2Agents() {
  return (
    <>
      <AgentsLineupIllustration />
      <div className={TITLE_CLASS}>Meet your agents</div>
      <div className={BODY_CLASS}>
        Build a team. One agent for every kind of work, each with its own name,
        look, and personality.
      </div>
    </>
  );
}

export function Step3Runtimes() {
  return (
    <>
      <RuntimeStackIllustration />
      <div className={TITLE_CLASS}>Powered by anything</div>
      <div className={BODY_CLASS}>
        Claude Code, Codex, Gemini, or any CLI you've got. Tomomo runs on top of
        all of them.
      </div>
    </>
  );
}

export function Step4SoulSkillsMemory() {
  return (
    <>
      <PillarsIllustration />
      <div className={TITLE_CLASS}>What makes them yours</div>
      <div className={BODY_CLASS}>
        Soul, skills, memory. You shape them, you teach them, and they remember
        every project.
      </div>
    </>
  );
}

export function Step5LaunchAnywhere() {
  return (
    <>
      <LaunchIllustration />
      <div className={TITLE_CLASS}>Launch them anywhere</div>
      <div className={BODY_CLASS}>
        On any project, any folder, any repo. They code, write, research, plan,
        create. Do anything.
      </div>
    </>
  );
}

export function Step6PickStarter() {
  // No illustration on the final slide: the content area centers the title
  // and body on its own, creating a calm "ready to begin" moment before
  // the starter pick screen takes over.
  return (
    <>
      <div className={TITLE_CLASS}>Let's build your team</div>
      <div className={BODY_CLASS}>Pick your first partner and get started.</div>
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
