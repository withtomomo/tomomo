import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

// We need to control the paths returned by the paths module
let mockMcpConfigPath: string;
let mockEnvPath: string;

vi.mock("../paths", () => ({
  getAgentMcpConfigPath: () => mockMcpConfigPath,
  getAgentEnvPath: () => mockEnvPath,
}));

import { listMcpServerStatus, removeMcpServerAndCleanEnv } from "./mcp-status";

let testDir: string;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "tomomo-mcp-status-"));
  mockMcpConfigPath = join(testDir, "mcp.json");
  mockEnvPath = join(testDir, ".env");
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("listMcpServerStatus", () => {
  it("returns empty array when no mcp.json exists", async () => {
    const result = await listMcpServerStatus("agent-1");
    expect(result).toEqual([]);
  });

  it("returns ready status when all env vars are present", async () => {
    await writeFile(
      mockMcpConfigPath,
      JSON.stringify({
        servers: {
          myserver: {
            command: "npx",
            args: ["-y", "@my/server"],
            env: { API_KEY: "${MY_KEY}" },
          },
        },
      }),
      "utf-8"
    );
    await writeFile(mockEnvPath, "MY_KEY=secret123\n", "utf-8");

    const result = await listMcpServerStatus("agent-1");
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("myserver");
    expect(result[0]!.status).toBe("ready");
    expect(result[0]!.missingVars).toEqual([]);
    expect(result[0]!.command).toBe("npx");
    expect(result[0]!.args).toEqual(["-y", "@my/server"]);
    expect(result[0]!.envKeys).toEqual(["API_KEY"]);
  });

  it("returns missing status when env vars are absent", async () => {
    await writeFile(
      mockMcpConfigPath,
      JSON.stringify({
        servers: {
          myserver: {
            command: "node",
            args: [],
            env: { TOKEN: "${MISSING_TOKEN}" },
          },
        },
      }),
      "utf-8"
    );
    // No .env file

    const result = await listMcpServerStatus("agent-1");
    expect(result).toHaveLength(1);
    expect(result[0]!.status).toBe("missing");
    expect(result[0]!.missingVars).toContain("MISSING_TOKEN");
  });

  it("handles servers with no env field", async () => {
    await writeFile(
      mockMcpConfigPath,
      JSON.stringify({
        servers: {
          simple: { command: "node", args: ["server.js"] },
        },
      }),
      "utf-8"
    );

    const result = await listMcpServerStatus("agent-1");
    expect(result).toHaveLength(1);
    expect(result[0]!.status).toBe("ready");
    expect(result[0]!.envKeys).toEqual([]);
    expect(result[0]!.missingVars).toEqual([]);
  });

  it("handles multiple servers with mixed status", async () => {
    await writeFile(
      mockMcpConfigPath,
      JSON.stringify({
        servers: {
          ready: {
            command: "node",
            args: [],
            env: { KEY: "${HAVE_IT}" },
          },
          broken: {
            command: "node",
            args: [],
            env: { KEY: "${DONT_HAVE}" },
          },
        },
      }),
      "utf-8"
    );
    await writeFile(mockEnvPath, "HAVE_IT=yes\n", "utf-8");

    const result = await listMcpServerStatus("agent-1");
    expect(result).toHaveLength(2);
    const ready = result.find((s) => s.name === "ready");
    const broken = result.find((s) => s.name === "broken");
    expect(ready!.status).toBe("ready");
    expect(broken!.status).toBe("missing");
  });

  it("detects multiple missing vars in a single env value", async () => {
    await writeFile(
      mockMcpConfigPath,
      JSON.stringify({
        servers: {
          multi: {
            command: "node",
            args: [],
            env: { URL: "https://${HOST}:${PORT}/api" },
          },
        },
      }),
      "utf-8"
    );

    const result = await listMcpServerStatus("agent-1");
    expect(result[0]!.missingVars).toContain("HOST");
    expect(result[0]!.missingVars).toContain("PORT");
  });
});

describe("removeMcpServerAndCleanEnv", () => {
  it("throws when server name is not found", async () => {
    await writeFile(
      mockMcpConfigPath,
      JSON.stringify({ servers: {} }),
      "utf-8"
    );

    await expect(
      removeMcpServerAndCleanEnv("agent-1", "nonexistent")
    ).rejects.toThrow("not found");
  });

  it("throws when mcp.json does not exist", async () => {
    await expect(removeMcpServerAndCleanEnv("agent-1", "any")).rejects.toThrow(
      "not found"
    );
  });

  it("removes server from config and cleans unused env vars", async () => {
    await writeFile(
      mockMcpConfigPath,
      JSON.stringify({
        servers: {
          toRemove: {
            command: "node",
            args: [],
            env: { SECRET: "${REMOVE_ME}" },
          },
          toKeep: {
            command: "node",
            args: [],
            env: { KEY: "${KEEP_ME}" },
          },
        },
      }),
      "utf-8"
    );
    await writeFile(mockEnvPath, "REMOVE_ME=gone\nKEEP_ME=stay\n", "utf-8");

    await removeMcpServerAndCleanEnv("agent-1", "toRemove");

    // Verify the config was updated
    const { readFile } = await import("node:fs/promises");
    const configContent = JSON.parse(
      await readFile(mockMcpConfigPath, "utf-8")
    );
    expect(configContent.servers["toRemove"]).toBeUndefined();
    expect(configContent.servers["toKeep"]).toBeDefined();

    // Verify .env was cleaned: REMOVE_ME should be gone, KEEP_ME should stay
    const envContent = await readFile(mockEnvPath, "utf-8");
    expect(envContent).not.toContain("REMOVE_ME");
    expect(envContent).toContain("KEEP_ME");
  });

  it("preserves shared env vars used by remaining servers", async () => {
    await writeFile(
      mockMcpConfigPath,
      JSON.stringify({
        servers: {
          serverA: {
            command: "node",
            args: [],
            env: { TOKEN: "${SHARED_TOKEN}" },
          },
          serverB: {
            command: "node",
            args: [],
            env: { TOKEN: "${SHARED_TOKEN}" },
          },
        },
      }),
      "utf-8"
    );
    await writeFile(mockEnvPath, "SHARED_TOKEN=abc\n", "utf-8");

    await removeMcpServerAndCleanEnv("agent-1", "serverA");

    const { readFile } = await import("node:fs/promises");
    const envContent = await readFile(mockEnvPath, "utf-8");
    // SHARED_TOKEN should still be present since serverB still uses it
    expect(envContent).toContain("SHARED_TOKEN");
  });
});
