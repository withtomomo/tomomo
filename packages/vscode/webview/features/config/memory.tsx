import React, { useState } from "react";
import { ChevronRight, Folder, Brain } from "lucide-react";
import { Empty, useIpcQuery } from "@tomomo/ui";
import { ipc } from "../../lib/ipc";
import { Breadcrumb } from "../breadcrumb";

interface MemoryProps {
  agentId: string;
  onBack: () => void;
  agentName: string;
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
        className="flex w-full cursor-pointer items-center gap-2 rounded-2xl border-none bg-transparent px-3 py-2.5 text-left transition-colors duration-[120ms]"
      >
        <Folder size={14} className="shrink-0" style={{ color: agentColor }} />
        <div className="min-w-0 flex-1">
          <span className="text-fg-1 text-sm font-medium">{name}</span>
          <div className="text-fg-3 truncate text-[10px]">{dir}</div>
        </div>
        <ChevronRight
          size={14}
          className={`text-fg-4 shrink-0 transition-transform duration-[120ms] ${expanded ? "rotate-90" : ""}`}
        />
      </button>
      {expanded && (
        <div className="px-3 pb-3">
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

export function Memory({
  agentId,
  onBack,
  agentName,
  agentColor,
}: MemoryProps) {
  const { data: agentMemory, loading: memoryLoading } = useIpcQuery<
    string | null
  >(() => ipc.agents.memoryFull(agentId), [agentId]);
  const { data: projects } = useIpcQuery<
    Array<{ hash: string; path: string; remote?: string }>
  >(() => ipc.agents.projects(agentId), [agentId]);

  const c = agentColor || "var(--fg-3)";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Breadcrumb title={`${agentName} / Memory`} onBack={onBack} />

      {/* Content */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
        {memoryLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-fg-2 text-sm">Loading...</p>
          </div>
        ) : !agentMemory && (!projects || projects.length === 0) ? (
          <Empty
            icon={<Brain size={28} />}
            color={c}
            title="No memory yet"
            description="Launch the agent to start building knowledge. Memory grows with every session."
          />
        ) : (
          <>
            {/* Agent memory */}
            {agentMemory && (
              <div>
                <div
                  className="mb-2 text-[10px] font-semibold tracking-wider uppercase"
                  style={{ color: c }}
                >
                  Agent memory
                </div>
                <div className="bg-bg-1 rounded-2xl p-3">
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
                  className="mb-2 text-[10px] font-semibold tracking-wider uppercase"
                  style={{ color: c }}
                >
                  Project memories
                </div>
                <div className="flex flex-col gap-1.5">
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
          </>
        )}
      </div>
    </div>
  );
}
