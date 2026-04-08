import React from "react";
import { Heart, Sparkles, BookOpen, Terminal } from "lucide-react";
import { STARTER_COLORS } from "@tomomo/core/character";
import { CharacterSprite } from "../../components/character-sprite";

// A fixed demo character used in steps that show "an example agent". Inlined
// so the illustrations are stable across renders and do not need IPC at all.
// Hand-curated, not generated, so it does not drift if the character RNG changes.
const DEMO_GRID: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

const DEMO_COLOR = "#00BBAA";
const INDIGO = "#5B6CFF";

// Reusable inline pill that uses a full flat color background with white text.
// This matches the design system's "bold flat color" runtime badge pattern.
function FlatPill({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3.5 py-1.5 text-xs leading-none font-semibold"
      style={{ background: color, color: "#ffffff" }}
    >
      {children}
    </span>
  );
}

// Step 2 illustration. A mini agent identity row showing what an agent looks
// like in the real app: a colored character circle, the name, and a runtime
// badge in the agent's color.
export function AgentIdentityIllustration() {
  return (
    <div className="bg-bg-1 flex items-center gap-4 rounded-2xl px-5 py-3">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: DEMO_COLOR }}
      >
        <CharacterSprite
          grid={DEMO_GRID}
          color="#ffffff"
          size={18}
          displaySize={32}
          animate={false}
        />
      </div>
      <div className="flex flex-col items-start gap-1.5">
        <div className="text-fg-1 text-sm leading-none font-semibold">Demo</div>
        <FlatPill color={DEMO_COLOR}>claude-code</FlatPill>
      </div>
    </div>
  );
}

// Step 3 illustration. Three runtime pill badges in their own colors, matching
// the real runtime badge pattern (full flat color, white text).
export function RuntimePillRow() {
  return (
    <div className="flex items-center gap-3">
      <FlatPill color="#FF9922">claude-code</FlatPill>
      <FlatPill color="#8844EE">codex</FlatPill>
      <FlatPill color="#00BBAA">gemini-cli</FlatPill>
    </div>
  );
}

// Step 4 illustration. Three pillar cards (Soul, Skills, Memory) styled like
// the agent hero stat containers: rounded-2xl, 8% indigo tint, lucide icon +
// short label.
export function PillarCardsRow() {
  const cards: Array<{ icon: React.ReactNode; label: string }> = [
    { icon: <Heart size={20} />, label: "Soul" },
    { icon: <Sparkles size={20} />, label: "Skills" },
    { icon: <BookOpen size={20} />, label: "Memory" },
  ];
  return (
    <div className="flex items-center gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="flex flex-col items-center gap-2 rounded-2xl px-6 py-4"
          style={{
            background: `color-mix(in srgb, ${INDIGO} 8%, var(--bg-1))`,
          }}
        >
          <div className="text-fg-1">{c.icon}</div>
          <div className="text-fg-1 text-xs leading-none font-semibold">
            {c.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// Step 5 illustration. A miniature terminal card header in the same shape as
// the real Hub terminal cards: rounded-t-[18px], full indigo background, white
// text, with a short faux-terminal body strip below it.
export function MiniTerminalHeaderIllustration() {
  return (
    <div className="overflow-hidden rounded-[18px] shadow-none">
      <div
        className="flex items-center gap-3 px-4 py-2"
        style={{ background: INDIGO, color: "#ffffff" }}
      >
        <CharacterSprite
          grid={DEMO_GRID}
          color="#ffffff"
          size={18}
          displaySize={20}
          animate={false}
        />
        <div className="text-sm leading-none font-semibold">Demo</div>
        <div
          className="ml-auto rounded-full px-2 py-0.5 text-[10px] leading-none font-bold"
          style={{ background: "rgba(255,255,255,0.2)" }}
        >
          claude-code
        </div>
      </div>
      <div
        className="flex items-center px-4 py-2 font-mono text-[11px]"
        style={{ background: "#0c0c12", color: "#a0a0b8" }}
      >
        <Terminal size={12} className="mr-2" />
        <span>~ launch ready</span>
      </div>
    </div>
  );
}

// Step 6 illustration. The three starter character containers at 60% opacity,
// teasing the next screen. Pulls from STARTER_COLORS so the tease always
// stays in sync with the actual starter pick.
export function StarterTeaseIllustration() {
  return (
    <div className="flex items-center gap-3 opacity-60">
      {STARTER_COLORS.map((color) => (
        <div
          key={color}
          className="flex h-16 w-16 items-center justify-center rounded-[18px]"
          style={{ background: color }}
        >
          <CharacterSprite
            grid={DEMO_GRID}
            color="#ffffff"
            size={18}
            displaySize={40}
            animate={false}
          />
        </div>
      ))}
    </div>
  );
}
