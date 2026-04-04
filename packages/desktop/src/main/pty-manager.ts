import * as pty from "node-pty";
import { BrowserWindow } from "electron";

interface PtySession {
  id: string;
  pty: pty.IPty;
  win: BrowserWindow;
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

let exitCallback: ((info: ExitInfo) => void) | null = null;

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

export function spawnTerminal(
  sessionId: string,
  win: BrowserWindow,
  command: string,
  args: string[],
  cwd: string,
  agentId: string,
  projectHash: string,
  extraEnv?: Record<string, string>,
  onCleanup?: () => void
): void {
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
    win,
    agentId,
    projectHash,
    onCleanup,
    cleanedUp: false,
  };

  shell.onData((data) => {
    if (!win.isDestroyed()) {
      win.webContents.send("terminal:data", sessionId, data);
    }
  });

  shell.onExit(({ exitCode }) => {
    // Skip if already removed by killTerminal/killAllSessions
    if (!sessions.has(sessionId)) return;
    if (!win.isDestroyed()) {
      win.webContents.send("terminal:exit", sessionId, exitCode);
    }
    runCleanup(session);
    if (exitCallback) {
      Promise.resolve(exitCallback({ agentId, projectHash, sessionId })).catch(
        (err) => {
          console.warn("Exit callback failed for session:", sessionId, err);
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
    if (!session.win.isDestroyed()) {
      session.win.webContents.send("terminal:exit", sessionId, -1);
    }
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
