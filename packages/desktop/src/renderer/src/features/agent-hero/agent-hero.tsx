import React, { useEffect } from "react";
import {
  CharacterSprite,
  Button,
  Pill,
  ToggleGroup,
  DropdownMenu,
  DropdownItem,
  useIpcQuery,
} from "@tomomo/ui";
import { AgentChat } from "../../components/agent-chat";
import {
  Play,
  MoreVertical,
  Download,
  Trash2,
  MessageCircle,
  Sparkles,
  Zap,
  Brain,
  Settings,
  Server,
} from "lucide-react";
import { ipc } from "../../lib/ipc";
import { SoulTab } from "../agent-detail/tabs/soul-tab";
import { MemoryTab } from "../agent-detail/tabs/memory-tab";
import { SkillsTab } from "../agent-detail/tabs/skills-tab";
import { McpTab } from "../agent-detail/tabs/mcp-tab";
import { SettingsTab } from "../agent-detail/tabs/settings-tab";
import type { AgentConfig } from "@tomomo/core";

type Tab = "overview" | "soul" | "skills" | "mcp" | "memory" | "settings";

interface AgentHeroProps {
  agentId: string;
  character: { grid: number[][]; color: string; size: number } | null;
  onLaunch: (agentId: string) => void;
  onExport: (agentId: string) => void;
  onDelete: (agentId: string, agentName: string) => void;
  onAgentUpdated: () => void;
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
}

const TABS: Array<{ key: Tab; label: string; icon: React.ElementType }> = [
  { key: "overview", label: "Overview", icon: MessageCircle },
  { key: "soul", label: "Soul", icon: Sparkles },
  { key: "skills", label: "Skills", icon: Zap },
  { key: "mcp", label: "MCP", icon: Server },
  { key: "memory", label: "Memory", icon: Brain },
  { key: "settings", label: "Settings", icon: Settings },
];

export function AgentHero({
  agentId,
  character,
  onLaunch,
  onExport,
  onDelete,
  onAgentUpdated,
  activeTab = "overview",
  onTabChange,
}: AgentHeroProps) {
  const {
    data: agent,
    loading,
    refetch,
  } = useIpcQuery<AgentConfig | null>(
    () => ipc.agents.load(agentId),
    [agentId]
  );
  const { data: projects, refetch: refetchProjects } = useIpcQuery<
    Array<{ hash: string; path: string; remote?: string }>
  >(() => ipc.agents.projects(agentId), [agentId]);

  // Refetch agent data when switching tabs (chat may have modified agent files)
  useEffect(() => {
    refetch();
    refetchProjects();
    onAgentUpdated();
  }, [activeTab]);

  // Poll for agent changes while chat is active (agent can modify itself)
  useEffect(() => {
    if (activeTab !== "overview") return;
    const interval = setInterval(() => {
      refetch();
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTab, agentId]);

  if (loading || !agent) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-fg-2 text-sm">Loading...</p>
      </div>
    );
  }

  const c = character?.color || "#888";
  const launchCount = agent.launchCount ?? 0;
  const projectCount = projects?.length ?? 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden px-3">
      {/* Header: identity + launch + menu */}
      <div className="shrink-0">
        <div className="flex items-center gap-4">
          {character && (
            <CharacterSprite
              grid={character.grid}
              color={character.color}
              size={character.size}
              displaySize={48}
              className="rounded-[14px]"
              animate
            />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold" style={{ color: c }}>
              {agent.name}
            </h1>
            <p className="text-fg-2 text-xs">
              {agent.description || "No description"}
            </p>
          </div>
          <Button
            size="sm"
            style={{ background: c, color: "#fff" }}
            onClick={() => onLaunch(agentId)}
          >
            <Play size={14} />
            Launch
          </Button>
          <DropdownMenu
            trigger={
              <button className="text-fg-3 hover:text-fg-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-transparent transition-colors duration-[120ms]">
                <MoreVertical size={16} />
              </button>
            }
          >
            <DropdownItem
              icon={<Download size={14} />}
              onSelect={() => onExport(agentId)}
            >
              Export
            </DropdownItem>
            <DropdownItem
              icon={<Trash2 size={14} />}
              danger
              onSelect={() => onDelete(agentId, agent.name)}
            >
              Delete
            </DropdownItem>
          </DropdownMenu>
        </div>

        {/* Stats + runtime + tabs (all one row) */}
        <div className="mt-4 flex items-center gap-2">
          <Pill color={c}>
            <span className="text-fg-1 font-semibold">{launchCount}</span>
            <span className="ml-1" style={{ color: c }}>
              launches
            </span>
          </Pill>
          <Pill color={c}>
            <span className="text-fg-1 font-semibold">{projectCount}</span>
            <span className="ml-1" style={{ color: c }}>
              projects
            </span>
          </Pill>
          <Pill color={c}>
            <span style={{ color: c }}>{agent.runtime}</span>
          </Pill>
          <div className="flex-1" />
          <ToggleGroup
            size="md"
            items={TABS.map((tab) => ({
              value: tab.key,
              label: tab.label,
              icon: <tab.icon size={12} />,
            }))}
            value={activeTab}
            onChange={(v) => onTabChange?.(v as Tab)}
          />
        </div>
      </div>

      {/* Tab content: all tabs mounted, hidden when inactive */}
      <div
        className={`mt-4 flex flex-1 flex-col overflow-hidden ${activeTab === "overview" ? "" : "hidden"}`}
      >
        <AgentChat
          agentId={agentId}
          agentName={agent.name}
          agentColor={c}
          character={character}
        />
      </div>
      <div
        className={`mt-4 flex flex-1 flex-col overflow-y-auto ${activeTab === "soul" ? "" : "hidden"}`}
      >
        <SoulTab agentId={agentId} agentColor={c} />
      </div>
      <div
        className={`mt-4 flex flex-1 flex-col overflow-y-auto ${activeTab === "skills" ? "" : "hidden"}`}
      >
        <SkillsTab agentId={agentId} agentColor={c} />
      </div>
      <div
        className={`mt-4 flex flex-1 flex-col overflow-y-auto ${activeTab === "mcp" ? "" : "hidden"}`}
      >
        <McpTab agentId={agentId} agentColor={character?.color} />
      </div>
      <div
        className={`mt-4 flex flex-1 flex-col overflow-y-auto ${activeTab === "memory" ? "" : "hidden"}`}
      >
        <MemoryTab agentId={agentId} agentColor={c} />
      </div>
      <div
        className={`mt-4 flex flex-1 flex-col overflow-y-auto ${activeTab === "settings" ? "" : "hidden"}`}
      >
        <SettingsTab
          agent={agent}
          agentColor={c}
          onSaved={() => {
            refetch();
            onAgentUpdated();
          }}
        />
      </div>
    </div>
  );
}
