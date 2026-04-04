import { describe, it, expect } from "vitest";
import { renderCharacterToTerminal } from "./character-render";
import { genCharacter } from "./character";

describe("renderCharacterToTerminal", () => {
  it("returns a non-empty string", () => {
    const character = genCharacter("test");
    const result = renderCharacterToTerminal(character);
    expect(result.length).toBeGreaterThan(0);
  });

  it("produces 9 lines (18 pixels / 2 per row)", () => {
    const character = genCharacter("test");
    const result = renderCharacterToTerminal(character);
    const lines = result.split("\n").filter((l) => l.length > 0);
    expect(lines).toHaveLength(9);
  });

  it("is deterministic", () => {
    const character = genCharacter("ember");
    const a = renderCharacterToTerminal(character);
    const b = renderCharacterToTerminal(character);
    expect(a).toBe(b);
  });

  it("produces different output for different characters", () => {
    const a = renderCharacterToTerminal(genCharacter("ember"));
    const b = renderCharacterToTerminal(genCharacter("drift"));
    expect(a).not.toBe(b);
  });
});
