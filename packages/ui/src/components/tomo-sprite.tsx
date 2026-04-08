import React from "react";
import { CharacterSprite } from "./character-sprite";

// Tomo is the Tomomo brand mascot. This 18x18 grid is extracted pixel-exact
// from assets/icon-dark.png (a 12x13 native grid padded to 18x18 centered).
//
// The value 2 cells are the eye cutouts. They render as negative space until
// the CharacterSprite blink animation closes them (value 2 becomes body color
// while blinking). The grid contains one intentional 1-pixel asymmetry on
// row 10 col 4 vs col 13 that matches the brand icon.
//
// Exported so intro illustrations can render Tomo in a non-indigo context
// (e.g., white-on-indigo inside a terminal card header). Prefer TomoSprite
// for any standalone Tomo rendering — it locks the color to indigo.
export const TOMO_GRID: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 2, 1, 1, 1, 1, 2, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Tomo's color is locked to the indigo brand accent. This is not overridable.
const TOMO_COLOR = "#5B6CFF";

export interface TomoSpriteProps {
  // Rendered size in pixels. Default 180 (intro narrator scale).
  size?: number;
  // Whether to run the idle animation. Default true.
  animate?: boolean;
  className?: string;
}

export function TomoSprite({
  size = 180,
  animate = true,
  className,
}: TomoSpriteProps) {
  return (
    <CharacterSprite
      grid={TOMO_GRID}
      color={TOMO_COLOR}
      size={18}
      displaySize={size}
      animate={animate}
      className={className}
    />
  );
}
