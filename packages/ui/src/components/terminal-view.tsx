import React, { useRef, useEffect } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useUiIpc } from "../ipc-context";
import { useSettings } from "../stores/settings-store";

interface TerminalInstance {
  term: Terminal;
  fit: FitAddon;
  termDataDisposable: { dispose(): void };
  removeDataListener: () => void;
  removeExitListener: () => void;
}

const instances = new Map<string, TerminalInstance>();

// Call this when a session is truly closed (killed by user)
export function disposeTerminal(sessionId: string): void {
  const inst = instances.get(sessionId);
  if (inst) {
    inst.termDataDisposable.dispose();
    inst.removeDataListener();
    inst.removeExitListener();
    inst.term.dispose();
    instances.delete(sessionId);
  }
}

// Re-fit a terminal after it becomes visible (e.g., tab switch)
export function refitTerminal(sessionId: string): void {
  const inst = instances.get(sessionId);
  if (!inst) return;
  try {
    inst.fit.fit();
  } catch {
    // Terminal not yet visible
  }
}

interface TerminalViewProps {
  sessionId: string;
}

export function TerminalView({ sessionId }: TerminalViewProps) {
  const { settings } = useSettings();
  const { terminal } = useUiIpc();
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let inst = instances.get(sessionId);

    if (inst && inst.term.element) {
      // Reattach existing terminal to the new container
      containerRef.current.appendChild(inst.term.element);
      try {
        inst.fit.fit();
        terminal.resize(sessionId, inst.term.cols, inst.term.rows);
      } catch {
        // Terminal element not yet visible
      }
    } else {
      // Disposed instance lingering in map, clean it up
      if (inst) instances.delete(sessionId);
      // Create a new terminal instance
      const term = new Terminal({
        cursorBlink: true,
        fontSize: settings.terminalFontSize,
        fontFamily: '"JetBrains Mono", monospace',
        // Terminal always uses the dark theme regardless of app theme.
        theme: {
          background: "#0c0c12",
          foreground: "#f0f0f5",
          cursor: "#f0f0f5",
          selectionBackground: "rgba(107, 143, 214, 0.3)",
          black: "#0c0c12",
          red: "#e26856",
          green: "#5cb8a5",
          yellow: "#e8b44c",
          blue: "#6b8fd6",
          magenta: "#c47acd",
          cyan: "#6dc4b0",
          white: "#f0f0f5",
          brightBlack: "#686880",
          brightRed: "#e27b8a",
          brightGreen: "#80bfa0",
          brightYellow: "#d4a76a",
          brightBlue: "#7eaad4",
          brightMagenta: "#b8a0d4",
          brightCyan: "#5cb8a5",
          brightWhite: "#f0f0f5",
        },
      });

      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current);
      fit.fit();

      terminal.resize(sessionId, term.cols, term.rows);

      const termDataDisposable = term.onData((data) => {
        terminal.write(sessionId, data);
      });

      const removeDataListener = terminal.onData((sid, data) => {
        if (sid === sessionId && instances.has(sessionId)) {
          term.write(data);
        }
      });

      const removeExitListener = terminal.onExit((sid, exitCode) => {
        if (sid === sessionId && instances.has(sessionId)) {
          term.write(
            `\r\n\x1b[90mSession ended (exit code ${exitCode})\x1b[0m\r\n`
          );
        }
      });

      inst = {
        term,
        fit,
        termDataDisposable,
        removeDataListener,
        removeExitListener,
      };
      instances.set(sessionId, inst);
    }

    // Watch for container resizes
    const currentInst = inst;
    const observer = new ResizeObserver(() => {
      if (!instances.has(sessionId)) return;
      try {
        currentInst.fit.fit();
        terminal.resize(
          sessionId,
          currentInst.term.cols,
          currentInst.term.rows
        );
      } catch {
        // Terminal not yet visible
      }
    });
    observer.observe(containerRef.current);
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      observerRef.current = null;
      // Do NOT dispose the terminal here. It stays alive in the map
      // so it can be reattached if the layout changes.
    };
  }, [sessionId, terminal]);

  // Live font size update without recreating terminal
  useEffect(() => {
    const inst = instances.get(sessionId);
    if (!inst) return;
    inst.term.options.fontSize = settings.terminalFontSize;
    try {
      inst.fit.fit();
      terminal.resize(sessionId, inst.term.cols, inst.term.rows);
    } catch {
      // Terminal not yet visible
    }
  }, [settings.terminalFontSize, sessionId, terminal]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ background: "#0c0c12" }}
    />
  );
}
