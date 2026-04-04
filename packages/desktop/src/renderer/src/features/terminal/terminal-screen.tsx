import React from "react";
import { TerminalView } from "@tomomo/ui";
import { X } from "lucide-react";
import { ipc } from "../../lib/ipc";

interface TerminalScreenProps {
  sessionId: string;
  agentName: string;
  agentColor: string;
  onClose: () => void;
}

export function TerminalScreen({
  sessionId,
  agentName,
  agentColor,
  onClose,
}: TerminalScreenProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Terminal header */}
      <div className="bg-bg-1 flex h-10 shrink-0 items-center px-4">
        <span className="text-sm font-semibold" style={{ color: agentColor }}>
          {agentName}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => {
            ipc.terminal.kill(sessionId);
            onClose();
          }}
          className="text-fg-3 hover:bg-bg-2 hover:text-fg-1 ease flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-all duration-[120ms]"
        >
          <X size={14} />
        </button>
      </div>

      {/* Terminal body */}
      <TerminalView sessionId={sessionId} />
    </div>
  );
}
