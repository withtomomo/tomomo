import { loadConfig, saveConfig } from "./config";
import { listBuiltInAdapters, getAdapter } from "../adapters/loader";
import { ensureDir } from "../utils/files";
import {
  getTomomoDir,
  getAgentsDir,
  getSkillsDir,
  getLogsDir,
  getTmpDir,
} from "../paths";
import type { RuntimeCheckResult } from "../types";

export async function isOnboarded(): Promise<boolean> {
  const config = await loadConfig();
  return config.onboardingComplete;
}

export async function hasSeenIntro(): Promise<boolean> {
  const config = await loadConfig();
  return config.introComplete;
}

export async function markIntroComplete(): Promise<void> {
  const config = await loadConfig();
  if (!config.introComplete) {
    config.introComplete = true;
    await saveConfig(config);
  }
}

export async function checkRuntimes(): Promise<RuntimeCheckResult[]> {
  const adapterNames = listBuiltInAdapters();
  const results: RuntimeCheckResult[] = [];
  for (const name of adapterNames) {
    const adapter = await getAdapter(name);
    if (adapter) {
      const check = await adapter.check();
      results.push({
        name,
        available: check.available,
        error: check.error,
        adapter,
      });
    } else {
      results.push({
        name,
        available: false,
        error: "Adapter not found",
        adapter: null,
      });
    }
  }
  return results;
}

export async function initializeTomomoDir(): Promise<void> {
  await ensureDir(getTomomoDir());
  await ensureDir(getAgentsDir());
  await ensureDir(getSkillsDir());
  await ensureDir(getLogsDir());
  await ensureDir(getTmpDir());
}

export async function runOnboarding(): Promise<void> {
  await initializeTomomoDir();
  const config = await loadConfig();
  let dirty = false;
  if (!config.onboardingComplete) {
    config.onboardingComplete = true;
    dirty = true;
  }
  // CLI users who finish terminal onboarding should not see the visual intro
  // when they later open the desktop or vscode apps.
  if (!config.introComplete) {
    config.introComplete = true;
    dirty = true;
  }
  if (dirty) {
    await saveConfig(config);
  }
}
