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
    entry: { index: "src/index.ts" },
    clean: true,
    dts: true,
  },
  {
    ...shared,
    entry: { "bin/tomomo": "src/bin/tomomo.ts" },
    banner: { js: "#!/usr/bin/env node" },
  },
]);
