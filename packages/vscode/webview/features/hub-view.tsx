import React, { useState, useEffect } from "react";
import { X, Plus, Play } from "lucide-react";
import {
  CharacterSprite,
  TerminalView,
  refitTerminal,
  Button,
  Empty,
  DropdownMenu,
  DropdownItem,
} from "@tomomo/ui";
import type { TerminalSession } from "@tomomo/ui";
import type { AgentConfig } from "@tomomo/core";

interface HubViewProps {
  sessions: TerminalSession[];
  onClose: (sessionId: string) => void;
  agents: AgentConfig[];
  characters: Record<string, { grid: number[][]; color: string; size: number }>;
  onLaunch: (agentId: string) => void;
}

export function HubView({
  sessions,
  onClose,
  agents,
  characters,
  onLaunch,
}: HubViewProps) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Auto-sync active session when sessions change
  useEffect(() => {
    if (sessions.length === 0) {
      setActiveSessionId(null);
      return;
    }

    // If current active session was removed, switch to last session
    if (
      activeSessionId &&
      !sessions.some((s) => s.sessionId === activeSessionId)
    ) {
      setActiveSessionId(sessions[sessions.length - 1]!.sessionId);
      return;
    }

    // If no active session, select the latest
    if (!activeSessionId) {
      setActiveSessionId(sessions[sessions.length - 1]!.sessionId);
    }
  }, [sessions, activeSessionId]);

  // Refit terminal when switching tabs
  useEffect(() => {
    if (activeSessionId) {
      // Small delay to let the DOM update before refitting
      const tid = setTimeout(() => refitTerminal(activeSessionId), 50);
      return () => clearTimeout(tid);
    }
  }, [activeSessionId]);

  if (sessions.length === 0) {
    return (
      <div className="flex flex-1 p-3">
        <Empty
          title="No running sessions"
          description="Launch an agent to start a terminal session."
          action={
            agents.length > 0 ? (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  if (agents[0]) onLaunch(agents[0].id);
                }}
              >
                <Play size={14} strokeWidth={1.75} />
                Launch an agent
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  const activeSession = sessions.find((s) => s.sessionId === activeSessionId);

  return (
    <div className="flex w-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto px-2 py-1.5">
        {sessions.map((session) => {
          const char = characters[session.agentId];
          const isActive = session.sessionId === activeSessionId;
          return (
            <button
              key={session.sessionId}
              onClick={() => setActiveSessionId(session.sessionId)}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-none px-2.5 py-1 text-xs font-medium text-white transition-colors duration-[120ms]"
              style={{
                background: session.agentColor,
                opacity: isActive ? 1 : 0.6,
              }}
            >
              {char && (
                <CharacterSprite
                  grid={char.grid}
                  color="#fff"
                  size={char.size}
                  displaySize={20}
                />
              )}
              {session.agentName}
            </button>
          );
        })}

        {agents.length > 0 && (
          <DropdownMenu
            trigger={
              <button className="text-fg-3 hover:bg-bg-2 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent transition-colors duration-[120ms]">
                <Plus size={14} strokeWidth={1.75} />
              </button>
            }
            align="start"
          >
            {agents.map((agent) => (
              <DropdownItem
                key={agent.id}
                icon={
                  characters[agent.id] ? (
                    <CharacterSprite
                      grid={characters[agent.id]!.grid}
                      color={characters[agent.id]!.color}
                      size={characters[agent.id]!.size}
                      displaySize={16}
                    />
                  ) : undefined
                }
                onSelect={() => onLaunch(agent.id)}
              >
                {agent.name}
              </DropdownItem>
            ))}
          </DropdownMenu>
        )}
      </div>

      {activeSession && (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="bg-bg-1 flex h-7 shrink-0 items-center gap-2 px-3">
            <span
              className="text-[11px] font-medium"
              style={{ color: activeSession.agentColor }}
            >
              {activeSession.agentName}
            </span>
            <span className="text-fg-3 min-w-0 flex-1 truncate text-[10px]">
              {activeSession.projectDir}
            </span>
            <button
              onClick={() => onClose(activeSession.sessionId)}
              className="text-fg-3 hover:bg-bg-2 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-none bg-transparent transition-colors duration-[120ms]"
            >
              <X size={12} strokeWidth={1.75} />
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {sessions.map((session) => (
              <div
                key={session.sessionId}
                className="h-full w-full"
                style={{
                  display:
                    session.sessionId === activeSessionId ? "block" : "none",
                }}
              >
                <TerminalView sessionId={session.sessionId} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
