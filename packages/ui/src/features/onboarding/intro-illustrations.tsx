import React from "react";
import { Heart, Sparkles, BookOpen, Terminal } from "lucide-react";
import { CharacterSprite } from "../../components/character-sprite";
import { TomoSprite, TOMO_GRID } from "../../components/tomo-sprite";

// Every intro illustration renders inside a fixed 560x300 slot so the text
// position stays constant across slides 1-5. Slide 6 has no illustration at
// all and simply centers its title + body text.
//
// Tomo is the onboarding narrator. On slide 1 he stands alone and centered
// to introduce himself. On slides 2-5 he anchors the left side at a
// consistent size and position, "presenting" the feature visual to his
// right. This consistent narrator pattern makes the whole intro feel like
// a guided tour rather than a slideshow.
//
// Characters render directly in their own color per the design rule:
// "Characters are free. Agent avatars render on transparent backgrounds."
// Illustrations use only @tomomo/ui atoms and lucide icons, no custom SVG
// art and no gradients. Only Tomo animates.

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

// Shared narrator geometry for slides 2-5. Tomo always sits at the same
// size so he feels like a guide walking the user through each feature.
// Side is either "left" (default) or "right"; the feature visual goes on
// the opposite side.
const NARRATOR_SIZE = 150;
const NARRATOR_MARGIN = 40;
const NARRATOR_TOP = 75;
// Slot width 560 minus margin and Tomo size, for the right-anchored variant.
const NARRATOR_RIGHT_LEFT = 560 - NARRATOR_MARGIN - NARRATOR_SIZE;

function TomoNarrator({ side = "left" }: { side?: "left" | "right" }) {
  return (
    <div
      className="absolute"
      style={{
        left: side === "left" ? NARRATOR_MARGIN : NARRATOR_RIGHT_LEFT,
        top: NARRATOR_TOP,
      }}
    >
      <TomoSprite size={NARRATOR_SIZE} animate />
    </div>
  );
}

// Step 1 — Hello
// Tomo at full narrator scale, centered. The only slide where Tomo stands
// alone, because this is the moment he introduces himself. Uses an
// overflow-visible slot so he can render larger than the 300 px slot
// height without pushing the title/body below; the slot's fixed height
// keeps the layout below constant.
export function HelloIllustration() {
  return (
    <div
      className={`${SLOT_CLASS} flex items-center justify-center`}
      style={{ overflow: "visible" }}
    >
      <TomoSprite size={340} animate />
    </div>
  );
}

