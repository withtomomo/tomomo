import React, { useState } from "react";
import {
  ErrorBoundary,
  IpcProvider,
  ThemeProvider,
  SettingsProvider,
  ToastProvider,
  useToast,
  ToastViewport,
  Modal,
  Button,
  OnboardingFlow,
  CreateAgentScreen,
} from "@tomomo/ui";
import type { UiIpc } from "@tomomo/ui";
import { Titlebar } from "./features/titlebar/titlebar";
import { AgentHero } from "./features/agent-hero/agent-hero";
import { AgentSidebar } from "./features/agent-sidebar/agent-sidebar";
import { Hub, useLayoutPreset } from "./features/hub/hub";
import { SettingsModal } from "./features/settings/settings-modal";
import { InstallAgentModal } from "./features/install-agent/install-agent-modal";
import { LaunchAgentModal } from "./components/launch-agent-modal";
import { ipc } from "./lib/ipc";
import { useAgents } from "./hooks/use-agents";
import { useCharacters } from "./hooks/use-characters";
import { useSessions } from "./hooks/use-sessions";
import { useModals } from "./hooks/use-modals";
import { useRuntimes } from "./hooks/use-runtimes";

// Thin adapter around ipc.agents.create so OnboardingFlow and CreateAgentScreen
// only need the { id } shape they care about.
async function createAgentAdapter(
  name: string,
  options: { runtime: string; seed: string }
): Promise<{ id: string }> {
  const created = await ipc.agents.create(name, options);
  return { id: created.id };
}

