import chalk from "chalk";
import type { CharacterData } from "../types";

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function renderCharacterToTerminal(character: CharacterData): string {
  const { grid, color, size } = character;
  const [r, g, b] = hexToRgb(color);
  const colorize = chalk.rgb(r, g, b);

  const lines: string[] = [];

  for (let y = 0; y < size; y += 2) {
    let line = "";
    for (let x = 0; x < size; x++) {
      const top = grid[y]?.[x] ?? 0;
      const bottom = grid[y + 1]?.[x] ?? 0;

      // Grid values: 0=empty, 1=filled body, 2=eyes/cheeks (negative space, renders as background)
      const topFilled = top === 1;
      const bottomFilled = bottom === 1;

      if (topFilled && bottomFilled) {
        line += colorize("\u2588");
      } else if (topFilled && !bottomFilled) {
        line += colorize("\u2580");
      } else if (!topFilled && bottomFilled) {
        line += colorize("\u2584");
      } else {
        line += " ";
      }
    }
    lines.push(line);
  }

  return lines.join("\n") + "\n";
}
