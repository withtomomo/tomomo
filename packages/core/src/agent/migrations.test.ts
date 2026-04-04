import { describe, it, expect } from "vitest";
import { migrateAgent, needsMigration } from "./migrations";

describe("migrations", () => {
  it("identifies configs needing migration", () => {
    expect(needsMigration({ version: 0 })).toBe(true);
    expect(needsMigration({ version: 1 })).toBe(false);
    expect(needsMigration({})).toBe(true);
  });

  it("migrates version 0 to version 1", () => {
    const old = {
      id: "test",
      name: "Test",
      description: "",
      runtime: "claude-code",
      createdAt: "2024-01-01",
      lastUsed: "2024-01-01",
      launchCount: 5,
      memoryBudget: { agentMemoryChars: 8000, projectMemoryChars: 8000 },
    };

    const migrated = migrateAgent(old);
    expect(migrated.version).toBe(1);
    expect(migrated.id).toBe("test");
    expect(migrated.launchCount).toBe(5);
  });

  it("does not modify already current configs", () => {
    const current = {
      version: 1,
      id: "test",
      name: "Test",
      description: "",
      runtime: "claude-code",
      createdAt: "2024-01-01",
      lastUsed: "2024-01-01",
      launchCount: 0,
      memoryBudget: { agentMemoryChars: 8000, projectMemoryChars: 8000 },
    };

    const result = migrateAgent(current);
    expect(result.version).toBe(1);
  });
});
