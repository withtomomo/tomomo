import React, { useState } from "react";
import { Trash2, FolderOpen, ChevronRight, Zap, Download } from "lucide-react";
import { Button, Empty, useIpcQuery, useToast } from "@tomomo/ui";
import { ipc } from "../../lib/ipc";

interface SkillsProps {
  agentId: string;
  agentColor?: string;
}

interface SkillInfo {
  id: string;
  name: string;
  description: string;
  content: string;
}

export function Skills({ agentId, agentColor }: SkillsProps) {
  const { toast } = useToast();
  const { data: skills, refetch } = useIpcQuery<SkillInfo[]>(
    () => ipc.agents.skillsList(agentId),
    [agentId]
  );
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<SkillInfo | null>(null);
  const [installSource, setInstallSource] = useState("");
  const [installing, setInstalling] = useState(false);

  const handleAddLocal = async () => {
    const path = await ipc.app.selectDirectory();
    if (!path) return;
    try {
      const result = (await ipc.agents.skillAdd(agentId, path)) as {
        name: string;
      };
      toast({ title: `Skill "${result.name}" added`, variant: "success" });
      refetch();
    } catch (err) {
      toast({
        title: "Failed to add skill",
        description: (err as Error).message,
        variant: "error",
      });
    }
  };

  const handleInstallUrl = async () => {
    if (!installSource.trim()) return;
    setInstalling(true);
    try {
      const result = (await ipc.agents.skillInstallUrl(
        agentId,
        installSource.trim()
      )) as { name: string };
      toast({ title: `Skill "${result.name}" installed`, variant: "success" });
      setInstallSource("");
      refetch();
    } catch (err) {
      toast({
        title: "Failed to install skill",
        description: (err as Error).message,
        variant: "error",
      });
    } finally {
      setInstalling(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    try {
      await ipc.agents.skillRemove(agentId, removeTarget.id);
      toast({
        title: `Skill "${removeTarget.name}" removed`,
        variant: "success",
      });
      setRemoveTarget(null);
      refetch();
    } catch (err) {
      toast({
        title: "Failed to remove skill",
        description: (err as Error).message,
        variant: "error",
      });
    }
  };

  const tintBg = agentColor
    ? {
        background: `color-mix(in srgb, ${agentColor} 12%, var(--bg-0))`,
        color: agentColor,
      }
    : undefined;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-fg-2 text-xs font-medium">
            Install from URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={installSource}
              onChange={(e) => setInstallSource(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleInstallUrl();
              }}
              className="bg-bg-1 text-fg-1 placeholder:text-fg-4 h-9 min-w-0 flex-1 rounded-full border-none px-3 text-xs outline-none focus:shadow-[var(--shadow-focus)]"
              placeholder="owner/repo/skill-name"
            />
            <Button
              size="sm"
              onClick={handleInstallUrl}
              disabled={!installSource.trim() || installing}
              style={
                installSource.trim() && agentColor
                  ? { background: agentColor, color: "#fff" }
                  : undefined
              }
            >
              <Download size={12} />
              {installing ? "..." : "Install"}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-fg-1 text-sm font-medium">Installed skills</div>
          <Button size="sm" onClick={handleAddLocal} style={tintBg}>
            <FolderOpen size={14} />
            Add local
          </Button>
        </div>

        {skills && skills.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {skills.map((skill) => {
              const isExpanded = expandedSkill === skill.id;
              return (
                <div key={skill.id}>
                  <div className="hover:bg-bg-1 flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors duration-[120ms]">
                    <button
                      onClick={() =>
                        setExpandedSkill(isExpanded ? null : skill.id)
                      }
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-none bg-transparent text-left"
                    >
                      <ChevronRight
                        size={14}
                        className={`text-fg-4 shrink-0 transition-transform duration-[120ms] ${isExpanded ? "rotate-90" : ""}`}
                      />
                      <Zap
                        size={14}
                        className="shrink-0"
                        style={{ color: agentColor || "var(--fg-3)" }}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-fg-1 text-sm font-medium">
                          {skill.name}
                        </span>
                        {skill.description && (
                          <div className="text-fg-3 truncate text-xs">
                            {skill.description}
                          </div>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => setRemoveTarget(skill)}
                      className="text-fg-4 hover:text-error flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent transition-colors duration-[120ms]"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {isExpanded && skill.content && (
                    <div className="mt-1 mb-2 ml-6">
                      <pre className="bg-bg-1 text-fg-2 max-h-[300px] overflow-auto rounded-xl p-3 font-mono text-xs leading-relaxed">
                        {skill.content}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            icon={<Zap size={20} />}
            title="No skills installed"
            description="Install a skill from a URL or add a local skill folder."
          />
        )}

        {removeTarget && (
          <div className="bg-bg-1 flex flex-col gap-3 rounded-2xl p-4">
            <p className="text-fg-2 text-sm">
              Remove <strong className="text-fg-1">{removeTarget.name}</strong>{" "}
              from this agent?
            </p>
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={handleRemove}>
                Remove
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRemoveTarget(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
