import React from "react";
import { Heart, Sparkles, BookOpen, Terminal } from "lucide-react";
import { STARTER_COLORS } from "@tomomo/core/character";
import { CharacterSprite } from "../../components/character-sprite";
import { TomoSprite, TOMO_GRID } from "../../components/tomo-sprite";

// Every intro illustration renders inside a fixed 560x300 slot so the text
// position and visual footprint stay constant across slides 1-5, exactly
// like the first slide with Tomo. Slide 6 skips the slot entirely and
// renders centered text only.
//
// Tomo is the protagonist throughout: front and center on slides 1 and 2,
// on the left on slide 3, anchoring the bottom on slide 4, and as the
// character in every terminal header on slide 5.
//
// Characters render directly in their own color per the design rule:
// "Characters are free. Agent avatars render on transparent backgrounds."

// Four demo characters used as the supporting cast on slide 2. Each grid
// is 18x18 with eye cells tagged as value 2 for the CharacterSprite
// animation pipeline.

const MIRA_GRID: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 2, 1, 1, 2, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

const RIO_GRID: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 2, 1, 1, 2, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

const KAI_GRID: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

const SUN_GRID: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

const INDIGO = "#5B6CFF";
const MIRA_ORANGE = "#FF9922";
const RIO_PINK = "#FF4488";
const KAI_TEAL = "#00BBAA";
const SUN_PURPLE = "#8844EE";

// Fixed visual slot for every illustration so the layout footprint stays
// identical across slides 1-5.
const SLOT_CLASS = "relative h-[300px] w-[560px]";

// Step 1 — Hello
// Tomo at narrator scale, centered in the fixed slot.
export function HelloIllustration() {
  return (
    <div className={`${SLOT_CLASS} flex items-center justify-center`}>
      <TomoSprite size={240} animate />
    </div>
  );
}

// Step 2 — Meet your agents
// Tomo sits slightly below center. Five supporting characters orbit him at
// 72° intervals on an ellipse, each at its own size and its own rotation,
// so the ring feels varied and hand-placed instead of a regimented circle.
// The ellipse is tuned so every satellite clears Tomo's bounding box.
export function AgentsLineupIllustration() {
  // Tomo is pushed down slightly (cy=175, below the 300/2=150 center) so the
  // ellipse's top position has room to clear Tomo's head without going
  // off-screen at the top of the slot.
  const tomoSize = 224;
  const cx = 280;
  const cy = 158;
  const rx = 250;
  const ry = 130;

  // Four satellites flanking Tomo on the sides and corners. Sizes range
  // dramatically from 60 to 116 px (a ~2x scale ratio) so the ring reads
  // as a hand-picked ensemble with real depth rather than a uniform ring.
  // Rotations mix left- and right-tilts for motion. No top satellite so
  // the space above Tomo's head stays clean.
  const satellites: Array<{
    grid: number[][];
    color: string;
    angleDeg: number;
    size: number;
    rotateDeg: number;
  }> = [
    // Upper-left — the giant
    {
      grid: MIRA_GRID,
      color: MIRA_ORANGE,
      angleDeg: 162,
      size: 164,
      rotateDeg: -14,
    },
    // Lower-left — the smallest
    { grid: RIO_GRID, color: RIO_PINK, angleDeg: 234, size: 86, rotateDeg: 18 },
    // Lower-right — medium
    {
      grid: SUN_GRID,
      color: SUN_PURPLE,
      angleDeg: 306,
      size: 118,
      rotateDeg: -10,
    },
    // Upper-right — large
    { grid: KAI_GRID, color: KAI_TEAL, angleDeg: 18, size: 142, rotateDeg: 12 },
  ];

  return (
    <div className={SLOT_CLASS}>
      {/* Tomo — center, pushed slightly down */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: cy - tomoSize / 2 }}
      >
        <TomoSprite size={tomoSize} animate />
      </div>

      {/* Supporting cast — evenly distributed on the ellipse, each rotated */}
      {satellites.map((s, i) => {
        const rad = (s.angleDeg * Math.PI) / 180;
        const halfSat = s.size / 2;
        const x = cx + rx * Math.cos(rad) - halfSat;
        // Screen y grows downward, so subtract sin(angle).
        const y = cy - ry * Math.sin(rad) - halfSat;
        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: x,
              top: y,
              transform: `rotate(${s.rotateDeg}deg)`,
            }}
          >
            <CharacterSprite
              grid={s.grid}
              color={s.color}
              size={18}
              displaySize={s.size}
              animate={false}
            />
          </div>
        );
      })}
    </div>
  );
}

