import type { AgentConfig } from "../types";

type Migration = (config: Record<string, unknown>) => Record<string, unknown>;

const migrations: Record<number, Migration> = {
  // Version 1 is the initial version, no migration needed
  // Future migrations go here:
  // 2: (config) => ({ ...config, newField: "default", version: 2 }),
};

export function migrateAgent(config: Record<string, unknown>): AgentConfig {
  let current = { ...config };
  const currentVersion = (current.version as number) ?? 0;
  const targetVersion = 1; // Current schema version

  for (let v = currentVersion + 1; v <= targetVersion; v++) {
    const migration = migrations[v];
    if (migration) {
      current = migration(current);
    }
    current.version = v;
  }

  return current as unknown as AgentConfig;
}

export function needsMigration(config: Record<string, unknown>): boolean {
  const version = (config.version as number) ?? 0;
  return version < 1;
}
