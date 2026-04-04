import React, { useState, useEffect } from "react";
import { Terminal, MessageCircle } from "lucide-react";
import {
  TerminalView,
  disposeTerminal,
  CharacterSprite,
  Button,
} from "@tomomo/ui";
import { ipc } from "../lib/ipc";

const CHAT_PROMPT = `You're having a conversation with the user who manages you through Tomomo. Be yourself based on your personality. You can help with anything they ask. If they want to change something about you (personality, skills, preferences, name, description), use the tomomo-self tools to update your configuration files. Keep it natural, friendly, and be yourself. If your soul.md contains only a heading or is very short, this is likely your first conversation. Introduce yourself warmly and help the user configure your personality by interviewing them about their work, preferences, and communication style.`;

interface AgentChatProps {
  agentId: string;
  agentName: string;
  agentColor: string;
  character: { grid: number[][]; color: string; size: number } | null;
}

export function AgentChat({
  agentId,
  agentName,
  agentColor,
  character,
}: AgentChatProps) {
  const [started, setStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runtimeMissing, setRuntimeMissing] = useState<{
    name: string;
    command: string;
    url: string;
  } | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Reset when agent changes
  useEffect(() => {
    setStarted(false);
    setSessionId(null);
    setError(null);
    setRuntimeMissing(null);
  }, [agentId]);

  // Spawn terminal only when started
  useEffect(() => {
    if (!started) return;
    let currentSessionId: string | null = null;
    let disposed = false;

    const startChat = async () => {
      setRuntimeMissing(null);
      setError(null);

      try {
        const agentDir = await ipc.agents.getDir(agentId);
        const sid = await ipc.terminal.spawn(agentId, agentDir, {
          appendPrompt: CHAT_PROMPT,
          selfChat: true,
        });

        if (disposed) {
          ipc.terminal.kill(sid);
          disposeTerminal(sid);
          return;
        }

        currentSessionId = sid;
        setSessionId(sid);
        setError(null);
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes("not installed") || msg.includes("not available")) {
          try {
            const runtimes = await ipc.runtimes.check();
            const missing = runtimes.find(
              (r) => !r.available && msg.includes(r.install.description)
            );
            if (missing && !disposed) {
              setRuntimeMissing({
                name: missing.name,
                command: missing.install.command,
                url: missing.install.url,
              });
              return;
            }
          } catch {
            // Fallback to generic error
          }
        }
        if (!disposed) {
          setError(msg);
        }
      }
    };

    startChat();

    return () => {
      disposed = true;
      if (currentSessionId) {
        ipc.terminal.kill(currentSessionId);
        disposeTerminal(currentSessionId);
      }
    };
  }, [agentId, started, retryCount]);

  // Runtime missing
  if (runtimeMissing) {
    return (
      <div className="bg-bg-1 flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl">
        <Terminal size={28} className="text-fg-3" />
        <p className="text-fg-1 text-sm font-medium">
          {runtimeMissing.name} is not installed
        </p>
        <p className="text-fg-2 max-w-xs text-center text-xs">
          Install the runtime to start chatting with your agent
        </p>
        <div className="bg-bg-2 text-fg-1 rounded-xl px-4 py-2 font-mono text-xs">
          {runtimeMissing.command}
        </div>
        {runtimeMissing.url && (
          <a
            href={runtimeMissing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent text-xs hover:underline"
          >
            Learn more
          </a>
        )}
        <Button
          size="sm"
          variant="accent"
          onClick={() => {
            setRuntimeMissing(null);
            setError(null);
            setStarted(false);
            setRetryCount((c) => c + 1);
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="bg-bg-1 flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl">
        <p className="text-fg-1 text-sm font-medium">Could not start chat</p>
        <p className="text-fg-2 max-w-xs text-center text-xs">{error}</p>
      </div>
    );
  }

  // Placeholder: not started yet
  if (!started) {
    return (
      <div className="bg-bg-1 flex flex-1 flex-col items-center justify-center gap-5 rounded-2xl">
        {character && (
          <CharacterSprite
            grid={character.grid}
            color={character.color}
            size={character.size}
            displaySize={80}
            className="rounded-[22px]"
            animate
          />
        )}
        <p className="text-fg-1 text-sm font-medium">Chat with {agentName}</p>
        <p className="text-fg-2 max-w-xs text-center text-xs">
          Talk to your agent about anything. It can modify its own personality,
          skills, and memory.
        </p>
        <Button
          size="sm"
          style={{ background: agentColor, color: "#fff" }}
          onClick={() => setStarted(true)}
        >
          <MessageCircle size={14} />
          Start chat
        </Button>
      </div>
    );
  }

  // Loading
  if (!sessionId) {
    return (
      <div className="bg-bg-1 flex flex-1 items-center justify-center rounded-2xl">
        <p className="text-fg-2 text-sm">Starting conversation...</p>
      </div>
    );
  }

  // Active chat
  return (
    <div className="bg-bg-1 flex flex-1 overflow-hidden rounded-2xl">
      <TerminalView sessionId={sessionId} />
    </div>
  );
}
