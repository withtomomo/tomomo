import { defineConfig } from "tsup";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf-8")) as {
  version: string;
};

const shared = {
  format: "esm" as const,
  target: "node22" as const,
  outDir: "dist",
  sourcemap: true,
  define: {
    __PKG_VERSION__: JSON.stringify(pkg.version),
  },
};

export default defineConfig([
  {
    ...shared,
    entry: {
      index: "src/index.ts",
      // Client-safe entry for browser consumers (no Node.js deps)
      character: "src/character/character.ts",
    },
    clean: true,
    dts: true,
  },
  // Self-contained build for embedding in VS Code extension (all deps bundled)
  {
    ...shared,
    entry: { "index.bundled": "src/index.ts" },
    noExternal: [/.*/],
    splitting: false,
    dts: false,
    sourcemap: false,
  },
]);
