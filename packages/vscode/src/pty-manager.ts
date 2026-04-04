import type * as vscode from "vscode";
import type { EventMessage } from "./shared/messages";
import { log } from "./log";

// node-pty type (avoid top-level import since extension host is CJS)
type IPty = import("node-pty").IPty;

interface PtySession {
  id: string;
  pty: IPty;
  agentId: string;
  projectHash: string;
  onCleanup?: () => void;
  cleanedUp: boolean;
}

interface ExitInfo {
  agentId: string;
  projectHash: string;
  sessionId: string;
}

const sessions = new Map<string, PtySession>();
let sessionCounter = 0;

let webviewRef: vscode.Webview | null = null;
let exitCallback: ((info: ExitInfo) => void) | null = null;

export function setWebview(webview: vscode.Webview | null): void {
  webviewRef = webview;
}

export function setExitCallback(cb: (info: ExitInfo) => void): void {
  exitCallback = cb;
}

// Generate a session ID that callers can use to register exit handlers
// before calling spawnTerminal, preventing race conditions when the
// PTY exits immediately.
export function nextSessionId(): string {
  return `session-${++sessionCounter}`;
}

function runCleanup(session: PtySession): void {
  if (session.cleanedUp) return;
  session.cleanedUp = true;
  session.onCleanup?.();
}

function postEvent(msg: EventMessage): void {
  webviewRef?.postMessage(msg);
}

export function spawnTerminal(
  sessionId: string,
  command: string,
  args: string[],
  cwd: string,
  agentId: string,
  projectHash: string,
  extraEnv?: Record<string, string>,
  onCleanup?: () => void
): void {
  const pty = require(
    require("node:path").join(__dirname, "vendor/node-pty")
  ) as typeof import("node-pty");

  log("Spawning terminal:", command, args.slice(0, 3).join(" "), "cwd:", cwd);

  const shell = pty.spawn(command, args, {
    name: "xterm-256color",
    cols: 80,
    rows: 24,
    cwd,
    env: { ...process.env, ...extraEnv } as Record<string, string>,
  });

  const session: PtySession = {
    id: sessionId,
    pty: shell,
    agentId,
    projectHash,
    onCleanup,
    cleanedUp: false,
  };

  shell.onData((data) => {
    postEvent({
      type: "event",
      event: "terminal:data",
      sessionId,
      data,
    });
  });

  shell.onExit(({ exitCode }) => {
    log("Terminal exited:", sessionId, "code:", exitCode);
    // Skip if already removed by killTerminal/killAllSessions
    if (!sessions.has(sessionId)) return;
    postEvent({
      type: "event",
      event: "terminal:exit",
      sessionId,
      exitCode,
    });
    runCleanup(session);
    if (exitCallback) {
      Promise.resolve(exitCallback({ agentId, projectHash, sessionId })).catch(
        (err) => {
          log("Exit callback failed for session:", sessionId, err);
        }
      );
    }
    sessions.delete(sessionId);
  });

  sessions.set(sessionId, session);
}

export function writeToTerminal(sessionId: string, data: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.pty.write(data);
  }
}

export function resizeTerminal(
  sessionId: string,
  cols: number,
  rows: number
): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.pty.resize(cols, rows);
  }
}

export function killTerminal(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    postEvent({
      type: "event",
      event: "terminal:exit",
      sessionId,
      exitCode: -1,
    });
    runCleanup(session);
    session.pty.kill();
    sessions.delete(sessionId);
  }
}

export function killAllSessions(): void {
  for (const session of sessions.values()) {
    runCleanup(session);
    session.pty.kill();
  }
  sessions.clear();
}
