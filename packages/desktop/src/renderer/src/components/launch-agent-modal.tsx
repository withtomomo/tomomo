import React from "react";
import { Folder, FolderSearch, Play, ShieldOff } from "lucide-react";
import { Modal, Button, CharacterSprite, useIpcQuery } from "@tomomo/ui";
import { ipc } from "../lib/ipc";

interface LaunchAgentModalProps {
  agentId: string;
  agentName: string;
  agentColor: string;
  character: { grid: number[][]; color: string; size: number } | null;
  open: boolean;
  onClose: () => void;
  onLaunchProject: (projectDir: string) => void;
  onBrowse: () => void;
  skipPermissions?: boolean;
  onSkipPermissionsChange?: (value: boolean) => void;
}

export function LaunchAgentModal({
  agentId,
  agentName,
  agentColor,
  character,
  open,
  onClose,
  onLaunchProject,
  onBrowse,
  skipPermissions,
  onSkipPermissionsChange,
}: LaunchAgentModalProps) {
  const { data: projects } = useIpcQuery<
    Array<{ hash: string; path: string; remote?: string; lastUsed?: string }>
  >(
    () => (open ? ipc.agents.projects(agentId) : Promise.resolve([])),
    [agentId, open]
  );

  const c = agentColor;

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title="Launch agent"
    >
      <div className="flex flex-col gap-5">
        {/* Agent banner */}
        <div
          className="flex items-center gap-4 rounded-2xl px-5 py-4"
          style={{ background: `color-mix(in srgb, ${c} 10%, var(--bg-0))` }}
        >
          <div className="flex-1">
            <span className="text-base font-semibold" style={{ color: c }}>
              {agentName}
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-medium text-white"
                style={{ background: c }}
              >
                Ready to launch
              </span>
              {projects && projects.length > 0 && (
                <span className="text-[10px]" style={{ color: c }}>
                  {projects.length}{" "}
                  {projects.length === 1 ? "project" : "projects"}
                </span>
              )}
            </div>
          </div>
          {character && (
            <CharacterSprite
              grid={character.grid}
              color={character.color}
              size={character.size}
              displaySize={64}
              className="rounded-[18px]"
              animate
            />
          )}
        </div>

        {/* Skip permissions toggle */}
        <button
          role="switch"
          aria-checked={!!skipPermissions}
          onClick={() => onSkipPermissionsChange?.(!skipPermissions)}
          className="flex items-center gap-3 rounded-2xl border-none px-4 py-3 text-left transition-colors duration-[120ms]"
          style={{
            background: skipPermissions
              ? "color-mix(in srgb, var(--warning) 12%, var(--bg-0))"
              : "var(--bg-1)",
          }}
        >
          <ShieldOff
            size={16}
            className="shrink-0"
            style={{
              color: skipPermissions ? "var(--warning)" : "var(--fg-3)",
            }}
          />
          <div className="min-w-0 flex-1">
            <div
              className="text-sm font-medium"
              style={{
                color: skipPermissions ? "var(--warning)" : "var(--fg-1)",
              }}
            >
              Skip permissions
            </div>
            <div className="text-fg-3 mt-0.5 text-xs">
              Bypass all runtime permission prompts
            </div>
          </div>
          <div
            className="flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-[120ms]"
            style={{
              background: skipPermissions ? "var(--warning)" : "var(--bg-3)",
            }}
          >
            <div
              className="h-4 w-4 rounded-full bg-white transition-transform duration-[120ms]"
              style={{
                transform: skipPermissions
                  ? "translateX(16px)"
                  : "translateX(0)",
              }}
            />
          </div>
        </button>

        {/* Recent projects */}
        {projects && projects.length > 0 && (
          <div>
            <div
              className="mb-2 text-[10px] font-semibold tracking-wider uppercase"
              style={{ color: c }}
            >
              Recent projects
            </div>
            <div className="flex flex-col gap-0.5">
              {projects.map((p) => {
                const name = p.path.split(/[/\\]/).pop() || p.path;
                const dir =
                  p.path
                    .replace(/[/\\][^/\\]*$/, "")
                    .replace(/^\/(?:Users|home)\/[^/]+/, "~") || "/";
                return (
                  <button
                    key={p.hash}
                    onClick={() => onLaunchProject(p.path)}
                    className="group hover:bg-bg-1 flex items-center gap-3 rounded-xl border-none bg-transparent px-3 py-2.5 text-left transition-colors duration-[120ms]"
                  >
                    <Folder
                      size={14}
                      className="shrink-0"
                      style={{ color: c }}
                    />
                    <span className="text-fg-1 min-w-0 flex-1 truncate text-sm font-medium">
                      {name}
                    </span>
                    <span className="text-fg-2 min-w-0 truncate text-xs">
                      {dir}
                    </span>
                    <Play
                      size={13}
                      className="shrink-0 opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100"
                      style={{ color: c }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Browse for folder: primary action */}
        <Button
          variant="accent"
          size="md"
          onClick={onBrowse}
          style={{ background: c, color: "#fff" }}
          className="w-full"
        >
          <FolderSearch size={16} />
          Browse for folder
        </Button>
      </div>
    </Modal>
  );
}
