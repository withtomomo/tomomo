import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadMcpConfig,
  saveMcpConfig,
  parseEnvFile,
  saveEnvFile,
} from "@tomomo/core";
import type { McpConfig } from "@tomomo/core";
import { mcpCommand } from "./mcp";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "tomomo-mcp-test-"));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("mcp command structure", () => {
  it("has --json option", () => {
    const options = mcpCommand.options.map((o) => o.long);
    expect(options).toContain("--json");
  });

  it("has list subcommand", () => {
    const names = mcpCommand.commands.map((c) => c.name());
    expect(names).toContain("list");
  });

  it("has add subcommand", () => {
    const names = mcpCommand.commands.map((c) => c.name());
    expect(names).toContain("add");
  });

  it("has remove subcommand", () => {
    const names = mcpCommand.commands.map((c) => c.name());
    expect(names).toContain("remove");
  });

  it("add subcommand accepts variadic command argument", () => {
    const addCmd = mcpCommand.commands.find((c) => c.name() === "add")!;
    const cmdArg = addCmd.registeredArguments.find(
      (a) => a.name() === "command"
    )!;
    expect(cmdArg).toBeDefined();
    expect(cmdArg.variadic).toBe(true);
  });

  it("add subcommand has --env option", () => {
    const addCmd = mcpCommand.commands.find((c) => c.name() === "add")!;
    const options = addCmd.options.map((o) => o.long);
    expect(options).toContain("--env");
  });
});

describe("mcp config round-trip", () => {
  it("saves and loads mcp config", async () => {
    const mcpPath = join(tmpDir, "mcp.json");
    const config: McpConfig = {
      servers: {
        myserver: {
          command: "npx",
          args: ["-y", "@some/mcp-server"],
          env: { API_KEY: "${MY_API_KEY}" },
        },
      },
    };

    await saveMcpConfig(mcpPath, config);
    const loaded = await loadMcpConfig(mcpPath);

    expect(loaded).toEqual(config);
  });

  it("returns null for nonexistent mcp config", async () => {
    const mcpPath = join(tmpDir, "nonexistent.json");
    const result = await loadMcpConfig(mcpPath);
    expect(result).toBeNull();
  });

  it("preserves empty servers object", async () => {
    const mcpPath = join(tmpDir, "mcp.json");
    const config: McpConfig = { servers: {} };
    await saveMcpConfig(mcpPath, config);
    const loaded = await loadMcpConfig(mcpPath);
    expect(loaded).toEqual(config);
  });
});

describe("env file round-trip", () => {
  it("saves and parses env file", async () => {
    const envPath = join(tmpDir, ".env");
    const env = { MY_API_KEY: "abc123", ANOTHER_KEY: "xyz" };
    await saveEnvFile(envPath, env);
    const loaded = await parseEnvFile(envPath);
    expect(loaded).toEqual(env);
  });

  it("returns empty object for nonexistent .env", async () => {
    const envPath = join(tmpDir, ".env");
    const result = await parseEnvFile(envPath);
    expect(result).toEqual({});
  });

  it("handles env values with equals signs", async () => {
    const envPath = join(tmpDir, ".env");
    const env = { TOKEN: "abc=def=ghi" };
    await saveEnvFile(envPath, env);
    const loaded = await parseEnvFile(envPath);
    expect(loaded["TOKEN"]).toBe("abc=def=ghi");
  });
});

describe("adding a server creates correct mcp.json and .env entries", () => {
  it("stores ${VAR} reference in mcp.json and actual value in .env", async () => {
    const mcpPath = join(tmpDir, "mcp.json");
    const envPath = join(tmpDir, ".env");

    // Simulate what addMcpServer does
    const config: McpConfig = { servers: {} };
    const dotenv: Record<string, string> = {};

    const name = "github";
    const cmd = "npx";
    const args = ["-y", "@modelcontextprotocol/server-github"];
    const envPairs = ["GITHUB_TOKEN=ghp_secrettoken123"];

    for (const pair of envPairs) {
      const eqIndex = pair.indexOf("=");
      const key = pair.slice(0, eqIndex);
      const value = pair.slice(eqIndex + 1);
      // Store ${KEY} reference in mcp.json
      config.servers[name] = {
        command: cmd,
        args,
        env: { [key]: `\${${key}}` },
      };
      // Store actual value in .env
      dotenv[key] = value;
    }

    await saveMcpConfig(mcpPath, config);
    await saveEnvFile(envPath, dotenv);

    const loadedConfig = await loadMcpConfig(mcpPath);
    const loadedEnv = await parseEnvFile(envPath);

    expect(loadedConfig?.servers[name]?.env?.["GITHUB_TOKEN"]).toBe(
      "${GITHUB_TOKEN}"
    );
    expect(loadedEnv["GITHUB_TOKEN"]).toBe("ghp_secrettoken123");
  });

  it("stores server without env if no --env pairs", async () => {
    const mcpPath = join(tmpDir, "mcp.json");

    const config: McpConfig = {
      servers: {
        myserver: {
          command: "node",
          args: ["server.js"],
        },
      },
    };

    await saveMcpConfig(mcpPath, config);
    const loaded = await loadMcpConfig(mcpPath);

    expect(loaded?.servers["myserver"]?.env).toBeUndefined();
  });
});

describe("removing a server updates mcp.json", () => {
  it("deletes the named server and preserves others", async () => {
    const mcpPath = join(tmpDir, "mcp.json");

    const config: McpConfig = {
      servers: {
        first: { command: "node", args: ["a.js"] },
        second: { command: "node", args: ["b.js"] },
      },
    };

    await saveMcpConfig(mcpPath, config);

    // Simulate remove
    const loaded = await loadMcpConfig(mcpPath);
    if (loaded) {
      delete loaded.servers["first"];
      await saveMcpConfig(mcpPath, loaded);
    }

    const updated = await loadMcpConfig(mcpPath);
    expect(updated?.servers["first"]).toBeUndefined();
    expect(updated?.servers["second"]).toBeDefined();
  });

  it("handles removing the last server", async () => {
    const mcpPath = join(tmpDir, "mcp.json");

    const config: McpConfig = {
      servers: { only: { command: "node", args: [] } },
    };

    await saveMcpConfig(mcpPath, config);

    const loaded = await loadMcpConfig(mcpPath);
    if (loaded) {
      delete loaded.servers["only"];
      await saveMcpConfig(mcpPath, loaded);
    }

    const updated = await loadMcpConfig(mcpPath);
    expect(updated?.servers).toEqual({});
  });
});
