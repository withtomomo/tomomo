import { getConfigPath } from "../paths";
import { readJsonFile, writeJsonFile } from "../utils/files";
import { DEFAULT_CONFIG, type GlobalConfig } from "../types";
import { GlobalConfigSchema } from "../schemas";

export async function loadConfig(): Promise<GlobalConfig> {
  const config = await readJsonFile<GlobalConfig>(getConfigPath());
  if (!config) {
    return { ...DEFAULT_CONFIG };
  }
  const merged = {
    ...DEFAULT_CONFIG,
    ...config,
    defaults: {
      ...DEFAULT_CONFIG.defaults,
      ...config.defaults,
      memoryBudget: {
        ...DEFAULT_CONFIG.defaults.memoryBudget,
        ...config.defaults?.memoryBudget,
      },
    },
    adapters: {
      ...DEFAULT_CONFIG.adapters,
      ...config.adapters,
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
