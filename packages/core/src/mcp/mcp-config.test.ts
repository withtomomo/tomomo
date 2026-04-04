import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, stat, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  parseEnvFile,
  saveEnvFile,
  resolveMcpConfig,
  loadMcpConfig,
  saveMcpConfig,
  writeTempMcpConfig,
  ensureAgentGitignore,
} from "./mcp-config";
import type { McpConfig } from "../types";

let testDir: string;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "tomomo-mcp-"));
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("parseEnvFile", () => {
  it("parses key=value pairs", async () => {
    const envPath = join(testDir, ".env");
    await writeFile(envPath, "FOO=bar\nBAZ=qux\n", "utf-8");
    const result = await parseEnvFile(envPath);
    expect(result).toEqual({ FOO: "bar", BAZ: "qux" });
  });

  it("skips comments and empty lines", async () => {
    const envPath = join(testDir, ".env");
    await writeFile(
      envPath,
      "# comment\n\nFOO=bar\n  # another comment\n",
      "utf-8"
    );
    const result = await parseEnvFile(envPath);
    expect(result).toEqual({ FOO: "bar" });
  });

  it("handles values with equals signs (split on first = only)", async () => {
    const envPath = join(testDir, ".env");
    await writeFile(envPath, "TOKEN=abc=def=ghi\n", "utf-8");
    const result = await parseEnvFile(envPath);
    expect(result).toEqual({ TOKEN: "abc=def=ghi" });
  });

  it("returns empty object for missing file", async () => {
    const result = await parseEnvFile(join(testDir, "nonexistent.env"));
    expect(result).toEqual({});
  });

  it("handles export prefix", async () => {
    const envPath = join(testDir, ".env");
    await writeFile(
      envPath,
      "export API_KEY=abc123\nexport SECRET=xyz\n",
      "utf-8"
    );
    const result = await parseEnvFile(envPath);
    expect(result.API_KEY).toBe("abc123");
    expect(result.SECRET).toBe("xyz");
  });

  it("strips inline comments from unquoted values", async () => {
    const envPath = join(testDir, ".env");
    await writeFile(
      envPath,
      'TOKEN=abc123 # my api token\nKEY="value with # hash"\n',
      "utf-8"
    );
    const result = await parseEnvFile(envPath);
    expect(result.TOKEN).toBe("abc123");
    // Quoted values should preserve the # character
    expect(result.KEY).toBe("value with # hash");
  });
});

describe("saveEnvFile", () => {
  it("writes env file with 0600 permissions", async () => {
    const envPath = join(testDir, ".env");
    await saveEnvFile(envPath, { FOO: "bar", BAZ: "qux" });
    const fileStat = await stat(envPath);
    expect(fileStat.mode & 0o777).toBe(0o600);
    const content = await readFile(envPath, "utf-8");
    expect(content).toContain("FOO=bar");
    expect(content).toContain("BAZ=qux");
  });
});

describe("resolveMcpConfig", () => {
  it("resolves ${VAR} references from env map", () => {
    const config: McpConfig = {
      servers: {
        myserver: {
          command: "node",
          args: [],
          env: { API_KEY: "${MY_KEY}" },
        },
      },
    };
    const result = resolveMcpConfig(config, { MY_KEY: "secret123" });
    expect(result.config.servers["myserver"]?.env?.["API_KEY"]).toBe(
      "secret123"
    );
    expect(result.skipped).toHaveLength(0);
  });

  it("skips servers with missing vars, reports them in skipped array", () => {
    const config: McpConfig = {
      servers: {
        myserver: {
          command: "node",
          args: [],
          env: { API_KEY: "${MISSING_VAR}" },
        },
      },
    };
    const result = resolveMcpConfig(config, {});
    expect(result.config.servers["myserver"]).toBeUndefined();
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]?.name).toBe("myserver");
    expect(result.skipped[0]?.missingVars).toContain("MISSING_VAR");
  });

  it("passes through values without ${} references", () => {
    const config: McpConfig = {
      servers: {
        myserver: {
          command: "node",
          args: ["--flag"],
          env: { STATIC_VAR: "plain_value" },
        },
      },
    };
    const result = resolveMcpConfig(config, {});
    expect(result.config.servers["myserver"]?.env?.["STATIC_VAR"]).toBe(
      "plain_value"
    );
    expect(result.skipped).toHaveLength(0);
  });

  it("handles servers with no env field", () => {
    const config: McpConfig = {
      servers: {
        noenv: {
          command: "node",
          args: [],
        },
      },
    };
    const result = resolveMcpConfig(config, {});
    expect(result.config.servers["noenv"]).toBeDefined();
    expect(result.skipped).toHaveLength(0);
  });
});

