import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

let testDir: string;

vi.mock("../paths", () => ({
  getAgentSessionsPath: (agentId: string) =>
    join(testDir, "agents", agentId, "sessions.json"),
}));

describe("sessions", () => {
  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "tomomo-sessions-"));
    vi.resetModules();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("returns null for unknown project", async () => {
    const { getLastSession } = await import("./sessions");
    const result = await getLastSession("agent-1", "unknownhash");
    expect(result).toBeNull();
  });

  it("stores and retrieves a session", async () => {
    const { storeSession, getLastSession } = await import("./sessions");
    await storeSession("agent-1", "abc123", "session-xyz");
    const session = await getLastSession("agent-1", "abc123");
    expect(session).not.toBeNull();
    expect(session?.lastSessionId).toBe("session-xyz");
    expect(session?.lastUsed).toBeTruthy();
  });

  it("overwrites session for same project", async () => {
    const { storeSession, getLastSession } = await import("./sessions");
    await storeSession("agent-1", "abc123", "session-first");
    await storeSession("agent-1", "abc123", "session-second");
    const session = await getLastSession("agent-1", "abc123");
    expect(session?.lastSessionId).toBe("session-second");
  });

  it("tracks sessions per project independently", async () => {
    const { storeSession, getLastSession } = await import("./sessions");
    await storeSession("agent-1", "proj-aaa", "session-for-aaa");
    await storeSession("agent-1", "proj-bbb", "session-for-bbb");
    const sessionA = await getLastSession("agent-1", "proj-aaa");
    const sessionB = await getLastSession("agent-1", "proj-bbb");
    expect(sessionA?.lastSessionId).toBe("session-for-aaa");
    expect(sessionB?.lastSessionId).toBe("session-for-bbb");
  });

  it("handles concurrent stores without losing data", async () => {
    const { storeSession, getLastSession } = await import("./sessions");
    await Promise.all([
      storeSession("agent-1", "proj-1", "session-1"),
      storeSession("agent-1", "proj-2", "session-2"),
    ]);
    const s1 = await getLastSession("agent-1", "proj-1");
    const s2 = await getLastSession("agent-1", "proj-2");
    expect(s1?.lastSessionId).toBe("session-1");
    expect(s2?.lastSessionId).toBe("session-2");
  });
});
