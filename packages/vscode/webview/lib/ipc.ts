import { getVsCodeApi } from "./vscode-api";
import type { UiIpc } from "@tomomo/ui";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

const pending = new Map<string, PendingRequest>();
const eventListeners: Record<string, Array<(...args: unknown[]) => void>> = {
  "terminal:data": [],
  "terminal:exit": [],
};

let idCounter = 0;

function nextId(): string {
  return `req-${++idCounter}-${Date.now()}`;
}

window.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== "object") return;

  if (msg.type === "response" && msg.id) {
    const req = pending.get(msg.id);
    if (req) {
      pending.delete(msg.id);
      if (msg.error) {
        req.reject(new Error(msg.error));
      } else {
        req.resolve(msg.result);
      }
    }
    return;
  }

  if (msg.type === "event") {
    const listeners = eventListeners[msg.event];
    if (listeners) {
      for (const cb of listeners) {
        if (msg.event === "terminal:data") {
          cb(msg.sessionId, msg.data);
        } else if (msg.event === "terminal:exit") {
          cb(msg.sessionId, msg.exitCode);
        }
      }
    }
  }
});

function request(method: string, ...args: unknown[]): Promise<unknown> {
  const id = nextId();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Request "${method}" timed out`));
    }, 30000);
    pending.set(id, {
      resolve: (value: unknown) => {
        clearTimeout(timer);
        resolve(value);
      },
      reject: (error: Error) => {
        clearTimeout(timer);
        reject(error);
      },
    });
    getVsCodeApi().postMessage({ id, type: "request", method, args });
  });
}

function send(method: string, ...args: unknown[]): void {
  const id = nextId();
  getVsCodeApi().postMessage({
    id,
    type: "request",
    method,
    args,
  });
}

export const ipc = {
  agents: {
    list: () => request("agents.list") as Promise<unknown[]>,
    load: (id: string) => request("agents.load", id),
    create: (
      name: string,
      options?: {
        runtime?: string;
        model?: string;
        description?: string;
        seed?: string;
      }
    ) => request("agents.create", name, options),
    delete: (id: string) => request("agents.delete", id),
    update: (
      id: string,
      updates: {
        name?: string;
        description?: string;
        runtime?: string;
        model?: string;
        quickCommands?: Array<{ id: string; name: string; prompt: string }>;
      }
    ) => request("agents.update", id, updates),
    export: (id: string) =>
      request("agents.export", id) as Promise<string | null>,
    character: (id: string) =>
      request("agents.character", id) as Promise<{
        grid: number[][];
        color: string;
        size: number;
      }>,
    projects: (id: string) =>
      request("agents.projects", id) as Promise<
        Array<{ hash: string; path: string; remote?: string }>
      >,
    memoryFull: (id: string) =>
      request("agents.memory-full", id) as Promise<string | null>,
    soulRead: (id: string) =>
      request("agents.soul-read", id) as Promise<string | null>,
    soulWrite: (id: string, content: string) =>
      request("agents.soul-write", id, content),
    projectMemory: (id: string, projectHash: string) =>
      request("agents.project-memory", id, projectHash) as Promise<
        string | null
      >,
    skillsList: (id: string) =>
      request("agents.skills-list", id) as Promise<
        Array<{
          id: string;
          name: string;
          description: string;
          content: string;
        }>
      >,
    skillRemove: (id: string, skillId: string) =>
      request("agents.skill-remove", id, skillId),
    skillAdd: (id: string, sourcePath: string) =>
      request("agents.skill-add", id, sourcePath),
    skillInstallUrl: (id: string, source: string) =>
      request("agents.skill-install-url", id, source),
    install: (source: string, name?: string) =>
      request("agents.install", source, name),
    getDir: (id: string) => request("agents.getDir", id) as Promise<string>,
  },
  mcp: {
    list: (agentId: string) =>
      request("mcp.list", agentId) as Promise<
        Array<{
          name: string;
          command: string;
          args: string[];
          envKeys: string[];
          status: "ready" | "missing";
          missingVars: string[];
        }>
      >,
    add: (
      agentId: string,
      name: string,
      server: { command: string; args: string[]; env?: Record<string, string> }
    ) => request("mcp.add", agentId, name, server),
    remove: (agentId: string, name: string) =>
      request("mcp.remove", agentId, name),
    updateEnv: (agentId: string, updates: Record<string, string>) =>
      request("mcp.update-env", agentId, updates),
  },
  runtimes: {
    check: () => request("runtimes.check"),
    installAdapter: (npmPackage: string) =>
      request("runtimes.installAdapter", npmPackage),
  },
  character: {
    preview: (seed: string) =>
      request("character.preview", seed) as Promise<{
        grid: number[][];
        color: string;
        size: number;
      }>,
  },
  intro: {
    hasSeen: () => request("intro.hasSeen") as Promise<boolean>,
    markSeen: () => request("intro.markSeen") as Promise<void>,
  },
  app: {
    selectDirectory: () =>
      request("app.selectDirectory") as Promise<string | null>,
    getWorkspaceFolders: () =>
      request("app.getWorkspaceFolders") as Promise<
        Array<{ name: string; path: string }>
      >,
  },
  terminal: {
    spawn: (
      agentId: string,
      projectDir: string,
      options?: {
        appendPrompt?: string;
        selfChat?: boolean;
        skipPermissions?: boolean;
      }
    ) =>
      request(
        "terminal.spawn",
        agentId,
        projectDir,
        options
      ) as Promise<string>,
    write: (sessionId: string, data: string) =>
      send("terminal.write", sessionId, data),
    resize: (sessionId: string, cols: number, rows: number) =>
      send("terminal.resize", sessionId, cols, rows),
    kill: (sessionId: string) => send("terminal.kill", sessionId),
    onData: (cb: (sessionId: string, data: string) => void) => {
      const listeners = eventListeners["terminal:data"]!;
      listeners.push(cb as (...args: unknown[]) => void);
      return () => {
        const idx = listeners.indexOf(cb as (...args: unknown[]) => void);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    },
    onExit: (cb: (sessionId: string, exitCode: number) => void) => {
      const listeners = eventListeners["terminal:exit"]!;
      listeners.push(cb as (...args: unknown[]) => void);
      return () => {
        const idx = listeners.indexOf(cb as (...args: unknown[]) => void);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    },
  },
};

export const uiIpc: UiIpc = {
  terminal: {
    write: (sessionId, data) => ipc.terminal.write(sessionId, data),
    resize: (sessionId, cols, rows) =>
      ipc.terminal.resize(sessionId, cols, rows),
    onData: (cb) => ipc.terminal.onData(cb),
    onExit: (cb) => ipc.terminal.onExit(cb),
  },
  intro: {
    hasSeen: () => ipc.intro.hasSeen(),
    markSeen: () => ipc.intro.markSeen(),
  },
  character: {
    preview: (seed) => ipc.character.preview(seed),
  },
};