// Step 3 — Powered by anything
// Tomo on the left, three runtime pills fanned on the right. The top and
// bottom pills tilt outward while the center pill stays level and is
// shifted 40 px closer to Tomo, so the three together form a soft arc
// that reaches toward him.
export function RuntimeStackIllustration() {
  // Tomo sits flush-left at vertical center of the slot.
  const tomoTop = 50;
  const tomoLeft = 30;

  // Pills are positioned absolutely so the center pill can be pulled
  // closer to Tomo than the other two. Top and bottom pills tilt
  // symmetrically for a fan effect.
  const runtimes: Array<{
    name: string;
    color: string;
    top: number;
    left: number;
    rotateDeg: number;
  }> = [
    {
      name: "claude-code",
      color: MIRA_ORANGE,
      top: 12,
      left: 290,
      rotateDeg: -8,
    },
    {
      name: "codex",
      color: SUN_PURPLE,
      top: 126,
      left: 250,
      rotateDeg: 0,
    },
    {
      name: "gemini-cli",
      color: KAI_TEAL,
      top: 240,
      left: 290,
      rotateDeg: 8,
    },
  ];

  return (
    <div className={SLOT_CLASS}>
      {/* Tomo — left */}
      <div className="absolute" style={{ top: tomoTop, left: tomoLeft }}>
        <TomoSprite size={200} animate />
      </div>

      {/* Three runtime pills — right, fanned around Tomo */}
      {runtimes.map((rt) => (
        <div
          key={rt.name}
          className="absolute flex h-12 min-w-[250px] items-center gap-3 rounded-full px-6 text-base font-bold tracking-tight text-white"
          style={{
            top: rt.top,
            left: rt.left,
            background: rt.color,
            transform: `rotate(${rt.rotateDeg}deg)`,
          }}
        >
          <Terminal size={18} color="#ffffff" />
          {rt.name}
        </div>
      ))}
    </div>
  );
}

// Step 4 — What makes them yours
// Three circular badges across the top (Soul, Skills, Memory), Tomo
// anchoring the bottom center. Circles use the indigo-tinted background
// pattern from the agent-hero stats containers.
export function PillarsIllustration() {
  const pillarBg = `color-mix(in srgb, ${INDIGO} 12%, var(--bg-1))`;
  // Three pillars arranged on a soft arc above Tomo, each with its own
  // size so the composition reads as hand-placed rather than a row. The
  // arc center sits below Tomo, so the higher the pillar is on the arc,
  // the more it looks like it's radiating outward from him.
  const pillars: Array<{
    icon: React.ReactNode;
    label: string;
    cx: number;
    cy: number;
    size: number;
    iconSize: number;
  }> = [
    {
      icon: <Heart size={30} className="text-fg-1" />,
      label: "Soul",
      cx: 110,
      cy: 94,
      size: 82,
      iconSize: 30,
    },
    {
      icon: <Sparkles size={40} className="text-fg-1" />,
      label: "Skills",
      cx: 280,
      cy: 62,
      size: 112,
      iconSize: 40,
    },
    {
      icon: <BookOpen size={34} className="text-fg-1" />,
      label: "Memory",
      cx: 450,
      cy: 86,
      size: 96,
      iconSize: 34,
    },
  ];

  return (
    <div className={SLOT_CLASS}>
      {pillars.map((p) => (
        <div
          key={p.label}
          className="absolute flex flex-col items-center gap-2"
          style={{
            left: p.cx - p.size / 2,
            top: p.cy - p.size / 2,
          }}
        >
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: p.size,
              height: p.size,
              background: pillarBg,
            }}
          >
            {p.icon}
          </div>
          <div className="text-fg-1 text-sm leading-none font-bold tracking-tight">
            {p.label}
          </div>
        </div>
      ))}

      {/* Bottom: Tomo */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        <TomoSprite size={130} animate />
      </div>
    </div>
  );
}

