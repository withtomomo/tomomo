import { describe, it, expect } from "vitest";
import {
  getTomomoDir,
  getAgentDir,
  getAgentsDir,
  getConfigPath,
  getUserMdPath,
  getSkillsDir,
  getAdaptersDir,
  getLogsDir,
  getTmpDir,
} from "./paths";
import { join } from "node:path";
import { homedir } from "node:os";

describe("paths", () => {
  const base = join(homedir(), ".tomomo");

  it("returns the tomomo root directory", () => {
    expect(getTomomoDir()).toBe(base);
  });

  it("returns the agents directory", () => {
    expect(getAgentsDir()).toBe(join(base, "agents"));
  });

  it("returns a specific agent directory", () => {
    expect(getAgentDir("web-dev")).toBe(join(base, "agents", "web-dev"));
  });

  it("returns the config path", () => {
    expect(getConfigPath()).toBe(join(base, "config.json"));
  });

  it("returns the user.md path", () => {
    expect(getUserMdPath()).toBe(join(base, "user.md"));
  });

  it("returns the global skills directory", () => {
    expect(getSkillsDir()).toBe(join(base, "skills"));
  });

  it("returns the adapters directory", () => {
    expect(getAdaptersDir()).toBe(join(base, "adapters"));
  });

  it("returns the logs directory", () => {
    expect(getLogsDir()).toBe(join(base, "logs"));
  });

  it("returns the tmp directory", () => {
    expect(getTmpDir()).toBe(join(base, "tmp"));
  });
});
