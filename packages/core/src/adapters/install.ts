import { execFile } from "node:child_process";
import { rm, readdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadConfig, saveConfig } from "../agent/config";
import {
  listBuiltInAdapters,
  getAdapter,
  isValidAdapter,
  clearAdapterCache,
} from "./loader";
import { getAdaptersDir } from "../paths";
import { ensureDir, fileExists } from "../utils/files";
import type { TomomoAdapter, RuntimeInfo } from "../types";

// Install an npm package into a local directory using npm --prefix
async function npmInstallLocal(
  packageName: string,
  installDir: string
): Promise<void> {
  await ensureDir(installDir);
  return new Promise((resolve, reject) => {
    execFile(
      "npm",
      ["install", "--prefix", installDir, packageName],
      (err, _stdout, stderr) => {
        if (err) {
          reject(
            new Error(
              `Failed to install ${packageName}: ${stderr || err.message}`
            )
          );
          return;
        }
        resolve();
      }
    );
  });
}

// Collect all runtimes (built-in, npm community, local drop-in) with availability info.
// Adapter availability checks run in parallel for speed.
export async function listAllRuntimes(): Promise<RuntimeInfo[]> {
  const config = await loadConfig();
  const builtIn = listBuiltInAdapters();

  type AdapterTask = {
    name: string;
    type: "built-in" | "npm" | "local";
    package?: string;
  };

  const tasks: AdapterTask[] = [];

  // Built-in adapters
  for (const name of builtIn) {
    tasks.push({ name, type: "built-in" });
  }

  // Config-registered npm adapters
  for (const [runtime, entry] of Object.entries(config.adapters)) {
    tasks.push({ name: runtime, type: "npm", package: entry.package });
  }

  // Local drop-in adapters (index.js, no node_modules)
  const adaptersDir = getAdaptersDir();
  if (await fileExists(adaptersDir)) {
    const entries = await readdir(adaptersDir, { withFileTypes: true });
    for (const dirEntry of entries) {
      if (!dirEntry.isDirectory()) continue;
      if (dirEntry.name.startsWith(".")) continue;
      const name = dirEntry.name;
      if (builtIn.includes(name) || config.adapters[name]) continue;
      const hasIndex = await fileExists(join(adaptersDir, name, "index.js"));
      const hasNodeModules = await fileExists(
        join(adaptersDir, name, "node_modules")
      );
      if (hasIndex && !hasNodeModules) {
        tasks.push({ name, type: "local" });
      }
    }
  }

  // Resolve all adapters and check availability in parallel
  const results = await Promise.all(
    tasks.map(async (task): Promise<RuntimeInfo> => {
      const adapter = await getAdapter(task.name);
      if (adapter) {
        const checkResult = await adapter.check();
        return {
          name: task.name,
          type: task.type,
          available: checkResult.available,
          error: checkResult.available ? undefined : checkResult.error,
          package: task.package,
          install: { ...adapter.install },
        };
      }
      return {
        name: task.name,
        type: task.type,
        available: false,
        error: "Failed to load adapter",
        package: task.package,
        install: { command: "", description: "", url: "" },
      };
    })
  );

  return results;
}

// Install a community adapter from npm, validate it, and register in config.
// Returns the adapter's declared runtime name.
export async function installCommunityAdapter(
  npmPackage: string
): Promise<{ name: string }> {
  // Validate npm package name format
  const validNpmName =
    /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*(@.*)?$/;
  if (!validNpmName.test(npmPackage)) {
    throw new Error(`Invalid npm package name: "${npmPackage}"`);
  }

  const tmpDir = join(getAdaptersDir(), `.tmp-${Date.now()}`);

  // Install to temp dir and load the module
  await npmInstallLocal(npmPackage, tmpDir);

  const modulePath = join(tmpDir, "node_modules", npmPackage);
  const fileUrl = pathToFileURL(modulePath).href;
  let mod: { default?: unknown };
  try {
    mod = (await import(fileUrl)) as { default?: unknown };
  } catch (err) {
    await rm(tmpDir, { recursive: true, force: true });
    throw new Error(
      `Failed to load "${npmPackage}": ${(err as Error).message}`
    );
  }

  const candidate = mod.default ?? mod;

  if (!isValidAdapter(candidate)) {
    await rm(tmpDir, { recursive: true, force: true });
    throw new Error(
      `Package "${npmPackage}" does not export a valid Tomomo adapter. An adapter must export: { name, check(), launch() }`
    );
  }

  const adapter = candidate as TomomoAdapter;
  const runtime = adapter.name;

  // Validate the adapter's declared name
  if (!/^[a-z0-9][a-z0-9-]*$/.test(runtime)) {
    await rm(tmpDir, { recursive: true, force: true });
    throw new Error(
      `Adapter declares invalid name "${runtime}". Names must use only lowercase letters, numbers, and hyphens.`
    );
  }

  // Check collision with built-in
  const builtIn = listBuiltInAdapters();
  if (builtIn.includes(runtime)) {
    await rm(tmpDir, { recursive: true, force: true });
    throw new Error(
      `Adapter "${runtime}" conflicts with a built-in adapter and cannot be installed.`
    );
  }

  // Check collision with existing adapter
  const config = await loadConfig();
  if (config.adapters[runtime]) {
    await rm(tmpDir, { recursive: true, force: true });
    throw new Error(
      `Adapter "${runtime}" is already installed (${config.adapters[runtime]!.package}). Run 'tomomo adapter remove ${runtime}' first.`
    );
  }

  // Move from temp to final location
  const finalDir = join(getAdaptersDir(), runtime);
  await rm(finalDir, { recursive: true, force: true });
  await rename(tmpDir, finalDir);

  // Register in config
  config.adapters[runtime] = { package: npmPackage };
  await saveConfig(config);

  // Clear cached adapters so the new one is loaded fresh
  clearAdapterCache();

  return { name: runtime };
}
