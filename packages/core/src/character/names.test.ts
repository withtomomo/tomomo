import { describe, it, expect } from "vitest";
import { AGENT_NAMES, generateAgentName } from "./names";

describe("AGENT_NAMES", () => {
  it("contains at least 100 names", () => {
    expect(AGENT_NAMES.length).toBeGreaterThanOrEqual(100);
  });

  it("has no duplicate entries", () => {
    expect(new Set(AGENT_NAMES).size).toBe(AGENT_NAMES.length);
  });

  it("every name is 2 to 5 characters", () => {
    for (const name of AGENT_NAMES) {
      expect(name.length).toBeGreaterThanOrEqual(2);
      expect(name.length).toBeLessThanOrEqual(5);
    }
  });

  it("every name is a capitalized word with only letters", () => {
    for (const name of AGENT_NAMES) {
      expect(name).toMatch(/^[A-Z][a-z]+$/);
    }
  });

  it("contains no known trademarks or copyrighted character names", () => {
    const banned = [
      "Siri",
      "Alexa",
      "Cortana",
      "Echo",
      "Kenzo",
      "Roo",
      "Obi",
      "Neo",
      "Yoda",
      "Mario",
      "Link",
      "Pikachu",
      "Pika",
      "Ash",
      "Ren",
      "Ezra",
      "Arlo",
    ];
    for (const b of banned) {
      expect(AGENT_NAMES).not.toContain(b);
    }
  });
});

describe("generateAgentName", () => {
  it("is deterministic for the same seed", () => {
    const a = generateAgentName("seed-alpha");
    const b = generateAgentName("seed-alpha");
    expect(a).toBe(b);
  });

  it("returns a name from AGENT_NAMES", () => {
    const name = generateAgentName("any-seed");
    expect(AGENT_NAMES).toContain(name);
  });

  it("distributes reasonably across different seeds", () => {
    const names = new Set<string>();
    for (let i = 0; i < 200; i++) {
      names.add(generateAgentName("distribute-" + i));
    }
    // Expect more than 10 distinct names across 200 seeds.
    expect(names.size).toBeGreaterThan(10);
  });
});
