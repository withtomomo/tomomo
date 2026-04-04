const esbuild = require("esbuild");
const postcss = require("postcss");
const tailwindcss = require("@tailwindcss/postcss");
const { readFile } = require("node:fs/promises");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

const tailwindPlugin = {
  name: "tailwind",
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const css = await readFile(args.path, "utf-8");
      const result = await postcss([tailwindcss]).process(css, {
        from: args.path,
      });
      return { contents: result.css, loader: "css" };
    });
  },
};

const extensionConfig = {
  entryPoints: ["src/extension.ts"],
  outfile: "dist/extension.js",
  bundle: true,
  platform: "node",
  format: "cjs",
  minify: production,
  sourcemap: !production,
  external: ["vscode", "node-pty", "@tomomo/core"],
};

const webviewConfig = {
  entryPoints: ["webview/index.tsx"],
  outdir: "dist",
  outbase: "webview",
  bundle: true,
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  minify: production,
  sourcemap: !production,
  plugins: [tailwindPlugin],
};

async function main() {
  if (watch) {
    const [extCtx, webCtx] = await Promise.all([
      esbuild.context(extensionConfig),
      esbuild.context(webviewConfig),
    ]);
    await Promise.all([extCtx.watch(), webCtx.watch()]);
    console.log("Watching for changes...");
  } else {
    await Promise.all([
      esbuild.build(extensionConfig),
      esbuild.build(webviewConfig),
    ]);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