const desktopUiIpc: UiIpc = {
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

function AppLayout() {
  const { toast } = useToast();
  const { agents, selectedAgentId, setSelectedAgentId, refetchAgents } =
    useAgents();
  const { characters, clearCache } = useCharacters(agents);
  const { sessions, createSession, closeSession, reorderSessions } =
    useSessions(agents, characters);
  const { runtimes, loaded: runtimesLoaded } = useRuntimes();
  const modals = useModals();
  const [activeTab, setActiveTab] = useState<
    "overview" | "soul" | "skills" | "mcp" | "memory" | "settings"
  >("overview");
  const [activeView, setActiveView] = useState<"agents" | "hub">("agents");
  // Session-only replay overlay for the intro. Triggered from Settings.
  // Opening it does NOT reset the persisted introComplete flag.
  const [replayIntroOpen, setReplayIntroOpen] = useState(false);
  const {
    layout,
    select: selectLayout,
    options: layoutOptions,
  } = useLayoutPreset(sessions.length);

  const handleLaunchBrowse = async () => {
    if (!modals.launchAgentId) return;
    const projectDir = await ipc.app.selectDirectory();
    if (!projectDir) return;
    const skip = modals.launchSkipPermissions;
    const agentId = modals.launchAgentId;
    modals.closeLaunch();
    try {
      await createSession(agentId, projectDir, {
        skipPermissions: skip,
      });
      setActiveView("hub");
    } catch (err) {
      toast({
        title: "Launch failed",
        description: (err as Error).message,
        variant: "error",
      });
    }
  };

  const handleLaunchFromModal = async (projectDir: string) => {
    if (!modals.launchAgentId) return;
    const skip = modals.launchSkipPermissions;
    const agentId = modals.launchAgentId;
    modals.closeLaunch();
    try {
      await createSession(agentId, projectDir, {
        skipPermissions: skip,
      });
      setActiveView("hub");
    } catch (err) {
      toast({
        title: "Launch failed",
        description: (err as Error).message,
        variant: "error",
      });
    }
  };

  const handleLaunchProject = async (agentId: string, projectDir: string) => {
    try {
      await createSession(agentId, projectDir);
      setActiveView("hub");
    } catch (err) {
      toast({
        title: "Launch failed",
        description: (err as Error).message,
        variant: "error",
      });
    }
  };

  const handleExport = async (agentId: string) => {
    try {
      const path = await ipc.agents.export(agentId);
      if (path) {
        toast({
          title: "Agent exported successfully",
          variant: "success",
        });
      }
    } catch (err) {
      toast({
        title: "Export failed",
        description: (err as Error).message,
        variant: "error",
      });
    }
  };

  const handleDeleteRequest = (agentId: string, agentName: string) => {
    modals.setDeleteTarget({ id: agentId, name: agentName });
  };

  const handleDeleteConfirm = async () => {
    if (!modals.deleteTarget) return;
    modals.setDeleting(true);
    try {
      await ipc.agents.delete(modals.deleteTarget.id);
      toast({
        title: `Agent "${modals.deleteTarget.name}" deleted`,
        variant: "success",
      });
      if (selectedAgentId === modals.deleteTarget.id) {
        setSelectedAgentId(null);
      }
      modals.setDeleteTarget(null);
      refetchAgents();
    } catch (err) {
      toast({
        title: "Delete failed",
        description: (err as Error).message,
        variant: "error",
      });
    } finally {
      modals.setDeleting(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <Titlebar
        runningCount={sessions.length}
        activeView={activeView}
        onSwitchView={setActiveView}
        onOpenSettings={() => modals.setSettingsOpen(true)}
        agents={agents ?? undefined}
        characters={characters}
        onAddAgent={modals.openLaunch}
        layoutOptions={layoutOptions}
        layout={layout}
        onLayoutChange={selectLayout}
      />
      {agents &&
      agents.length === 0 &&
      sessions.length === 0 &&
      activeView === "agents" ? (
        <OnboardingFlow
          runtimes={runtimes}
          runtimesLoaded={runtimesLoaded}
          onCreateAgent={createAgentAdapter}
          onCreated={(newAgentId) => {
            refetchAgents();
            clearCache();
            setSelectedAgentId(newAgentId);
          }}
        />
      ) : (
        <>
          <div
            className={`flex flex-1 gap-3 overflow-hidden p-3 ${activeView === "hub" ? "pointer-events-none absolute -z-10 opacity-0" : ""}`}
          >
            {selectedAgentId ? (
              <>
                <AgentHero
                  agentId={selectedAgentId}
                  character={characters[selectedAgentId] || null}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  onLaunch={modals.openLaunch}
                  onExport={handleExport}
                  onDelete={handleDeleteRequest}
                  onAgentUpdated={refetchAgents}
                />
                <AgentSidebar
                  agents={agents ?? []}
                  characters={characters}
                  selectedAgentId={selectedAgentId}
                  runningAgentIds={sessions.map((s) => s.agentId)}
                  onSelectAgent={(id) => {
                    setSelectedAgentId(id);
                    setActiveTab("overview");
                  }}
                  onCreateAgent={() => modals.setCreateAgentOpen(true)}
                  onInstallAgent={() => modals.setInstallAgentOpen(true)}
                />
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-fg-2 text-sm">Loading agents...</p>
              </div>
            )}
          </div>
          <div
            className={`flex flex-1 overflow-hidden ${activeView === "agents" ? "pointer-events-none absolute -z-10 opacity-0" : ""}`}
          >
            <Hub
              sessions={sessions}
              layout={layout}
              onClose={closeSession}
              onLaunchProject={handleLaunchProject}
              onReorder={reorderSessions}
            />
          </div>
        </>
      )}
      {modals.launchAgentId && (
        <LaunchAgentModal
          agentId={modals.launchAgentId}
          agentName={
            agents?.find((a) => a.id === modals.launchAgentId)?.name ||
            modals.launchAgentId
          }
          agentColor={characters[modals.launchAgentId]?.color || "#888"}
          character={characters[modals.launchAgentId] || null}
          open
          onClose={modals.closeLaunch}
          onLaunchProject={handleLaunchFromModal}
          onBrowse={handleLaunchBrowse}
          skipPermissions={modals.launchSkipPermissions}
          onSkipPermissionsChange={modals.setLaunchSkipPermissions}
        />
      )}
      <Modal
        open={modals.deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) modals.setDeleteTarget(null);
        }}
        title="Delete agent"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => modals.setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              disabled={modals.deleting}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-fg-2 text-sm">
          Are you sure you want to delete{" "}
          <strong className="text-fg-1">{modals.deleteTarget?.name}</strong>?
          This cannot be undone.
        </p>
      </Modal>
      {modals.createAgentOpen && (
        <div className="bg-bg-0 absolute inset-0 z-50 flex">
          <CreateAgentScreen
            runtimes={runtimes}
            runtimesLoaded={runtimesLoaded}
            onCreateAgent={createAgentAdapter}
            onCreated={(newAgentId) => {
              modals.setCreateAgentOpen(false);
              refetchAgents();
              clearCache();
              setSelectedAgentId(newAgentId);
            }}
            onCancel={() => modals.setCreateAgentOpen(false)}
          />
        </div>
      )}
      {replayIntroOpen && (
        <div className="bg-bg-0 absolute inset-0 z-50 flex">
          <OnboardingFlow
            forceIntro
            runtimes={runtimes}
            runtimesLoaded={runtimesLoaded}
            onCreateAgent={createAgentAdapter}
            onClose={() => setReplayIntroOpen(false)}
          />
        </div>
      )}
      <InstallAgentModal
        open={modals.installAgentOpen}
        onOpenChange={modals.setInstallAgentOpen}
        onInstalled={() => {
          refetchAgents();
          clearCache();
        }}
      />
      <SettingsModal
        open={modals.settingsOpen}
        onOpenChange={modals.setSettingsOpen}
        onReplayIntro={() => {
          modals.setSettingsOpen(false);
          setReplayIntroOpen(true);
        }}
      />
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <IpcProvider ipc={desktopUiIpc}>
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
