import React, { useState, useEffect } from "react";
import {
  Play,
  MoreVertical,
  MessageCircle,
  Ghost,
  Sparkles,
  Server,
  Brain,
  Settings,
  Download,
  Trash2,
  Plus,
} from "lucide-react";
import {
  CharacterSprite,
  Pill,
  Button,
  Empty,
  Modal,
  ToggleGroup,
  DropdownMenu,
  DropdownItem,
  DropdownDivider,
  useToast,
} from "@tomomo/ui";
import { ipc } from "../lib/ipc";
import { AgentChat } from "./agent-chat";
import { Soul } from "./config/soul";
import { Skills } from "./config/skills";
import { Mcp } from "./config/mcp";
import { Memory } from "./config/memory";
import { AgentSettings } from "./config/agent-settings";
import type { AgentConfig } from "@tomomo/core";

type Tab = "overview" | "soul" | "skills" | "mcp" | "memory" | "settings";

interface AgentsViewProps {
  agents: AgentConfig[];
  characters: Record<string, { grid: number[][]; color: string; size: number }>;
  selectedAgentId: string | null;
  runningAgentIds: string[];
  onSelectAgent: (id: string | null) => void;
  onLaunch: (agentId: string) => void;
  onRefetch: () => void;
  onCreateOpen?: () => void;
  onInstallOpen?: () => void;
}

const TABS: Array<{ key: Tab; icon: React.ElementType; label: string }> = [
  { key: "overview", icon: MessageCircle, label: "Overview" },
  { key: "soul", icon: Ghost, label: "Soul" },
  { key: "skills", icon: Sparkles, label: "Skills" },
  { key: "mcp", icon: Server, label: "MCP" },
  { key: "memory", icon: Brain, label: "Memory" },
  { key: "settings", icon: Settings, label: "Settings" },
];