// Step 6 — Let's build your team
// Three characters lined up in the exact starter trio colors (red / indigo /
// green), with the indigo one centered and larger, foreshadowing the very
// next screen. Uses the existing character grids rather than reskinning Tomo
// so the indigo brand lock on TomoSprite is preserved.
export function PickYourTeamIllustration() {
  const trio: Array<{
    grid: number[][];
    color: string;
    cx: number;
    cy: number;
    size: number;
    rotateDeg: number;
  }> = [
    {
      grid: RIO_GRID,
      color: STARTER_COLORS[0]!,
      cx: 110,
      cy: 162,
      size: 140,
      rotateDeg: -8,
    },
    {
      grid: TOMO_GRID,
      color: STARTER_COLORS[1]!,
      cx: 280,
      cy: 140,
      size: 200,
      rotateDeg: 0,
    },
    {
      grid: KAI_GRID,
      color: STARTER_COLORS[2]!,
      cx: 450,
      cy: 162,
      size: 140,
      rotateDeg: 8,
    },
  ];

  return (
    <div className={SLOT_CLASS}>
      {trio.map((c, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: c.cx - c.size / 2,
            top: c.cy - c.size / 2,
            transform: `rotate(${c.rotateDeg}deg)`,
          }}
        >
          <CharacterSprite
            grid={c.grid}
            color={c.color}
            size={18}
            displaySize={c.size}
            animate={false}
          />
        </div>
      ))}
    </div>
  );
}

// Step 5 — Launch them anywhere
// Three Hub terminal card headers offset diagonally, each showing Tomo as
// the character in the header running a different runtime on a different
// project. Reads as "Tomo everywhere at once."
export function LaunchIllustration() {
  // Three Hub-style session cards stepped diagonally down and to the right
  // so the stack fills the full 560x300 slot. Cards are wide enough that
  // the bottom card's right edge reaches the slot edge, and vertical
  // spacing places the first card flush to the top and the last flush to
  // the bottom.
  const sessions: Array<{
    project: string;
    runtime: string;
    left: number;
    top: number;
  }> = [
    { project: "~/api", runtime: "claude-code", left: 0, top: 8 },
    { project: "~/web", runtime: "codex", left: 80, top: 122 },
    { project: "~/docs", runtime: "gemini-cli", left: 160, top: 236 },
  ];

  return (
    <div className={SLOT_CLASS}>
      {sessions.map((s, i) => (
        <div
          key={s.project}
          className="absolute flex w-[400px] items-center gap-3 rounded-[20px] px-6 py-4"
          style={{
            left: s.left,
            top: s.top,
            background: INDIGO,
            zIndex: i,
          }}
        >
          <div className="shrink-0">
            <CharacterSprite
              grid={TOMO_GRID}
              color="#ffffff"
              size={18}
              displaySize={30}
              animate={false}
            />
          </div>
          <span className="text-base font-bold tracking-tight text-white">
            Tomo
          </span>
          <span
            className="rounded-full px-2.5 py-1 text-[10px] leading-none font-bold text-white"
            style={{ background: "rgba(255,255,255,0.22)" }}
          >
            {s.runtime}
          </span>
          <span className="flex-1" />
          <span className="font-mono text-[11px] text-white/75">
            {s.project}
          </span>
        </div>
      ))}
    </div>
  );
}
