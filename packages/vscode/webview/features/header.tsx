import React from "react";
import { Settings } from "lucide-react";
import { ToggleGroup } from "@tomomo/ui";

interface HeaderProps {
  activeView: "agents" | "hub";
  onSwitchView: (view: "agents" | "hub") => void;
  runningCount: number;
  onOpenSettings?: () => void;
}

export function Header({
  activeView,
  onSwitchView,
  runningCount,
  onOpenSettings,
}: HeaderProps) {
  const hubLabel = runningCount > 0 ? `Hub (${runningCount})` : "Hub";

  return (
    <div className="bg-bg-0 relative flex h-11 shrink-0 items-center px-3">
      <span className="text-fg-1 text-sm font-bold tracking-tight">tomomo</span>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="pointer-events-auto">
          <ToggleGroup
            items={[
              { value: "agents", label: "Agents" },
              { value: "hub", label: hubLabel },
            ]}
            value={activeView}
            onChange={(v) => onSwitchView(v as "agents" | "hub")}
            size="xs"
          />
        </div>
      </div>

      <div className="ml-auto">
        <button
          onClick={onOpenSettings}
          className="text-fg-3 hover:bg-bg-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-transparent transition-colors duration-[120ms]"
        >
          <Settings size={15} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
