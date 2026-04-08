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
  OnboardingFlow,
  CreateAgentScreen,
} from "@tomomo/ui";
import type { TerminalSession } from "@tomomo/ui";
import type { AgentConfig } from "@tomomo/core";
import { ipc, uiIpc } from "./lib/ipc";
import { Header } from "./features/header";
import { AgentsView } from "./features/agents-view";
import { HubView } from "./features/hub-view";
import { SettingsPanel } from "./features/settings-panel";
import { InstallAgent } from "./features/install-agent";
import { Breadcrumb } from "./features/breadcrumb";

// Thin adapter around ipc.agents.create so OnboardingFlow and CreateAgentScreen
// only need the { id } shape they care about.
async function createAgentAdapter(
  name: string,
  options: { runtime: string; seed: string }
): Promise<{ id: string }> {
  const created = (await ipc.agents.create(name, options)) as AgentConfig;
  return { id: created.id };
}

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
  // Session-only replay overlay for the intro. Triggered from Settings.
  // Opening it does NOT reset the persisted introComplete flag.
  const [replayIntroOpen, setReplayIntroOpen] = useState(false);

  const { data: agents, refetch: refetchAgents } = useIpcQuery<AgentConfig[]>(
    () => ipc.agents.list() as Promise<AgentConfig[]>
  );

  const { data: runtimesData } = useIpcQuery<
    Array<{ name: string; available: boolean }>
  >(
    () =>
      ipc.runtimes.check() as Promise<
        Array<{ name: string; available: boolean }>
      >
  );
  // `runtimesData === null` means the first fetch is still in flight.
  // Distinguishing that from "fetch returned empty" is what drives the
  // NameYourAgent loading vs empty vs ready states.
  const runtimes = runtimesData ?? [];
  const runtimesLoaded = runtimesData !== null;

  // Check if onboarding should show (no agents, no sessions, on agents view)
  const showOnboarding =
    agents !== null &&
    agents.length === 0 &&
    sessions.length === 0 &&
    activeView === "agents" &&
    !settingsOpen &&
    !createOpen &&
    !installOpen &&
    !replayIntroOpen;

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

  // Render overlay views (replay intro, settings, create, install)
  const hasOverlay =
    replayIntroOpen || settingsOpen || createOpen || installOpen;

  if (hasOverlay) {
    if (replayIntroOpen) {
      return (
        <div className="flex h-full w-full flex-col overflow-hidden">
          <OnboardingFlow
            forceIntro
            runtimes={runtimes}
            runtimesLoaded={runtimesLoaded}
            onCreateAgent={createAgentAdapter}
            onClose={() => setReplayIntroOpen(false)}
          />
        </div>
      );
    }

    if (settingsOpen) {
      return (
        <div className="flex h-full w-full flex-col overflow-hidden">
          <SettingsPanel
            onBack={() => setSettingsOpen(false)}
            onReplayIntro={() => {
              setSettingsOpen(false);
              setReplayIntroOpen(true);
            }}
          />
        </div>
      );
    }

    if (createOpen) {
      return (
        <div className="flex h-full w-full flex-col overflow-hidden">
          <Breadcrumb title="New agent" onBack={() => setCreateOpen(false)} />
          <CreateAgentScreen
            runtimes={runtimes}
            runtimesLoaded={runtimesLoaded}
            onCreateAgent={createAgentAdapter}
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

  // Wait for the first agents fetch to resolve before deciding which view to
  // render. Without this, a brand-new user would briefly see an empty
  // AgentsView flash before the onboarding intro mounts.
  if (agents === null) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-fg-2 text-sm">Loading...</p>
      </div>
    );
  }

  // Show onboarding when no agents exist
  if (showOnboarding) {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden">
        <OnboardingFlow
          runtimes={runtimes}
          runtimesLoaded={runtimesLoaded}
          onCreateAgent={createAgentAdapter}
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
