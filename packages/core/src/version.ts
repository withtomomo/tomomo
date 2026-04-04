import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

declare const __PKG_VERSION__: string;

function readPackageVersion(): string {
  try {
    const dir = dirname(fileURLToPath(import.meta.url));
    // Try dev path then dist path
    const paths = [
      join(dir, "..", "package.json"),
      join(dir, "..", "..", "package.json"),
    ];
    for (const p of paths) {
      try {
        const pkg = JSON.parse(readFileSync(p, "utf-8")) as {
          version?: string;
        };
        if (pkg.version) return pkg.version;
      } catch {
        // try next
      }
    }
  } catch {
    // fallback
  }
  return "0.0.0";
}

export const version: string =
  typeof __PKG_VERSION__ !== "undefined"
    ? __PKG_VERSION__
    : readPackageVersion();
