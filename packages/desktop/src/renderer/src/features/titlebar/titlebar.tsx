import React from "react";
import { LayoutGrid, Settings, Plus } from "lucide-react";
import {
  CharacterSprite,
  ToggleGroup,
  DropdownMenu,
  DropdownItem,
} from "@tomomo/ui";
import { LAYOUT_ICONS, LAYOUT_LABELS } from "../hub/hub";
import type { LucideIcon } from "lucide-react";
import type { AgentConfig } from "@tomomo/core";

interface TitlebarProps {
  runningCount: number;
  activeView: "agents" | "hub";
  onSwitchView: (view: "agents" | "hub") => void;
  onOpenSettings: () => void;
  agents?: AgentConfig[];
  characters?: Record<
    string,
    { grid: number[][]; color: string; size: number }
  >;
  onAddAgent?: (agentId: string) => void;
  layoutOptions?: string[];
  layout?: string;
  onLayoutChange?: (value: string) => void;
}

const dragStyle = { WebkitAppRegion: "drag" } as React.CSSProperties;
const noDragStyle = { WebkitAppRegion: "no-drag" } as React.CSSProperties;

export function Titlebar({
  runningCount,
  activeView,
  onSwitchView,
  onOpenSettings,
  agents,
  characters,
  onAddAgent,
  layoutOptions,
  layout,
  onLayoutChange,
}: TitlebarProps) {
  const showLayoutToggle =
    activeView === "hub" &&
    layoutOptions &&
    layoutOptions.length > 1 &&
    layout &&
    onLayoutChange;

  const showAddAgent =
    activeView === "hub" && agents && agents.length > 0 && onAddAgent;

  return (
    <div className="flex h-12 shrink-0 items-center px-4">
      {/* Left: traffic lights spacer (draggable for window move) */}
      <div className="w-[76px] shrink-0" style={dragStyle} />
      <span
        className="text-fg-1 text-base font-bold tracking-tight"
        style={{ letterSpacing: "-0.02em", ...noDragStyle }}
      >
        tomomo
      </span>

      {/* Spacer (draggable for window move) */}
      <div className="flex-1" style={dragStyle} />

      {/* Right: page actions + tabs + settings */}
      <div className="flex shrink-0 items-center gap-2" style={noDragStyle}>
        {showAddAgent && (
          <DropdownMenu
            align="end"
            trigger={
              <button className="bg-accent hover:bg-accent-hover flex h-6 items-center gap-1.5 rounded-full border-none px-2.5 text-[10px] font-medium text-white transition-colors duration-[120ms]">
                <Plus size={12} />
              </button>
            }
          >
            {agents.map((agent) => {
              const char = characters?.[agent.id];
              return (
                <DropdownItem
                  key={agent.id}
                  icon={
                    char ? (
                      <CharacterSprite
                        grid={char.grid}
                        color={char.color}
                        size={char.size}
                        displaySize={20}
                        className="rounded-[6px]"
                      />
                    ) : undefined
                  }
                  onSelect={() => onAddAgent(agent.id)}
                >
                  {agent.name}
                </DropdownItem>
              );
            })}
          </DropdownMenu>
        )}
        {showLayoutToggle && (
          <ToggleGroup
            items={layoutOptions.map((opt) => {
              const Icon = (LAYOUT_ICONS[opt] ?? LayoutGrid) as LucideIcon;
              return {
                value: opt,
                icon: <Icon size={12} />,
                title: LAYOUT_LABELS[opt],
              };
            })}
            value={layout}
            onChange={onLayoutChange}
          />
        )}
        <ToggleGroup
          size="xs"
          items={[
            { value: "agents", label: "Agents" },
            {
              value: "hub",
              label: runningCount > 0 ? `Hub (${runningCount})` : "Hub",
            },
          ]}
          value={activeView}
          onChange={(v) => onSwitchView(v as "agents" | "hub")}
        />
        <button
          onClick={onOpenSettings}
          className="text-fg-3 hover:text-fg-1 flex h-6 w-6 items-center justify-center rounded-full border-none bg-transparent transition-colors duration-[120ms]"
        >
          <Settings size={14} />
        </button>
      </div>
    </div>
  );
}