export function AgentsView({
  agents,
  characters,
  selectedAgentId,
  runningAgentIds,
  onSelectAgent,
  onLaunch,
  onRefetch,
  onCreateOpen,
  onInstallOpen,
}: AgentsViewProps) {
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const selectedChar = selectedAgentId
    ? characters[selectedAgentId]
    : undefined;
  const selectedColor = selectedChar?.color || "#888";

  // Reset to overview when agent changes
  useEffect(() => {
    setActiveTab("overview");
  }, [selectedAgentId]);

  // Refetch agent data when leaving overview (chat may have modified agent files)
  const prevTabRef = React.useRef<Tab>("overview");
  useEffect(() => {
    if (prevTabRef.current === "overview" && activeTab !== "overview") {
      onRefetch();
    }
    prevTabRef.current = activeTab;
  }, [activeTab]);

  const handleExport = async (agentId: string) => {
    try {
      const path = await ipc.agents.export(agentId);
      if (path) {
        toast({ title: "Agent exported successfully", variant: "success" });
      }
    } catch (err) {
      toast({
        title: "Export failed",
        description: (err as Error).message,
        variant: "error",
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ipc.agents.delete(deleteTarget.id);
      toast({
        title: `Agent "${deleteTarget.name}" deleted`,
        variant: "success",
      });
      if (selectedAgentId === deleteTarget.id) {
        const remaining = agents.filter((a) => a.id !== deleteTarget.id);
        onSelectAgent(remaining[0]?.id ?? null);
      }
      setDeleteTarget(null);
      onRefetch();
    } catch (err) {
      toast({
        title: "Delete failed",
        description: (err as Error).message,
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (agents.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-3">
        <Empty
          title="No agents yet"
          description="Create your first agent to get started."
          action={
            <Button size="sm" variant="primary" onClick={onCreateOpen}>
              <Plus size={14} strokeWidth={1.75} />
              Create agent
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-1 overflow-hidden">
      {/* Main agent detail area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {selectedAgent && selectedChar ? (
          <div className="flex flex-1 flex-col overflow-hidden px-3 pt-3 pb-3">
            {/* Compact identity header */}
            <div className="flex shrink-0 items-center gap-3">
              <CharacterSprite
                grid={selectedChar.grid}
                color={selectedColor}
                size={selectedChar.size}
                displaySize={40}
                animate
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span
                  className="truncate text-lg font-bold tracking-tight"
                  style={{ color: selectedColor }}
                >
                  {selectedAgent.name}
                </span>
                {selectedAgent.description && (
                  <span className="text-fg-3 truncate text-xs">
                    {selectedAgent.description}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                style={{ background: selectedColor, color: "#fff" }}
                onClick={() => onLaunch(selectedAgent.id)}
              >
                <Play size={12} strokeWidth={1.75} />
                Launch
              </Button>
              <DropdownMenu
                trigger={
                  <button className="text-fg-3 hover:text-fg-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent transition-colors duration-[120ms]">
                    <MoreVertical size={14} strokeWidth={1.75} />
                  </button>
                }
              >
                <DropdownItem
                  icon={<Download size={14} strokeWidth={1.75} />}
                  onSelect={() => handleExport(selectedAgent.id)}
                >
                  Export
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem
                  icon={<Trash2 size={14} strokeWidth={1.75} />}
                  danger
                  onSelect={() =>
                    setDeleteTarget({
                      id: selectedAgent.id,
                      name: selectedAgent.name,
                    })
                  }
                >
                  Delete
                </DropdownItem>
              </DropdownMenu>
            </div>

            {/* Badges + tab toggle */}
            <div className="mt-2 flex shrink-0 items-center gap-2">
              <Pill color={selectedColor}>
                <span className="text-fg-1 font-semibold">
                  {selectedAgent.launchCount}
                </span>
                <span className="ml-1" style={{ color: selectedColor }}>
                  launches
                </span>
              </Pill>
              <Pill color={selectedColor}>
                <span style={{ color: selectedColor }}>
                  {selectedAgent.runtime}
                </span>
              </Pill>
              <div className="flex-1" />
              <ToggleGroup
                size="xs"
                items={TABS.map((tab) => ({
                  value: tab.key,
                  icon: <tab.icon size={12} strokeWidth={1.75} />,
                  title: tab.label,
                }))}
                value={activeTab}
                onChange={(v) => setActiveTab(v as Tab)}
              />
            </div>

            {/* Tab content: all tabs mounted, hidden when inactive */}
            <div
              className={`mt-3 flex flex-1 overflow-hidden ${activeTab === "overview" ? "" : "hidden"}`}
            >
              <AgentChat
                agentId={selectedAgent.id}
                agentName={selectedAgent.name}
                agentColor={selectedColor}
                character={selectedChar}
              />
            </div>
            <div
              className={`mt-3 flex flex-1 flex-col overflow-y-auto ${activeTab === "soul" ? "" : "hidden"}`}
            >
              <Soul agentId={selectedAgent.id} agentColor={selectedColor} />
            </div>
            <div
              className={`mt-3 flex flex-1 flex-col overflow-y-auto ${activeTab === "skills" ? "" : "hidden"}`}
            >
              <Skills agentId={selectedAgent.id} agentColor={selectedColor} />
            </div>
            <div
              className={`mt-3 flex flex-1 flex-col overflow-y-auto ${activeTab === "mcp" ? "" : "hidden"}`}
            >
              <Mcp agentId={selectedAgent.id} agentColor={selectedColor} />
            </div>
            <div
              className={`mt-3 flex flex-1 flex-col overflow-y-auto ${activeTab === "memory" ? "" : "hidden"}`}
            >
              <Memory agentId={selectedAgent.id} agentColor={selectedColor} />
            </div>
            <div
              className={`mt-3 flex flex-1 flex-col overflow-y-auto ${activeTab === "settings" ? "" : "hidden"}`}
            >
              <AgentSettings
                agentId={selectedAgent.id}
                agentName={selectedAgent.name}
                agentColor={selectedColor}
                onAgentUpdated={onRefetch}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <span className="text-fg-3 text-sm">Select an agent</span>
          </div>
        )}
      </div>

      {/* Right sidebar: compact agent icons */}
      <div className="bg-bg-1 my-2 mr-0 flex w-14 shrink-0 flex-col items-center rounded-l-2xl py-2">
        <div className="flex flex-1 flex-col items-center gap-1 overflow-y-auto py-1">
          {agents.map((agent) => {
            const char = characters[agent.id];
            const isSelected = agent.id === selectedAgentId;
            const isRunning = runningAgentIds.includes(agent.id);
            const color = char?.color || "#888";

            return (
              <button
                key={agent.id}
                onClick={() => onSelectAgent(agent.id)}
                title={agent.name}
                className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-none transition-colors duration-[120ms]"
                style={
                  isSelected
                    ? { background: color }
                    : { background: "transparent" }
                }
              >
                {char && (
                  <CharacterSprite
                    grid={char.grid}
                    color={isSelected ? "#fff" : color}
                    size={char.size}
                    displaySize={24}
                  />
                )}
                {isRunning && !isSelected && (
                  <span
                    className="absolute right-0.5 bottom-0.5 h-2 w-2 rounded-full"
                    style={{ background: color }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <DropdownMenu
          trigger={
            <button className="text-fg-3 hover:bg-bg-2 mt-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-transparent transition-colors duration-[120ms]">
              <Plus size={16} strokeWidth={1.75} />
            </button>
          }
        >
          <DropdownItem
            icon={<Plus size={14} strokeWidth={1.75} />}
            onSelect={() => onCreateOpen?.()}
          >
            Create new
          </DropdownItem>
          <DropdownItem
            icon={<Download size={14} strokeWidth={1.75} />}
            onSelect={() => onInstallOpen?.()}
          >
            Install from URL
          </DropdownItem>
        </DropdownMenu>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete agent"
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={deleting}
              onClick={confirmDelete}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      >
        <p className="text-fg-2 text-sm">
          Are you sure you want to delete{" "}
          <strong className="text-fg-1">{deleteTarget?.name}</strong>? This
          action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
