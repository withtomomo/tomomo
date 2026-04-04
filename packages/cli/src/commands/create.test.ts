import { describe, it, expect } from "vitest";
import { createCommand } from "./create";

describe("create command", () => {
  it("has --prompt option (not --soul)", () => {
    const options = createCommand.options.map((o) => o.long);
    expect(options).toContain("--prompt");
    expect(options).not.toContain("--soul");
  });

  it("has --json option", () => {
    const options = createCommand.options.map((o) => o.long);
    expect(options).toContain("--json");
  });
});
