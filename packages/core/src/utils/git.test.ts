import { describe, it, expect } from "vitest";
import { getGitRemoteUrl } from "./git";

describe("getGitRemoteUrl", () => {
  it("returns a string or null for the current directory", async () => {
    // The test runner runs from a git repo, so this may return a URL or null
    const result = await getGitRemoteUrl(process.cwd());
    expect(result === null || typeof result === "string").toBe(true);
    if (result !== null) {
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it("returns null for /tmp (no git remote)", async () => {
    const result = await getGitRemoteUrl("/tmp");
    expect(result).toBeNull();
  });
});
