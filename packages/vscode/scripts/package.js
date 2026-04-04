// vsce does not support scoped npm names (@scope/name) or npm workspace deps.
// This script: renames the package, stages vendored runtime deps into dist/,
// packages the VSIX, then cleans up.

const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const monorepo = path.resolve(root, "../..");
const pkgPath = path.join(root, "package.json");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function stageVendorDeps(target) {
  const vendorDir = path.join(root, "dist/vendor");
  fs.rmSync(vendorDir, { recursive: true, force: true });

  // Stage node-pty (native module, external in esbuild)
  const nodePtySrc = path.join(monorepo, "node_modules/node-pty");
  const nodePtyDest = path.join(vendorDir, "node-pty");
  fs.mkdirSync(nodePtyDest, { recursive: true });
  copyDir(path.join(nodePtySrc, "lib"), path.join(nodePtyDest, "lib"));

  // Copy only runtime binaries from build/Release (skip compiler artifacts)
  const releaseDir = path.join(nodePtyDest, "build/Release");
  fs.mkdirSync(releaseDir, { recursive: true });
  const releaseFiles = [
    "pty.node",
    "spawn-helper",
    "conpty.node",
    "conpty_console_list.node",
    "winpty-agent.exe",
    "winpty.dll",
  ];
  for (const f of releaseFiles) {
    const src = path.join(nodePtySrc, "build/Release", f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(releaseDir, f));
  }
  fs.copyFileSync(
    path.join(nodePtySrc, "package.json"),
    path.join(nodePtyDest, "package.json")
  );

  // Copy only the target platform's prebuilds (not all 58MB)
  const prebuildSrc = path.join(nodePtySrc, "prebuilds");
  const prebuildDest = path.join(nodePtyDest, "prebuilds");
  if (target) {
    const platformDir = target;
    const src = path.join(prebuildSrc, platformDir);
    if (fs.existsSync(src)) {
      copyDir(src, path.join(prebuildDest, platformDir));
    }
  } else {
    copyDir(prebuildSrc, prebuildDest);
  }

  // Stage @tomomo/core bundled build (self-contained, all deps inlined)
  const coreSrc = path.resolve(monorepo, "packages/core");
  const coreDest = path.join(vendorDir, "@tomomo/core");
  fs.mkdirSync(path.join(coreDest, "dist"), { recursive: true });
  fs.copyFileSync(
    path.join(coreSrc, "dist/index.bundled.js"),
    path.join(coreDest, "dist/index.js")
  );
  fs.copyFileSync(
    path.join(coreSrc, "package.json"),
    path.join(coreDest, "package.json")
  );
  // Copy bundled skills
  if (fs.existsSync(path.join(coreSrc, "skills"))) {
    copyDir(path.join(coreSrc, "skills"), path.join(coreDest, "skills"));
  }
}

// Parse --target from args
const targetIdx = process.argv.findIndex((a) => a === "--target");
const target = targetIdx !== -1 ? process.argv[targetIdx + 1] : null;

// Temporarily rename for vsce
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
const origName = pkg.name;
pkg.name = "tomomo-vscode";
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

try {
  stageVendorDeps(target);
  const args = [
    "@vscode/vsce",
    "package",
    "--no-dependencies",
    ...process.argv.slice(2),
  ];
  execFileSync("npx", args, { stdio: "inherit", cwd: root });
} finally {
  pkg.name = origName;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}