// Step 2 — Meet your agents
// Tomo on the left as the narrator, presenting a cluster of four other
// agents arranged in a soft 2x2 grid on the right. Each agent uses a
// different palette color and a gentle rotation so the team reads as a
// hand-picked crew rather than a row.
export function AgentsLineupIllustration() {
  // Four agents in a loose 2x2 cluster on the right. Sizes vary
  // dramatically (74 to 138, nearly 2x ratio) so the team reads as a
  // hand-picked crew with real depth, not a uniform grid.
  const team: Array<{
    grid: number[][];
    color: string;
    cx: number;
    cy: number;
    size: number;
    rotateDeg: number;
  }> = [
    // Upper-left — the giant
    {
      grid: MIRA_GRID,
      color: MIRA_ORANGE,
      cx: 295,
      cy: 92,
      size: 138,
      rotateDeg: -9,
    },
    // Upper-right — the smallest
    {
      grid: KAI_GRID,
      color: KAI_TEAL,
      cx: 460,
      cy: 105,
      size: 76,
      rotateDeg: 14,
    },
    // Lower-left — small-medium
    {
      grid: RIO_GRID,
      color: RIO_PINK,
      cx: 290,
      cy: 228,
      size: 86,
      rotateDeg: 11,
    },
    // Lower-right — medium-large
    {
      grid: SUN_GRID,
      color: SUN_PURPLE,
      cx: 460,
      cy: 215,
      size: 124,
      rotateDeg: -7,
    },
  ];

  return (
    <div className={SLOT_CLASS}>
      <TomoNarrator />
      {team.map((c, i) => (
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

// Step 3 — Powered by anything
// Tomo on the right, three runtime pills stacked vertically on the left.
// The top and bottom pills sit flush; the middle codex pill shifts right
// toward Tomo so the stack forms a soft arrow pointing at him. The visual
// reads as "all these runtimes feed into Tomo".
export function RuntimeStackIllustration() {
  const pillWidth = 230;
  const pillHeight = 54;
  const pillGap = 18;
  const stackHeight = pillHeight * 3 + pillGap * 2;
  // Base center for top and bottom pills. Middle pill gets an extra
  // rightward nudge so its right edge reaches closer to Tomo.
  const baseCx = 160;
  const middleNudge = 46;
  const stackTop = 150 - stackHeight / 2;

  const runtimes: Array<{ name: string; color: string }> = [
    { name: "claude-code", color: MIRA_ORANGE },
    { name: "codex", color: SUN_PURPLE },
    { name: "gemini-cli", color: KAI_TEAL },
  ];

  return (
    <div className={SLOT_CLASS}>
      <TomoNarrator side="right" />
      {runtimes.map((rt, i) => {
        const cx = i === 1 ? baseCx + middleNudge : baseCx;
        return (
          <div
            key={rt.name}
            className="absolute flex items-center gap-3 rounded-full px-6 text-base font-semibold text-white"
            style={{
              left: cx - pillWidth / 2,
              top: stackTop + i * (pillHeight + pillGap),
              width: pillWidth,
              height: pillHeight,
              background: rt.color,
            }}
          >
            <Terminal size={18} color="#ffffff" />
            {rt.name}
          </div>
        );
      })}
    </div>
  );
}

// Step 4 — What makes them yours
// Tomo on the left, three labeled pillar circles scattered across the
// right side. The circles use the indigo-tinted stats-container pattern
// so they stay neutral chrome and don't compete with Tomo's color. Each
// circle sits at its own x, y, and size so the trio reads as a sparse,
// hand-placed constellation instead of a flat row.
export function PillarsIllustration() {
  const pillarBg = `color-mix(in srgb, ${INDIGO} 12%, var(--bg-1))`;
  const labelGap = 10;

  const pillars: Array<{
    icon: (size: number) => React.ReactNode;
    label: string;
    cx: number;
    cy: number;
    size: number;
  }> = [
    // Soul — upper left of the cluster, medium
    {
      icon: (s) => <Heart size={s} className="text-fg-1" strokeWidth={1.75} />,
      label: "Soul",
      cx: 260,
      cy: 80,
      size: 90,
    },
    // Skills — lower middle, the largest (the "main" pillar visually)
    {
      icon: (s) => (
        <Sparkles size={s} className="text-fg-1" strokeWidth={1.75} />
      ),
      label: "Skills",
      cx: 395,
      cy: 190,
      size: 110,
    },
    // Memory — upper right, smaller
    {
      icon: (s) => (
        <BookOpen size={s} className="text-fg-1" strokeWidth={1.75} />
      ),
      label: "Memory",
      cx: 510,
      cy: 90,
      size: 82,
    },
  ];

  return (
    <div className={SLOT_CLASS}>
      <TomoNarrator />
      {pillars.map((p) => {
        const iconSize = Math.round(p.size * 0.38);
        return (
          <div
            key={p.label}
            className="absolute flex flex-col items-center"
            style={{
              left: p.cx - p.size / 2,
              top: p.cy - p.size / 2,
              width: p.size,
              gap: labelGap,
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
              {p.icon(iconSize)}
            </div>
            <div className="text-fg-1 text-sm leading-none font-semibold">
              {p.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Step 5 — Launch them anywhere
// Tomo on the right, one Hub-style terminal card on the left showing a
// real-looking launch session. The card mirrors the real Tomomo Hub
// terminal: an agent-color header strip with character + name + runtime
// pill, then a neutral bg-1 body with multi-line monospace output. Tomo
// appears inside the terminal header as the agent being launched, so the
// metaphor is literally "launch Tomo into a terminal".
export function LaunchIllustration() {
  type Segment = {
    text: string;
    className?: string;
    style?: React.CSSProperties;
  };
  type Line = ReadonlyArray<Segment>;

  const successStyle: React.CSSProperties = { color: "var(--color-success)" };

  const lines: ReadonlyArray<Line> = [
    [
      { text: "~/api", className: "text-fg-3" },
      { text: " $ ", className: "text-fg-3" },
      { text: "tomomo launch tomo", className: "text-fg-2" },
    ],
    [
      { text: "✓ ", style: successStyle },
      { text: "session ready", className: "text-fg-2" },
    ],
    [
      { text: "Tomo:", style: { color: INDIGO } },
      { text: " reviewing auth...", className: "text-fg-1" },
    ],
    [
      { text: "✓ ", style: successStyle },
      { text: "2 fixes applied", className: "text-fg-2" },
    ],
    [
      { text: "✓ ", style: successStyle },
      { text: "42 tests passed", className: "text-fg-2" },
    ],
  ];

  const cardLeft = 25;
  const cardTop = 50;
  const cardWidth = 310;

  return (
    <div className={SLOT_CLASS}>
      <TomoNarrator side="right" />
      <div
        className="bg-bg-1 absolute overflow-hidden rounded-[18px] text-left"
        style={{
          left: cardLeft,
          top: cardTop,
          width: cardWidth,
          transform: "rotate(2deg)",
        }}
      >
        {/* Header strip — bold flat indigo, matching real Hub terminal headers */}
        <div
          className="flex items-center gap-2.5 px-4 py-3"
          style={{ background: INDIGO }}
        >
          <div className="shrink-0">
            <CharacterSprite
              grid={TOMO_GRID}
              color="#ffffff"
              size={18}
              displaySize={26}
              animate={false}
            />
          </div>
          <span className="text-sm font-semibold text-white">Tomo</span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] leading-none font-bold text-white"
            style={{ background: "rgba(255,255,255,0.22)" }}
          >
            claude-code
          </span>
          <span className="flex-1" />
          <span
            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: "#ffffff" }}
          />
        </div>
        {/* Terminal body — neutral bg-1, multi-line monospace output */}
        <div className="flex flex-col gap-1 px-4 py-4 font-mono text-[11px] leading-[1.4]">
          {lines.map((line, li) => (
            <div key={li}>
              {line.map((seg, si) => (
                <span key={si} className={seg.className} style={seg.style}>
                  {seg.text}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
