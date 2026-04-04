import { fileExists } from "../utils/files";
import { getTomomoDir } from "../paths";
import { listAgents } from "./agent";
import { listBuiltInAdapters, getAdapter } from "../adapters/loader";

import type { DiagnosticResult } from "../types";

export async function runDiagnostics(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];

  // Check tomomo directory
  const tomomoExists = await fileExists(getTomomoDir());
  results.push({
    name: "Tomomo directory",
    status: tomomoExists ? "ok" : "warn",
    message: tomomoExists
      ? getTomomoDir()
      : `Not found. Run 'tomomo create' to initialize.`,
  });

  // Check available runtimes
  const adapterNames = listBuiltInAdapters();
  for (const name of adapterNames) {
    const adapter = await getAdapter(name);
    if (!adapter) continue;
    const check = await adapter.check();
    const result: DiagnosticResult = {
      name: `Runtime: ${name}`,
      status: check.available ? "ok" : "warn",
      message: check.available ? "Available" : (check.error ?? "Not found"),
    };
    if (!check.available) {
      result.installCommand = adapter.install.command;
      result.installUrl = adapter.install.url;
    }
    results.push(result);
  }

  // Check agents
  try {
    const agents = await listAgents();
    results.push({
      name: "Agents",
      status: "ok",
      message: `${agents.length} agent${agents.length === 1 ? "" : "s"} found`,
    });
  } catch {
    results.push({
      name: "Agents",
      status: "warn",
      message: "Could not read agents directory",
    });
  }

  return results;
}
