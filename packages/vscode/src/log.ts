import * as vscode from "vscode";

let channel: vscode.OutputChannel | null = null;

export function getChannel(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel("Tomomo");
  }
  return channel;
}

export function log(...args: unknown[]): void {
  const msg = args
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
    .join(" ");
  getChannel().appendLine(`[tomomo] ${msg}`);
  console.log("[tomomo]", ...args);
}

export function logError(...args: unknown[]): void {
  const msg = args
    .map((a) => {
      if (a instanceof Error) return `${a.message}\n${a.stack}`;
      return typeof a === "string" ? a : JSON.stringify(a);
    })
    .join(" ");
  getChannel().appendLine(`[tomomo] ERROR: ${msg}`);
  console.error("[tomomo]", ...args);
}
