// @tomomo/core is ESM, the extension host is CJS.
// CJS cannot require() ESM, but can await import() it.
// In production (VSIX), core is vendored at dist/vendor/@tomomo/core.
// In development, it resolves from the workspace.

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { log, logError } from "./log";

type Core = typeof import("@tomomo/core");

let cached: Core | null = null;

export async function getCore(): Promise<Core> {
  if (cached) return cached;

  const vendorPath = join(__dirname, "vendor/@tomomo/core/dist/index.js");

  try {
    if (existsSync(vendorPath)) {
      log("Loading core from vendor path");
      cached = await import(pathToFileURL(vendorPath).href);
    } else {
      log("Loading core from workspace");
      cached = await import("@tomomo/core");
    }
  } catch (err) {
    logError("Failed to load core:", err);
    throw err;
  }

  return cached as Core;
}
