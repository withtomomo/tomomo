import { useState, useCallback } from "react";

export function useModals() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createAgentOpen, setCreateAgentOpen] = useState(false);
  const [installAgentOpen, setInstallAgentOpen] = useState(false);
  const [launchAgentId, setLaunchAgentId] = useState<string | null>(null);
  const [launchSkipPermissions, setLaunchSkipPermissions] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openLaunch = useCallback((agentId: string) => {
    setLaunchAgentId(agentId);
    setLaunchSkipPermissions(false);
  }, []);

  const closeLaunch = useCallback(() => {
    setLaunchAgentId(null);
    setLaunchSkipPermissions(false);
  }, []);

  return {
    settingsOpen,
    setSettingsOpen,
    createAgentOpen,
    setCreateAgentOpen,
    installAgentOpen,
    setInstallAgentOpen,
    launchAgentId,
    launchSkipPermissions,
    setLaunchSkipPermissions,
    openLaunch,
    closeLaunch,
    deleteTarget,
    setDeleteTarget,
    deleting,
    setDeleting,
  };
}
