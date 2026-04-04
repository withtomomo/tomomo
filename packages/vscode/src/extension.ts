import * as vscode from "vscode";
import { revealPanel } from "./panel";
import { killAllSessions } from "./pty-manager";
import { log } from "./log";

// Ensure PATH includes common install directories for CLI tools.
// macOS GUI apps inherit a limited PATH that misses user-installed binaries.
function enhancePath(): void {
  const existing = process.env.PATH || "";
  const home = process.env.HOME || "";
  const extras = [
    `${home}/.local/bin`,
    `${home}/.cargo/bin`,
    "/usr/local/bin",
    "/opt/homebrew/bin",
    "/opt/homebrew/sbin",
  ];
  const parts = existing.split(":");
  const missing = extras.filter((p) => !parts.includes(p));
  if (missing.length > 0) {
    process.env.PATH = [...missing, ...parts].join(":");
  }
}

export function activate(context: vscode.ExtensionContext): void {
  log("activate() called");
  enhancePath();
  context.subscriptions.push(
    vscode.commands.registerCommand("tomomo.open", () => {
      log("tomomo.open command handler fired");
      revealPanel(context);
    })
  );
  log("activate() done, command registered");
}

export function deactivate(): void {
  killAllSessions();
}
