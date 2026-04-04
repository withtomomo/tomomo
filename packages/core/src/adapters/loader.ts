import { pathToFileURL } from "node:url";
import { join } from "node:path";
import type { TomomoAdapter } from "../types";
import { claudeCodeAdapter } from "./claude-code";
import { codexAdapter } from "./codex";
import { geminiCliAdapter } from "./gemini-cli";
import { loadConfig } from "../agent/config";
import { getAdaptersDir } from "../paths";
import { fileExists } from "../utils/files";

const builtInAdapters: Record<string, TomomoAdapter> = {
  "claude-code": claudeCodeAdapter,
  codex: codexAdapter,
  "gemini-cli": geminiCliAdapter,
};

const adapterCache: Record<string, TomomoAdapter> = {};

export function isValidAdapter(obj: unknown): obj is TomomoAdapter {
  if (typeof obj !== "object" || obj === null) return false;
  const candidate = obj as Record<string, unknown>;
  if (
    typeof candidate.name !== "string" ||
    typeof candidate.check !== "function" ||
    typeof candidate.launch !== "function"
  ) {
    return false;
  }
  // Validate install field
  const install = candidate.install;
  if (typeof install !== "object" || install === null) return false;
  const inst = install as Record<string, unknown>;
  return (
    typeof inst.command === "string" &&
    inst.command.length > 0 &&
    typeof inst.description === "string" &&
    inst.description.length > 0 &&
    typeof inst.url === "string" &&
    inst.url.length > 0
  );
}

async function loadAdapterModule(
  source: string
): Promise<TomomoAdapter | null> {
  try {
    const mod = (await import(source)) as { default?: unknown };
    const adapter = mod.default ?? mod;
    if (isValidAdapter(adapter)) return adapter;
    return null;
  } catch {
    return null;
  }
}

export async function getAdapter(
  runtime: string
): Promise<TomomoAdapter | null> {
  // 1. Built-in
  if (builtInAdapters[runtime]) {
    return builtInAdapters[runtime]!;
  }

  // 2. Cache
  if (adapterCache[runtime]) {
    return adapterCache[runtime]!;
  }

  // 3. Config-registered npm adapter (installed locally in ~/.tomomo/adapters/<runtime>/)
  const config = await loadConfig();
  const entry = config.adapters[runtime];
  if (entry) {
    const adapterDir = join(getAdaptersDir(), runtime);
    const modulePath = join(adapterDir, "node_modules", entry.package);
    if (await fileExists(modulePath)) {
      const fileUrl = pathToFileURL(modulePath).href;
      const adapter = await loadAdapterModule(fileUrl);
      if (adapter) {
        adapterCache[runtime] = adapter;
        return adapter;
      }
    }
  }

  // 4. Local drop-in adapter in ~/.tomomo/adapters/<runtime>/index.js
  const localPath = join(getAdaptersDir(), runtime, "index.js");
  if (await fileExists(localPath)) {
    // Only load as local if there's no node_modules (not an npm-installed adapter)
    const hasNodeModules = await fileExists(
      join(getAdaptersDir(), runtime, "node_modules")
    );
    if (!hasNodeModules) {
      const fileUrl = pathToFileURL(localPath).href;
      const adapter = await loadAdapterModule(fileUrl);
      if (adapter) {
        adapterCache[runtime] = adapter;
        return adapter;
      }
    }
  }

  return null;
}

export function listBuiltInAdapters(): string[] {
  return Object.keys(builtInAdapters);
}

export function isBuiltInAdapter(name: string): boolean {
  return name in builtInAdapters;
}

export function clearAdapterCache(): void {
  for (const key of Object.keys(adapterCache)) {
    delete adapterCache[key];
  }
}
