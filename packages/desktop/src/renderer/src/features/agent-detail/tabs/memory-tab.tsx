import React, { useState } from "react";
import { ChevronRight, Folder, Brain } from "lucide-react";
import { Empty, useIpcQuery } from "@tomomo/ui";
import { ipc } from "../../../lib/ipc";

interface MemoryTabProps {
  agentId: string;
  agentColor?: string;
}

function ProjectMemory({
  agentId,
  agentColor,
  projectHash,
  projectPath,
}: {
  agentId: string;
  agentColor?: string;
  projectHash: string;
  projectPath: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: memory, loading } = useIpcQuery<string | null>(
    () =>
      expanded
        ? ipc.agents.projectMemory(agentId, projectHash)
        : Promise.resolve(null),
    [agentId, projectHash, expanded]
  );
  const name = projectPath.split(/[/\\]/).pop() || projectPath;
  const dir =
    projectPath
      .replace(/[/\\][^/\\]*$/, "")
      .replace(/^\/(?:Users|home)\/[^/]+/, "~") || "/";

  return (
    <div className="bg-bg-1 rounded-2xl">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border-none bg-transparent px-4 py-3 text-left transition-colors duration-[120ms]"
      >
        <Folder size={15} className="shrink-0" style={{ color: agentColor }} />
        <span className="text-fg-1 text-sm font-medium">{name}</span>
        <span className="text-fg-2 min-w-0 flex-1 truncate text-xs">{dir}</span>
        <ChevronRight
          size={14}
          className={`text-fg-4 shrink-0 transition-transform duration-[120ms] ${expanded ? "rotate-90" : ""}`}
        />
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          {loading ? (
            <p className="text-fg-2 text-xs">Loading...</p>
          ) : memory ? (
            <pre className="text-fg-1 max-h-[300px] overflow-auto font-mono text-xs leading-relaxed">
              {memory}
            </pre>
          ) : (
            <p className="text-fg-2 text-xs">No memory for this project yet</p>
          )}
        </div>
      )}
    </div>
  );
}

export function MemoryTab({ agentId, agentColor }: MemoryTabProps) {
  const { data: agentMemory, loading: memoryLoading } = useIpcQuery<
    string | null
  >(() => ipc.agents.memoryFull(agentId), [agentId]);
  const { data: projects } = useIpcQuery<
    Array<{ hash: string; path: string; remote?: string }>
  >(() => ipc.agents.projects(agentId), [agentId]);

  const c = agentColor || "var(--fg-3)";

  if (memoryLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-fg-2 text-sm">Loading...</p>
      </div>
    );
  }

  if (!agentMemory && (!projects || projects.length === 0)) {
    return (
      <Empty
        icon={<Brain size={28} />}
        color={c}
        title="No memory yet"
        description="Launch the agent to start building knowledge. Memory grows with every session."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Agent memory */}
      {agentMemory && (
        <div>
          <div
            className="mb-3 text-[10px] font-semibold tracking-wider uppercase"
            style={{ color: c }}
          >
            Agent memory
          </div>
          <div className="bg-bg-1 rounded-2xl p-4">
            <pre className="text-fg-1 max-h-[400px] overflow-auto font-mono text-xs leading-relaxed">
              {agentMemory}
            </pre>
          </div>
        </div>
      )}

      {/* Project memories */}
      {projects && projects.length > 0 && (
        <div>
          <div
            className="mb-3 text-[10px] font-semibold tracking-wider uppercase"
            style={{ color: c }}
          >
            Project memories
          </div>
          <div className="flex flex-col gap-2">
            {projects.map((p) => (
              <ProjectMemory
                key={p.hash}
                agentId={agentId}
                agentColor={agentColor}
                projectHash={p.hash}
                projectPath={p.path}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
