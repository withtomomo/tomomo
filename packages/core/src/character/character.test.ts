import { describe, it, expect } from "vitest";
import { genCharacter, CHARACTER_PALETTE, STARTER_COLORS } from "./character";

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

describe("genCharacter color override", () => {
  it("uses the explicit color when provided", () => {
    const result = genCharacter("test-agent", { color: "#FF9922" });
    expect(result.color).toBe("#FF9922");
  });

  it("falls back to the palette pick when no color option is provided", () => {
    const result = genCharacter("test-agent");
    expect(CHARACTER_PALETTE).toContain(result.color);
  });

  it("produces an identical grid regardless of color override", () => {
    const baseline = genCharacter("shape-stability-seed");
    const overridden = genCharacter("shape-stability-seed", {
      color: "#00BBAA",
    });
    expect(overridden.grid).toEqual(baseline.grid);
    expect(overridden.size).toBe(baseline.size);
  });

  it("keeps the RNG sequence stable for backwards compatibility", () => {
    // This snapshot guards against character shape drift for existing agents.
    const result = genCharacter("regression-guard-seed-1");
    expect(result.grid).toMatchSnapshot();
  });
});

describe("STARTER_COLORS", () => {
  it("contains exactly three colors", () => {
    expect(STARTER_COLORS).toHaveLength(3);
  });

  it("includes red, indigo, and gold in that order", () => {
    // Indigo sits at index 1 so StarterPick's default selectedIndex=1
    // lands on the brand accent in the center hero slot.
    expect(STARTER_COLORS).toEqual(["#FF5555", "#5B6CFF", "#DDBB00"]);
  });

  it("has no duplicates", () => {
    expect(new Set(STARTER_COLORS).size).toBe(STARTER_COLORS.length);
  });

  it("only contains colors from CHARACTER_PALETTE", () => {
    for (const c of STARTER_COLORS) {
      expect(CHARACTER_PALETTE).toContain(c);
    }
  });
});
