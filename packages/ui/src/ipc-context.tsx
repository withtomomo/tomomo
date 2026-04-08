import React, { createContext, useContext } from "react";

interface TerminalIpc {
  write(sessionId: string, data: string): void;
  resize(sessionId: string, cols: number, rows: number): void;
  onData(cb: (sessionId: string, data: string) => void): () => void;
  onExit(cb: (sessionId: string, exitCode: number) => void): () => void;
}

// Optional onboarding IPC. Implemented by desktop and vscode for the
// shared OnboardingFlow feature. Consumers that do not use onboarding
// (e.g. the website) can omit this namespace.
interface IntroIpc {
  hasSeen(): Promise<boolean>;
  markSeen(): Promise<void>;
}

// Character preview used by the onboarding starter pick and create agent
// screen. Returns a deterministic character for a seed, with an optional
// color override that bypasses palette sampling.
interface CharacterIpc {
  preview(
    seed: string,
    options?: { color?: string }
  ): Promise<{ grid: number[][]; color: string; size: number }>;
}

export interface UiIpc {
  terminal: TerminalIpc;
  intro?: IntroIpc;
  character?: CharacterIpc;
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
