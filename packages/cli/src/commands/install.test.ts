import { describe, it, expect } from "vitest";
import { installCommand } from "./install";

describe("install command", () => {
  it("has --name option", () => {
    const options = installCommand.options.map((o) => o.long);
    expect(options).toContain("--name");
  });

  it("has --json option", () => {
    const options = installCommand.options.map((o) => o.long);
    expect(options).toContain("--json");
  });

  it("requires a source argument", () => {
    const args = installCommand.registeredArguments;
    expect(args.length).toBeGreaterThan(0);
    expect(args[0]!.required).toBe(true);
  });
});
