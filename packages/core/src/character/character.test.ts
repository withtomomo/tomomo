import { describe, it, expect } from "vitest";
import { genCharacter, CHARACTER_PALETTE } from "./character";

describe("genCharacter", () => {
  it("returns an 18x18 grid", () => {
    const result = genCharacter("test-agent");
    expect(result.size).toBe(18);
    expect(result.grid).toHaveLength(18);
    result.grid.forEach((row) => {
      expect(row).toHaveLength(18);
    });
  });

  it("returns a color from the palette", () => {
    const result = genCharacter("test-agent");
    expect(CHARACTER_PALETTE).toContain(result.color);
  });

  it("is deterministic (same seed = same output)", () => {
    const a = genCharacter("ember");
    const b = genCharacter("ember");
    expect(a.grid).toEqual(b.grid);
    expect(a.color).toBe(b.color);
  });

  it("produces different output for different seeds", () => {
    const a = genCharacter("ember");
    const b = genCharacter("drift");
    const sameOutput =
      a.color === b.color && JSON.stringify(a.grid) === JSON.stringify(b.grid);
    expect(sameOutput).toBe(false);
  });

  it("always has eyes (negative space pixels)", () => {
    const seeds = ["agent-1", "agent-2", "agent-3", "agent-4", "agent-5"];
    for (const seed of seeds) {
      const result = genCharacter(seed);
      const hasEyes = result.grid.some((row) => row.some((cell) => cell === 2));
      expect(hasEyes).toBe(true);
    }
  });

  it("always has body pixels", () => {
    const result = genCharacter("test");
    const hasBody = result.grid.some((row) => row.some((cell) => cell === 1));
    expect(hasBody).toBe(true);
  });

  it("grid values are only 0, 1, or 2", () => {
    const result = genCharacter("validation-test");
    result.grid.forEach((row) => {
      row.forEach((cell) => {
        expect([0, 1, 2]).toContain(cell);
      });
    });
  });
});

describe("genCharacter RNG stability", () => {
  it("keeps the RNG sequence stable for backwards compatibility", () => {
    // Snapshots the grid for a fixed seed so future changes to the
    // generation algorithm are caught before they silently drift the
    // shapes rendered for existing on-disk agents.
    const result = genCharacter("regression-guard-seed-1");
    expect(result.grid).toMatchSnapshot();
  });
});
