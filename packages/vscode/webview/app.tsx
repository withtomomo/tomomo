import React, { useState, useEffect, useRef } from "react";
import {
  ErrorBoundary,
  IpcProvider,
  ThemeProvider,
  SettingsProvider,
  ToastProvider,
  useToast,
  ToastViewport,
  useIpcQuery,
  getStoredValue,
  setStoredValue,
  disposeTerminal,
} from "@tomomo/ui";
import type { TerminalSession } from "@tomomo/ui";
import type { AgentConfig } from "@tomomo/core";
import { ipc, uiIpc } from "./lib/ipc";
import { Header } from "./features/header";
import { AgentsView } from "./features/agents-view";
import { HubView } from "./features/hub-view";
import { SettingsPanel } from "./features/settings-panel";
import { InstallAgent } from "./features/install-agent";
import { CreateAgentScreen } from "./features/onboarding";

function useVsCodeTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (document.body.classList.contains("vscode-light")) return "light";
    return "dark";
  });

  useEffect(() => {
    // Set initial theme
    document.documentElement.setAttribute("data-theme", theme);

    const observer = new MutationObserver(() => {
      const isLight = document.body.classList.contains("vscode-light");
      const next = isLight ? "light" : "dark";
      setTheme(next);
      document.documentElement.setAttribute("data-theme", next);
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return theme;
}

function AppLayout() {
  const { toast } = useToast();
  useVsCodeTheme();

  const [activeView, setActiveView] = useState<"agents" | "hub">("agents");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [characters, setCharacters] = useState<
    Record<string, { grid: number[][]; color: string; size: number }>
  >({});
  const loadedIds = useRef(new Set<string>());

  // Overlay navigation state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);

  const { data: agents, refetch: refetchAgents } = useIpcQuery<AgentConfig[]>(
    () => ipc.agents.list() as Promise<AgentConfig[]>
  );

  // Check if onboarding should show (no agents, no sessions, on agents view)
  const showOnboarding =
    agents !== null &&
    agents.length === 0 &&
    sessions.length === 0 &&
    activeView === "agents" &&
    !settingsOpen &&
    !createOpen &&
    !installOpen;

  // Auto-select: last used agent, or most recent, or first available
  useEffect(() => {
    if (!agents || agents.length === 0 || selectedAgentId) return;

    const lastSelected = getStoredValue<string>("last-agent", "");
    if (lastSelected && agents.some((a) => a.id === lastSelected)) {
      setSelectedAgentId(lastSelected);
      return;
    }

    const sorted = [...agents].sort((a, b) => {
      if (!a.lastUsed) return 1;
      if (!b.lastUsed) return -1;
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    });
    if (sorted[0]) {
      setSelectedAgentId(sorted[0].id);
    }
  }, [agents, selectedAgentId]);

  // Persist selected agent
  useEffect(() => {
    if (selectedAgentId) {
      setStoredValue("last-agent", selectedAgentId);
    }
  }, [selectedAgentId]);

  // Load characters for agents not yet loaded
  useEffect(() => {
    if (!agents) return;
    const loadChars = async () => {
      const newChars: Record<
        string,
        { grid: number[][]; color: string; size: number }
      > = {};
      for (const agent of agents) {
        if (!loadedIds.current.has(agent.id)) {
          newChars[agent.id] = await ipc.agents.character(agent.id);
          loadedIds.current.add(agent.id);
        }
      }
      if (Object.keys(newChars).length > 0) {
        setCharacters((prev) => ({ ...prev, ...newChars }));
      }
    };
    loadChars();
  }, [agents]);

  // Track sessions that were manually closed so the auto-exit timer skips them
  const manuallyClosedRef = useRef(new Set<string>());

  // Auto-remove sessions that exit naturally
  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const cleanup = ipc.terminal.onExit((sessionId, _exitCode) => {
      if (manuallyClosedRef.current.has(sessionId)) {
        manuallyClosedRef.current.delete(sessionId);
        return;
      }
      const tid = setTimeout(() => {
        disposeTerminal(sessionId);
        setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
        timers.delete(sessionId);
      }, 3000);
      timers.set(sessionId, tid);
    });
    return () => {
      cleanup();
      for (const tid of timers.values()) clearTimeout(tid);
    };
  }, []);

  const createSession = async (
    agentId: string,
    projectDir: string,
    options?: { skipPermissions?: boolean }
  ) => {
    const sessionId = await ipc.terminal.spawn(agentId, projectDir, {
      skipPermissions: options?.skipPermissions,
    });
    const agent = agents?.find((a) => a.id === agentId);
    const char = characters[agentId];
    setSessions((prev) => [
      ...prev,
      {
        sessionId,
        agentId,
        agentName: agent?.name || agentId,
        agentColor: char?.color || "#888",
        agentRuntime: agent?.runtime || "claude-code",
        character: char || null,
        projectDir,
        skipPermissions: options?.skipPermissions,
      },
    ]);
    setActiveView("hub");
  };

  const handleLaunch = async (agentId: string) => {
    // In VS Code, use the workspace folder directly
    const projectDir = await ipc.app.selectDirectory();
    if (!projectDir) return;
    try {
      await createSession(agentId, projectDir);
    } catch (err) {
      toast({
        title: "Launch failed",
        description: (err as Error).message,
        variant: "error",
      });
    }
  };

  const handleCloseSession = (sessionId: string) => {
    manuallyClosedRef.current.add(sessionId);
    ipc.terminal.kill(sessionId);
    disposeTerminal(sessionId);
    setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
  };

  const handleRefetch = () => {
    refetchAgents();
    loadedIds.current.clear();
  };

  // Render overlay views (settings, create, install)
  const hasOverlay = settingsOpen || createOpen || installOpen;

  if (hasOverlay) {
    if (settingsOpen) {
      return (
        <div className="flex h-full w-full flex-col overflow-hidden">
          <SettingsPanel onBack={() => setSettingsOpen(false)} />
        </div>
      );
    }

    if (createOpen) {
      return (
        <div className="flex h-full w-full flex-col overflow-hidden">
          <CreateAgentScreen
            mode="add"
            onCancel={() => setCreateOpen(false)}
            onCreated={(agentId) => {
              setCreateOpen(false);
              setSelectedAgentId(agentId);
              handleRefetch();
            }}
          />
        </div>
      );
    }

    if (installOpen) {
      return (
        <div className="flex h-full w-full flex-col overflow-hidden">
          <InstallAgent
            onBack={() => setInstallOpen(false)}
            onInstalled={() => {
              setInstallOpen(false);
              handleRefetch();
            }}
          />
        </div>
      );
    }
  }

  // Show onboarding when no agents exist
  if (showOnboarding) {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden">
        <CreateAgentScreen
          mode="onboarding"
          onCreated={(agentId) => {
            setSelectedAgentId(agentId);
            handleRefetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <Header
        activeView={activeView}
        onSwitchView={setActiveView}
        runningCount={sessions.length}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        {activeView === "agents" ? (
          <AgentsView
            agents={agents ?? []}
            characters={characters}
            selectedAgentId={selectedAgentId}
            runningAgentIds={sessions.map((s) => s.agentId)}
            onSelectAgent={setSelectedAgentId}
            onLaunch={handleLaunch}
            onRefetch={handleRefetch}
            onCreateOpen={() => setCreateOpen(true)}
            onInstallOpen={() => setInstallOpen(true)}
          />
        ) : (
          <HubView
            sessions={sessions}
            onClose={handleCloseSession}
            agents={agents ?? []}
            characters={characters}
            onLaunch={handleLaunch}
          />
        )}
      </div>
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <IpcProvider ipc={uiIpc}>
        <ThemeProvider>
          <SettingsProvider>
            <ToastProvider>
              <AppLayout />
              <ToastViewport />
            </ToastProvider>
          </SettingsProvider>
        </ThemeProvider>
      </IpcProvider>
    </ErrorBoundary>
  );
}
