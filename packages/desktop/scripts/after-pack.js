const fs = require("node:fs");
const path = require("node:path");

// Fix spawn-helper permissions after electron-builder unpacks node-pty.
// node-pty's spawn-helper binary ships without the execute bit in npm tarballs.
// Without this fix, pty.spawn() fails silently on macOS/Linux.
exports.default = async function afterPack(context) {
  const isMac = context.packager.platform.name === "mac";
  const resourcesDir = isMac
    ? path.join(
        context.appOutDir,
        `${context.packager.appInfo.productFilename}.app`,
        "Contents",
        "Resources"
      )
    : path.join(context.appOutDir, "resources");

  const unpackedPty = path.join(
    resourcesDir,
    "app.asar.unpacked",
    "node_modules",
    "node-pty"
  );

  if (!fs.existsSync(unpackedPty)) return;

  // Walk the directory and fix all spawn-helper binaries
  function fixPermissions(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        fixPermissions(full);
      } else if (entry.name === "spawn-helper") {
        fs.chmodSync(full, 0o755);
        console.log("Fixed spawn-helper permissions:", full);
      }
    }
  }

  fixPermissions(unpackedPty);
};
