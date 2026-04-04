import React from "react";
import { CharacterSprite, DropdownMenu, DropdownItem } from "@tomomo/ui";
import { Plus, Download } from "lucide-react";
import type { AgentConfig } from "@tomomo/core";

interface AgentSidebarProps {
  agents: AgentConfig[];
  characters: Record<string, { grid: number[][]; color: string; size: number }>;
  selectedAgentId: string;
  runningAgentIds: string[];
  onSelectAgent: (agentId: string) => void;
  onCreateAgent: () => void;
  onInstallAgent: () => void;
}

export function AgentSidebar({
  agents,
  characters,
  selectedAgentId,
  runningAgentIds,
  onSelectAgent,
  onCreateAgent,
  onInstallAgent,
}: AgentSidebarProps) {
  return (
    <div className="bg-bg-1 flex w-[200px] shrink-0 flex-col rounded-2xl p-3">
      <span className="text-fg-3 px-2 py-1 text-[10px] font-semibold tracking-wider uppercase">
        Agents
      </span>
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {agents.map((agent) => {
          const isSelected = agent.id === selectedAgentId;
          const isRunning = runningAgentIds.includes(agent.id);
          const char = characters[agent.id] || {
            grid: [],
            color: "#888",
            size: 18,
          };

          return (
            <button
              key={agent.id}
              onClick={() => onSelectAgent(agent.id)}
              className="flex cursor-pointer items-center gap-2.5 rounded-full border-none bg-transparent px-2.5 py-2 text-left transition-colors duration-[120ms]"
              style={isSelected ? { backgroundColor: char.color } : undefined}
            >
              <CharacterSprite
                grid={char.grid}
                color={isSelected ? "#ffffff" : char.color}
                size={char.size}
                displaySize={24}
                className="rounded-lg"
              />
              <div className="flex min-w-0 flex-col">
                <span
                  className="truncate text-xs font-semibold"
                  style={{
                    color: isSelected ? "#ffffff" : char.color,
                  }}
                >
                  {agent.name}
                </span>
                {isRunning && (
                  <span className="flex items-center gap-1">
                    <span
                      className="shrink-0 rounded-full"
                      style={{
                        width: 4,
                        height: 4,
                        backgroundColor: isSelected ? "#fff" : char.color,
                      }}
                    />
                    <span
                      className="text-[7px]"
                      style={{
                        color: isSelected
                          ? "rgba(255,255,255,0.7)"
                          : "var(--fg-3)",
                      }}
                    >
                      Running
                    </span>
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <DropdownMenu
        trigger={
          <button className="bg-bg-2 text-fg-3 hover:text-fg-2 mt-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-full border-none px-3 py-2 text-[10px] transition-colors duration-[120ms]">
            <Plus size={11} />
            New
          </button>
        }
      >
        <DropdownItem icon={<Plus size={14} />} onSelect={onCreateAgent}>
          Create agent
        </DropdownItem>
        <DropdownItem icon={<Download size={14} />} onSelect={onInstallAgent}>
          Install from GitHub
        </DropdownItem>
      </DropdownMenu>
    </div>
  );
}
