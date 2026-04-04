import React, { createContext, useContext } from "react";

interface TerminalIpc {
  write(sessionId: string, data: string): void;
  resize(sessionId: string, cols: number, rows: number): void;
  onData(cb: (sessionId: string, data: string) => void): () => void;
  onExit(cb: (sessionId: string, exitCode: number) => void): () => void;
}

export interface UiIpc {
  terminal: TerminalIpc;
}

const IpcContext = createContext<UiIpc | null>(null);

export function useUiIpc(): UiIpc {
  const ctx = useContext(IpcContext);
  if (!ctx) {
    throw new Error("useUiIpc must be used within an IpcProvider");
  }
  return ctx;
}

interface IpcProviderProps {
  ipc: UiIpc;
  children: React.ReactNode;
}

export function IpcProvider({ ipc, children }: IpcProviderProps) {
  return <IpcContext.Provider value={ipc}>{children}</IpcContext.Provider>;
}
