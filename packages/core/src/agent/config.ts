import { getConfigPath } from "../paths";
import { readJsonFile, writeJsonFile } from "../utils/files";
import { DEFAULT_CONFIG, type GlobalConfig } from "../types";
import { GlobalConfigSchema } from "../schemas";

export async function loadConfig(): Promise<GlobalConfig> {
  const config = await readJsonFile<GlobalConfig>(getConfigPath());
  if (!config) {
    return { ...DEFAULT_CONFIG };
  }

  // Read-side migration: if introComplete is missing from an older config,
  // default it to the onboardingComplete value so existing users who already
  // finished onboarding do not see the intro, while brand-new users do.
  const migrated = { ...config };
  if (migrated.introComplete === undefined) {
    migrated.introComplete = migrated.onboardingComplete ?? false;
  }

  const merged = {
    ...DEFAULT_CONFIG,
    ...migrated,
    defaults: {
      ...DEFAULT_CONFIG.defaults,
      ...migrated.defaults,
      memoryBudget: {
        ...DEFAULT_CONFIG.defaults.memoryBudget,
        ...migrated.defaults?.memoryBudget,
      },
    },
    adapters: {
      ...DEFAULT_CONFIG.adapters,
      ...migrated.adapters,
    },
  };

  const result = GlobalConfigSchema.safeParse(merged);
  if (!result.success) {
    console.warn(
      `Warning: config.json is invalid, using defaults. ${result.error.message}`
    );
    return { ...DEFAULT_CONFIG };
  }
  return result.data;
}

export async function saveConfig(config: GlobalConfig): Promise<void> {
  await writeJsonFile(getConfigPath(), config);
}
