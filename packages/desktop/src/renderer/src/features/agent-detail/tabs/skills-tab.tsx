import React, { useState } from "react";
import { Trash2, FolderOpen, ChevronRight, Zap, Download } from "lucide-react";
import { Button, Empty, Modal, useIpcQuery, useToast } from "@tomomo/ui";
import { ipc } from "../../../lib/ipc";

interface SkillsTabProps {
  agentId: string;
  agentColor?: string;
}

interface SkillInfo {
  id: string;
  name: string;
  description: string;
  content: string;
}

export function SkillsTab({ agentId, agentColor }: SkillsTabProps) {
  const { toast } = useToast();
  const { data: skills, refetch } = useIpcQuery<SkillInfo[]>(
    () => ipc.agents.skillsList(agentId),
    [agentId]
  );
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<SkillInfo | null>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [installSource, setInstallSource] = useState("");
  const [installing, setInstalling] = useState(false);

  const handleAddLocal = async () => {
    const path = await ipc.app.selectDirectory();
    if (!path) return;
    try {
      const result = await ipc.agents.skillAdd(agentId, path);
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
      const result = await ipc.agents.skillInstallUrl(
        agentId,
        installSource.trim()
      );
      toast({ title: `Skill "${result.name}" installed`, variant: "success" });
      setInstallOpen(false);
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

  const handleBrowse = () => {
    window.open("https://skills.sh", "_blank");
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
    <div className="flex flex-1 flex-col gap-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-fg-1 text-sm font-medium">Installed skills</div>
          <div className="text-fg-3 mt-0.5 text-xs">
            Skills extend what the agent can do
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setInstallOpen(true)}
          >
            <Download size={14} />
            Install
          </Button>
          <Button size="sm" onClick={handleAddLocal} style={tintBg}>
            <FolderOpen size={14} />
            Add local
          </Button>
        </div>
      </div>

      {/* Installed skills list */}
      {skills && skills.length > 0 ? (
        <div className="flex flex-col gap-0.5">
          {skills.map((skill) => {
            const isExpanded = expandedSkill === skill.id;
            return (
              <div key={skill.id}>
                <div className="group ease hover:bg-bg-1 flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-[120ms]">
                  <button
                    onClick={() =>
                      setExpandedSkill(isExpanded ? null : skill.id)
                    }
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 border-none bg-transparent text-left"
                  >
                    <ChevronRight
                      size={14}
                      className={`text-fg-4 ease shrink-0 transition-transform duration-[120ms] ${isExpanded ? "rotate-90" : ""}`}
                    />
                    <Zap
                      size={14}
                      className="shrink-0"
                      style={{ color: agentColor || "var(--fg-3)" }}
                    />
                    <span className="text-fg-1 text-sm font-medium">
                      {skill.name}
                    </span>
                    {skill.description && (
                      <span className="text-fg-3 min-w-0 flex-1 truncate text-xs">
                        {skill.description}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setRemoveTarget(skill)}
                    className="text-fg-4 hover:text-error ease flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent opacity-0 transition-all duration-[120ms] group-hover:opacity-100"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {isExpanded && skill.content && (
                  <div className="mt-1 mb-2 ml-8">
                    <pre className="bg-bg-1 text-fg-2 max-h-[300px] overflow-auto rounded-xl p-4 font-mono text-xs leading-relaxed">
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
          description="Browse skills.sh or add a local skill folder to extend this agent."
        />
      )}

      {/* Install from URL modal */}
      <Modal
        open={installOpen}
        onOpenChange={(open) => {
          if (!open) {
            setInstallOpen(false);
            setInstallSource("");
          }
        }}
        title="Install skill"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setInstallOpen(false);
                setInstallSource("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInstallUrl}
              disabled={!installSource.trim() || installing}
              style={
                installSource.trim() && agentColor
                  ? { background: agentColor, color: "#fff" }
                  : undefined
              }
            >
              {installing ? "Installing..." : "Install"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-fg-2 text-sm">
            Paste a GitHub path from{" "}
            <button
              onClick={handleBrowse}
              className="ease cursor-pointer border-none bg-transparent font-medium underline transition-colors duration-[120ms]"
              style={{ color: agentColor || "var(--accent)" }}
            >
              skills.sh
            </button>{" "}
            or any GitHub repository containing a SKILL.md.
          </p>
          <input
            type="text"
            value={installSource}
            onChange={(e) => setInstallSource(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleInstallUrl();
            }}
            className="bg-bg-1 text-fg-1 placeholder:text-fg-4 h-10 w-full rounded-full border-none px-4 text-sm outline-none focus:shadow-[var(--shadow-focus)]"
            placeholder="owner/repo/skill-name"
            autoFocus
          />
          <div className="text-fg-4 text-xs">
            Examples: vercel-labs/skills/find-skills, myorg/my-skills/linter
          </div>
        </div>
      </Modal>

      {/* Remove confirmation */}
      <Modal
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title="Remove skill"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRemove}>
              Remove
            </Button>
          </>
        }
      >
        <p className="text-fg-2 text-sm">
          Remove <strong className="text-fg-1">{removeTarget?.name}</strong>{" "}
          from this agent?
        </p>
      </Modal>
    </div>
  );
}