describe("loadMcpConfig / saveMcpConfig", () => {
  it("returns null for missing file", async () => {
    const result = await loadMcpConfig(join(testDir, "nonexistent.json"));
    expect(result).toBeNull();
  });

  it("round-trips correctly", async () => {
    const configPath = join(testDir, "mcp.json");
    const config: McpConfig = {
      servers: {
        myserver: {
          command: "npx",
          args: ["-y", "@my/server"],
          env: { KEY: "${MY_KEY}" },
        },
      },
    };
    await saveMcpConfig(configPath, config);
    const loaded = await loadMcpConfig(configPath);
    expect(loaded).toEqual(config);
  });
});

describe("writeTempMcpConfig", () => {
  it("writes with 0600 permissions", async () => {
    const config: McpConfig = {
      servers: {
        myserver: {
          command: "node",
          args: [],
        },
      },
    };
    const tmpPath = await writeTempMcpConfig(config);
    const fileStat = await stat(tmpPath);
    expect(fileStat.mode & 0o777).toBe(0o600);
    await rm(tmpPath, { force: true });
  });

  it("uses mcpServers key in output (not servers)", async () => {
    const config: McpConfig = {
      servers: {
        myserver: {
          command: "node",
          args: [],
        },
      },
    };
    const tmpPath = await writeTempMcpConfig(config);
    const content = await readFile(tmpPath, "utf-8");
    const parsed = JSON.parse(content) as Record<string, unknown>;
    expect(parsed["mcpServers"]).toBeDefined();
    expect(parsed["servers"]).toBeUndefined();
    await rm(tmpPath, { force: true });
  });

  it("returns a valid path", async () => {
    const config: McpConfig = { servers: {} };
    const tmpPath = await writeTempMcpConfig(config);
    expect(typeof tmpPath).toBe("string");
    expect(tmpPath.length).toBeGreaterThan(0);
    const fileStat = await stat(tmpPath);
    expect(fileStat.isFile()).toBe(true);
    await rm(tmpPath, { force: true });
  });
});

describe("ensureAgentGitignore", () => {
  it("creates new .gitignore with .env entry", async () => {
    const gitignorePath = join(testDir, ".gitignore");
    await ensureAgentGitignore(gitignorePath);
    const content = await readFile(gitignorePath, "utf-8");
    expect(content).toContain(".env");
  });

  it("appends .env to existing .gitignore without it", async () => {
    const gitignorePath = join(testDir, ".gitignore");
    await writeFile(gitignorePath, "node_modules\n*.log\n", "utf-8");
    await ensureAgentGitignore(gitignorePath);
    const content = await readFile(gitignorePath, "utf-8");
    expect(content).toContain("node_modules");
    expect(content).toContain(".env");
  });

  it("does not duplicate .env if already present", async () => {
    const gitignorePath = join(testDir, ".gitignore");
    await writeFile(gitignorePath, "node_modules\n.env\n", "utf-8");
    await ensureAgentGitignore(gitignorePath);
    const content = await readFile(gitignorePath, "utf-8");
    const matches = content.match(/\.env/g);
    expect(matches).toHaveLength(1);
  });
});
