import * as vscode from "vscode";
import { randomBytes } from "node:crypto";
import { handleMessage, getSessionExitHandler } from "./message-handler";
import { setWebview, setExitCallback } from "./pty-manager";
import { log } from "./log";

function getNonce(): string {
  return randomBytes(16).toString("hex");
}

let currentPanel: vscode.WebviewPanel | undefined;

export function createPanel(context: vscode.ExtensionContext): void {
  log("createPanel called, currentPanel exists:", !!currentPanel);
  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.Beside);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    "tomomo.panel",
    "Tomomo",
    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [context.extensionUri],
    }
  );

  panel.iconPath = vscode.Uri.joinPath(
    context.extensionUri,
    "media",
    "icon.png"
  );

  setWebview(panel.webview);

  setExitCallback(async (info) => {
    const handler = getSessionExitHandler(info.sessionId);
    if (handler) {
      try {
        await handler();
      } catch (err) {
        log("recordExit failed for session:", info.sessionId, String(err));
      }
    }
  });

  panel.webview.html = getHtml(panel.webview, context.extensionUri);

  panel.webview.onDidReceiveMessage(
    (message) => handleMessage(message, panel.webview, context),
    undefined,
    context.subscriptions
  );

  panel.onDidDispose(() => {
    currentPanel = undefined;
    setWebview(null);
  });

  currentPanel = panel;
}

export function revealPanel(context: vscode.ExtensionContext): void {
  log("revealPanel called");
  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.Beside);
  } else {
    createPanel(context);
  }
}

function getHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "index.js")
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "index.css")
  );
  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${webview.cspSource} https://fonts.googleapis.com 'unsafe-inline'; font-src https://fonts.gstatic.com; img-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link href="${styleUri}" rel="stylesheet">
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
