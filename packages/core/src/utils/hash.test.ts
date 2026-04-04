import { describe, it, expect } from "vitest";
import { shortHash } from "./hash";

describe("shortHash", () => {
  it("returns a 12 character hex string", () => {
    const result = shortHash("hello");
    expect(result).toHaveLength(12);
    expect(result).toMatch(/^[a-f0-9]{12}$/);
  });

  it("is deterministic", () => {
    expect(shortHash("test-input")).toBe(shortHash("test-input"));
  });

  it("produces different hashes for different inputs", () => {
    expect(shortHash("input-a")).not.toBe(shortHash("input-b"));
  });
});
