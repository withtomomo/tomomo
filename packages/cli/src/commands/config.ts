import { Command } from "commander";
import {
  loadConfig,
  saveConfig,
  getTomomoDir,
  DEFAULT_CONFIG,
} from "@tomomo/core";

// Validate that a dot-notation key exists in the default config structure
function isValidConfigKey(key: string): boolean {
  const parts = key.split(".");
  let current: unknown = DEFAULT_CONFIG;
  for (const part of parts) {
    if (typeof current !== "object" || current === null) return false;
    const obj = current as Record<string, unknown>;
    if (!(part in obj)) return false;
    current = obj[part];
  }
  return true;
}

export const configCommand = new Command("config")
  .description("View or set global config")
  .argument("[key]", "Config key to get or set")
  .argument("[value]", "Value to set")
  .option("--path", "Show config directory path")
  .option("--json", "Output as JSON")
  .action(async (key, value, options) => {
    if (options.path) {
      console.log(getTomomoDir());
      return;
    }

    const config = await loadConfig();

    if (!key) {
      console.log(JSON.stringify(config, null, 2));
      return;
    }

    if (value !== undefined) {
      // Validate key exists in the config schema
      if (!isValidConfigKey(key)) {
        console.error(
          `Unknown config key: "${key}". Run 'tomomo config' to see available keys.`
        );
        process.exit(1);
      }

      // Simple dot-notation set
      const parts = key.split(".");
      let target: Record<string, unknown> = config as unknown as Record<
        string,
        unknown
      >;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]!;
        if (typeof target[part] !== "object" || target[part] === null) {
          console.error(`Invalid config key: ${key}`);
          process.exit(1);
        }
        target = target[part] as Record<string, unknown>;
      }
      const lastKey = parts[parts.length - 1]!;

      // Try to parse as JSON, fall back to string
      try {
        target[lastKey] = JSON.parse(value);
      } catch {
        target[lastKey] = value;
      }

      await saveConfig(config);
      console.log(`Set ${key} = ${JSON.stringify(target[lastKey])}`);
      return;
    }

    // Get a specific key
    const parts = key.split(".");
    let current: unknown = config;
    for (const part of parts) {
      if (typeof current !== "object" || current === null) {
        console.error(`Key not found: ${key}`);
        process.exit(1);
      }
      current = (current as Record<string, unknown>)[part];
    }
    console.log(JSON.stringify(current, null, 2));
  });
