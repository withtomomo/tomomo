import React, { useState, useEffect } from "react";
import { ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";
import { Button, Select, useIpcQuery, useToast } from "@tomomo/ui";
import { ipc } from "../../lib/ipc";
import { Breadcrumb } from "../breadcrumb";
import type { AgentConfig, QuickCommand } from "@tomomo/core";
import type { RuntimeInfo } from "../../types";

interface AgentSettingsProps {
  agentId: string;
  onBack: () => void;
  agentName: string;
  agentColor?: string;
  onAgentUpdated?: () => void;
}

export function AgentSettings({
  agentId,
  onBack,
  agentName,
  agentColor,
  onAgentUpdated,
}: AgentSettingsProps) {
  const { toast } = useToast();
  const { data: agent } = useIpcQuery<AgentConfig>(
    () => ipc.agents.load(agentId) as Promise<AgentConfig>,
    [agentId]
  );
  const { data: runtimesData } = useIpcQuery<RuntimeInfo[]>(
    () => ipc.runtimes.check() as Promise<RuntimeInfo[]>
  );
  const runtimes = runtimesData ?? [];

  const [name, setName] = useState(agentName);
  const [description, setDescription] = useState("");
  const [runtime, setRuntime] = useState("claude-code");
  const [model, setModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [commands, setCommands] = useState<QuickCommand[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [cmdName, setCmdName] = useState("");
  const [cmdPrompt, setCmdPrompt] = useState("");

  useEffect(() => {
    if (!agent) return;
    setName(agent.name);
    setDescription(agent.description || "");
    setRuntime(agent.runtime);
    setModel(agent.model || "");
    setCommands(agent.quickCommands ?? []);
  }, [agent]);

  const commandsDirty =
    JSON.stringify(commands) !== JSON.stringify(agent?.quickCommands ?? []);
  const dirty =
    !agent ||
    name !== agent.name ||
    description !== (agent.description || "") ||
    runtime !== agent.runtime ||
    model !== (agent.model || "") ||
    commandsDirty;

  const c = agentColor || "var(--accent)";

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await ipc.agents.update(agentId, {
        name: name.trim(),
        description: description.trim(),
        runtime,
        model: model.trim() || undefined,
        quickCommands: commands,
      });
      toast({ title: "Settings saved", variant: "success" });
      onAgentUpdated?.();
    } catch (err) {
      toast({
        title: "Failed to save",
        description: (err as Error).message,
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddCommand = () => {
    if (!cmdName.trim() || !cmdPrompt.trim()) return;
    if (commands.length >= 30) return;
    const cmd: QuickCommand = {
      id: crypto.randomUUID(),
      name: cmdName.trim().slice(0, 50),
      prompt: cmdPrompt.trim().slice(0, 2000),
    };
    setCommands([...commands, cmd]);
    setCmdName("");
    setCmdPrompt("");
    setAddingNew(false);
  };

  const handleUpdateCommand = (id: string) => {
    if (!cmdName.trim() || !cmdPrompt.trim()) return;
    setCommands(
      commands.map((cmd) =>
        cmd.id === id
          ? {
              ...cmd,
              name: cmdName.trim().slice(0, 50),
              prompt: cmdPrompt.trim().slice(0, 2000),
            }
          : cmd
      )
    );
    setCmdName("");
    setCmdPrompt("");
    setEditingId(null);
  };

  const handleDeleteCommand = (id: string) => {
    setCommands(commands.filter((cmd) => cmd.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setCmdName("");
      setCmdPrompt("");
    }
  };

  const handleMoveCommand = (id: string, direction: "up" | "down") => {
    const idx = commands.findIndex((cmd) => cmd.id === id);
    if (idx === -1) return;
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= commands.length) return;
    const next = [...commands];
    const a = next[idx];
    const b = next[target];
    if (!a || !b) return;
    next[idx] = b;
    next[target] = a;
    setCommands(next);
  };

  const startEditing = (cmd: QuickCommand) => {
    setEditingId(cmd.id);
    setCmdName(cmd.name);
    setCmdPrompt(cmd.prompt);
    setAddingNew(false);
  };

  const startAdding = () => {
    setAddingNew(true);
    setEditingId(null);
    setCmdName("");
    setCmdPrompt("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAddingNew(false);
    setCmdName("");
    setCmdPrompt("");
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Breadcrumb title={`${agentName} / Settings`} onBack={onBack} />

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-3">
        <div className="flex items-center justify-between">
          <div className="text-fg-1 text-sm font-medium">Configuration</div>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!dirty || !name.trim() || saving}
            style={
              dirty
                ? { background: c, color: "#fff" }
                : {
                    background: `color-mix(in srgb, ${c} 12%, var(--bg-0))`,
                    color: c,
                  }
            }
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-fg-2 mb-1 block text-xs font-medium">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-bg-1 text-fg-1 placeholder:text-fg-4 focus:bg-bg-0 h-9 w-full rounded-full border-none px-4 text-sm transition-colors duration-[120ms] outline-none focus:shadow-[var(--shadow-focus)]"
              placeholder="Agent name"
            />
          </div>

          <div>
            <label className="text-fg-2 mb-1 block text-xs font-medium">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-bg-1 text-fg-1 placeholder:text-fg-4 focus:bg-bg-0 h-9 w-full rounded-full border-none px-4 text-sm transition-colors duration-[120ms] outline-none focus:shadow-[var(--shadow-focus)]"
              placeholder="What this agent does"
            />
          </div>

          <div>
            <label className="text-fg-2 mb-1 block text-xs font-medium">
              Runtime
            </label>
            <Select
              value={runtime}
              options={
                runtimes.length > 0
                  ? runtimes.map((r) => ({
                      value: r.name,
                      label: r.available ? r.name : `${r.name} (not installed)`,
                    }))
                  : [{ value: runtime, label: runtime }]
              }
              onChange={setRuntime}
            />
          </div>

          <div>
            <label className="text-fg-2 mb-1 block text-xs font-medium">
              Model
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-bg-1 text-fg-1 placeholder:text-fg-4 focus:bg-bg-0 h-9 w-full rounded-full border-none px-4 text-sm transition-colors duration-[120ms] outline-none focus:shadow-[var(--shadow-focus)]"
              placeholder="Default model (optional)"
            />
            <p className="text-fg-3 mt-1 text-[10px]">
              Leave empty to use the runtime default
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-fg-1 text-sm font-medium">Quick Commands</div>
            {!addingNew && commands.length < 30 && (
              <button
                onClick={startAdding}
                className="text-fg-3 hover:text-fg-1 flex cursor-pointer items-center gap-1 rounded-full border-none bg-transparent text-xs font-medium transition-colors duration-[120ms]"
              >
                <Plus size={14} />
                Add
              </button>
            )}
          </div>

          {commands.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {commands.map((cmd, idx) => (
                <div key={cmd.id}>
                  {editingId === cmd.id ? (
                    <div className="bg-bg-1 flex flex-col gap-2 rounded-2xl p-3">
                      <input
                        type="text"
                        value={cmdName}
                        onChange={(e) => setCmdName(e.target.value)}
                        maxLength={50}
                        className="bg-bg-0 text-fg-1 placeholder:text-fg-4 h-8 w-full rounded-full border-none px-3 text-xs outline-none"
                        placeholder="Command name"
                        autoFocus
                      />
                      <textarea
                        value={cmdPrompt}
                        onChange={(e) => setCmdPrompt(e.target.value)}
                        maxLength={2000}
                        rows={3}
                        className="bg-bg-0 text-fg-1 placeholder:text-fg-4 w-full resize-none rounded-xl border-none p-3 text-xs outline-none"
                        placeholder="Prompt to send"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateCommand(cmd.id)}
                          disabled={!cmdName.trim() || !cmdPrompt.trim()}
                          className="h-7 cursor-pointer rounded-full border-none px-3 text-[10px] font-medium text-white disabled:cursor-default disabled:opacity-40"
                          style={{ background: c }}
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-fg-2 hover:text-fg-1 h-7 cursor-pointer rounded-full border-none bg-transparent px-3 text-[10px] font-medium transition-colors duration-[120ms]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => startEditing(cmd)}
                      className="bg-bg-1 group flex cursor-pointer items-center gap-2 rounded-2xl px-3 py-2.5 transition-colors duration-[120ms]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-fg-1 truncate text-sm font-medium">
                          {cmd.name}
                        </div>
                        <div className="text-fg-3 mt-0.5 truncate text-[10px]">
                          {cmd.prompt}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveCommand(cmd.id, "up");
                          }}
                          disabled={idx === 0}
                          className="text-fg-3 hover:text-fg-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-none bg-transparent transition-colors disabled:cursor-default disabled:opacity-30"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveCommand(cmd.id, "down");
                          }}
                          disabled={idx === commands.length - 1}
                          className="text-fg-3 hover:text-fg-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-none bg-transparent transition-colors disabled:cursor-default disabled:opacity-30"
                        >
                          <ChevronDown size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCommand(cmd.id);
                          }}
                          className="text-error flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-none bg-transparent transition-colors"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {addingNew && (
            <div className="bg-bg-1 flex flex-col gap-2 rounded-2xl p-3">
              <input
                type="text"
                value={cmdName}
                onChange={(e) => setCmdName(e.target.value)}
                maxLength={50}
                className="bg-bg-0 text-fg-1 placeholder:text-fg-4 h-8 w-full rounded-full border-none px-3 text-xs outline-none"
                placeholder="Command name"
                autoFocus
              />
              <textarea
                value={cmdPrompt}
                onChange={(e) => setCmdPrompt(e.target.value)}
                maxLength={2000}
                rows={3}
                className="bg-bg-0 text-fg-1 placeholder:text-fg-4 w-full resize-none rounded-xl border-none p-3 text-xs outline-none"
                placeholder="Prompt to send"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddCommand}
                  disabled={!cmdName.trim() || !cmdPrompt.trim()}
                  className="h-7 cursor-pointer rounded-full border-none px-3 text-[10px] font-medium text-white disabled:cursor-default disabled:opacity-40"
                  style={{ background: c }}
                >
                  Add
                </button>
                <button
                  onClick={cancelEdit}
                  className="text-fg-2 hover:text-fg-1 h-7 cursor-pointer rounded-full border-none bg-transparent px-3 text-[10px] font-medium transition-colors duration-[120ms]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {commands.length === 0 && !addingNew && (
            <div className="text-fg-3 py-3 text-center text-xs">
              No quick commands yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
