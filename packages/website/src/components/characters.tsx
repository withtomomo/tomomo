"use client";

import { useMemo } from "react";
import { CharacterSprite } from "@tomomo/ui";
import { genCharacter, CHARACTER_PALETTE } from "@tomomo/core/character";

const P = CHARACTER_PALETTE;

interface CharacterPlacement {
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
  hideOnMobile?: boolean;
}

const placements: CharacterPlacement[] = [
  { x: 0, y: 1, size: 540, rotation: -8, color: P[0] },
  { x: 97, y: 0, size: 560, rotation: 10, color: P[4] },
  { x: 1, y: 98, size: 540, rotation: 8, color: P[5] },
  { x: 96, y: 97, size: 500, rotation: -10, color: P[6] },

  { x: 28, y: 3, size: 260, rotation: 10, color: P[7] },
  { x: 48, y: 4, size: 200, rotation: -6, color: P[2], hideOnMobile: true },
  { x: 68, y: 2, size: 270, rotation: -8, color: P[3] },

  { x: 5, y: 38, size: 360, rotation: -12, color: P[6], hideOnMobile: true },
  { x: 7, y: 66, size: 300, rotation: 8, color: P[1], hideOnMobile: true },

  { x: 93, y: 36, size: 380, rotation: 12, color: P[7], hideOnMobile: true },
  { x: 91, y: 64, size: 320, rotation: -10, color: P[0], hideOnMobile: true },

  { x: 24, y: 96, size: 280, rotation: -6, color: P[1] },
  { x: 44, y: 97, size: 220, rotation: 4, color: P[4] },
  { x: 62, y: 96, size: 260, rotation: -5, color: P[2] },
  { x: 80, y: 97, size: 200, rotation: 8, color: P[3] },

  { x: 18, y: 18, size: 220, rotation: 12, color: P[3], hideOnMobile: true },
  { x: 80, y: 16, size: 120, rotation: -10, color: P[5], hideOnMobile: true },
  { x: 17, y: 46, size: 100, rotation: 6, color: P[7], hideOnMobile: true },
  { x: 82, y: 42, size: 200, rotation: -8, color: P[2], hideOnMobile: true },
  { x: 18, y: 72, size: 160, rotation: -10, color: P[4], hideOnMobile: true },
  { x: 80, y: 74, size: 80, rotation: 8, color: P[6], hideOnMobile: true },

  { x: 76, y: 60, size: 120, rotation: -15, color: P[1], hideOnMobile: true },
  { x: 22, y: 60, size: 80, rotation: 12, color: P[0], hideOnMobile: true },
  { x: 14, y: 86, size: 140, rotation: 5, color: P[3], hideOnMobile: true },
  { x: 84, y: 86, size: 160, rotation: -6, color: P[0], hideOnMobile: true },
];

export function Characters() {
  const characters = useMemo(() => {
    return placements.map((p, i) => {
      const char = genCharacter(`hero-v4-${i}`);
      return {
        ...p,
        id: i,
        grid: char.grid,
        gridSize: char.size,
      };
    });
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {characters.map((c) => (
        <div
          key={c.id}
          className={c.hideOnMobile ? "absolute max-md:hidden" : "absolute"}
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            width: c.size,
            height: c.size,
            transform: `translate(-50%, -50%) rotate(${c.rotation}deg)`,
            zIndex: 1,
          }}
        >
          <CharacterSprite
            grid={c.grid}
            color={c.color}
            size={c.gridSize}
            displaySize={c.size}
            animate={true}
          />
        </div>
      ))}
    </div>
  );
}
