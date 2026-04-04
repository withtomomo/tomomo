import React, { useState, useEffect } from "react";
import { ChevronUp, ChevronDown, Trash2, Plus } from "lucide-react";
import { Button, Select, useToast } from "@tomomo/ui";
import { ipc } from "../../../lib/ipc";
import { useRuntimes } from "../../../hooks/use-runtimes";
import type { AgentConfig, QuickCommand } from "@tomomo/core";

interface SettingsTabProps {
  agent: AgentConfig;
  agentColor?: string;
  onSaved: () => void;
}

export function SettingsTab({ agent, agentColor, onSaved }: SettingsTabProps) {
  const { runtimes } = useRuntimes();
  const { toast } = useToast();
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description || "");
  const [runtime, setRuntime] = useState(agent.runtime);
  const [model, setModel] = useState(agent.model || "");
  const [saving, setSaving] = useState(false);
  const [commands, setCommands] = useState<QuickCommand[]>(
    agent.quickCommands ?? []
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [cmdName, setCmdName] = useState("");
  const [cmdPrompt, setCmdPrompt] = useState("");

  useEffect(() => {
    setName(agent.name);
    setDescription(agent.description || "");
    setRuntime(agent.runtime);
    setModel(agent.model || "");
    setCommands(agent.quickCommands ?? []);
  }, [agent.id, agent.name, agent.description, agent.runtime, agent.model]);

  const commandsDirty =
    JSON.stringify(commands) !== JSON.stringify(agent.quickCommands ?? []);
  const dirty =
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
      await ipc.agents.update(agent.id, {
        name: name.trim(),
        description: description.trim(),
        runtime,
        model: model.trim() || undefined,
        quickCommands: commands,
      });
      toast({ title: "Settings saved", variant: "success" });
      onSaved();
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
      commands.map((c) =>
        c.id === id
          ? {
              ...c,
              name: cmdName.trim().slice(0, 50),
              prompt: cmdPrompt.trim().slice(0, 2000),
            }
          : c
      )
    );
    setCmdName("");
    setCmdPrompt("");
    setEditingId(null);
  };

  const handleDeleteCommand = (id: string) => {
    setCommands(commands.filter((c) => c.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setCmdName("");
      setCmdPrompt("");
    }
  };

  const handleMoveCommand = (id: string, direction: "up" | "down") => {
    const idx = commands.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= commands.length) return;
    const next = [...commands];
    const a = next[idx]!;
    const b = next[target]!;
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
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-fg-1 text-sm font-medium">Configuration</div>
          <div className="text-fg-2 mt-0.5 text-xs">
            Agent name, runtime, and model preferences
          </div>
        </div>
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

      {/* Fields, flat on the canvas */}
      <div className="flex flex-col gap-5">
        <div>
          <label className="text-fg-2 mb-1.5 block text-xs font-medium">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-bg-2 text-fg-1 placeholder:text-fg-4 focus:bg-bg-0 h-10 w-full rounded-full border-none px-5 text-sm transition-colors duration-[120ms] outline-none focus:shadow-[var(--shadow-focus)]"
            placeholder="Agent name"
          />
        </div>

        <div>
          <label className="text-fg-2 mb-1.5 block text-xs font-medium">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-bg-2 text-fg-1 placeholder:text-fg-4 focus:bg-bg-0 h-10 w-full rounded-full border-none px-5 text-sm transition-colors duration-[120ms] outline-none focus:shadow-[var(--shadow-focus)]"
            placeholder="What this agent does"
          />
        </div>

        <div>
          <label className="text-fg-2 mb-1.5 block text-xs font-medium">
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
          <label className="text-fg-2 mb-1.5 block text-xs font-medium">
            Model
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-bg-2 text-fg-1 placeholder:text-fg-4 focus:bg-bg-0 h-10 w-full rounded-full border-none px-5 text-sm transition-colors duration-[120ms] outline-none focus:shadow-[var(--shadow-focus)]"
            placeholder="Default model (optional)"
          />
          <p className="text-fg-2 mt-1.5 text-xs">
            Leave empty to use the runtime default
          </p>
        </div>
      </div>

      {/* Quick Commands */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-fg-1 text-sm font-medium">Quick Commands</div>
            <div className="text-fg-2 mt-0.5 text-xs">
              Saved prompts you can fire from the hub
            </div>
          </div>
          {!addingNew && commands.length < 30 && (
            <button
              onClick={startAdding}
              className="text-fg-3 hover:text-fg-1 flex cursor-pointer items-center gap-1.5 rounded-full border-none bg-transparent text-xs font-medium transition-colors duration-[120ms]"
            >
              <Plus size={14} />
              Add
            </button>
          )}
        </div>

        {/* Command list */}
        {commands.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {commands.map((cmd, idx) => (
              <div key={cmd.id}>
                {editingId === cmd.id ? (
                  <div className="bg-bg-2 flex flex-col gap-3 rounded-2xl p-4">
                    <input
                      type="text"
                      value={cmdName}
                      onChange={(e) => setCmdName(e.target.value)}
                      maxLength={50}
                      className="bg-bg-0 text-fg-1 placeholder:text-fg-4 h-9 w-full rounded-full border-none px-4 text-sm outline-none"
                      placeholder="Command name"
                      autoFocus
                    />
                    <textarea
                      value={cmdPrompt}
                      onChange={(e) => setCmdPrompt(e.target.value)}
                      maxLength={2000}
                      rows={3}
                      className="bg-bg-0 text-fg-1 placeholder:text-fg-4 w-full resize-none rounded-2xl border-none p-4 text-sm outline-none"
                      placeholder="Prompt to send"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateCommand(cmd.id)}
                        disabled={!cmdName.trim() || !cmdPrompt.trim()}
                        className="h-8 cursor-pointer rounded-full border-none px-4 text-xs font-medium text-white disabled:cursor-default disabled:opacity-40"
                        style={{ background: c }}
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-fg-2 hover:text-fg-1 h-8 cursor-pointer rounded-full border-none bg-transparent px-4 text-xs font-medium transition-colors duration-[120ms]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => startEditing(cmd)}
                    className="bg-bg-2 hover:bg-bg-2/80 group flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 transition-colors duration-[120ms]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-fg-1 truncate text-sm font-medium">
                        {cmd.name}
                      </div>
                      <div className="text-fg-3 mt-0.5 truncate text-xs">
                        {cmd.prompt}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveCommand(cmd.id, "up");
                        }}
                        disabled={idx === 0}
                        className="text-fg-3 hover:text-fg-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-none bg-transparent transition-colors disabled:cursor-default disabled:opacity-30"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveCommand(cmd.id, "down");
                        }}
                        disabled={idx === commands.length - 1}
                        className="text-fg-3 hover:text-fg-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-none bg-transparent transition-colors disabled:cursor-default disabled:opacity-30"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCommand(cmd.id);
                        }}
                        className="text-error hover:text-error flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-none bg-transparent transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add new form */}
        {addingNew && (
          <div className="bg-bg-2 flex flex-col gap-3 rounded-2xl p-4">
            <input
              type="text"
              value={cmdName}
              onChange={(e) => setCmdName(e.target.value)}
              maxLength={50}
              className="bg-bg-0 text-fg-1 placeholder:text-fg-4 h-9 w-full rounded-full border-none px-4 text-sm outline-none"
              placeholder="Command name"
              autoFocus
            />
            <textarea
              value={cmdPrompt}
              onChange={(e) => setCmdPrompt(e.target.value)}
              maxLength={2000}
              rows={3}
              className="bg-bg-0 text-fg-1 placeholder:text-fg-4 w-full resize-none rounded-2xl border-none p-4 text-sm outline-none"
              placeholder="Prompt to send"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddCommand}
                disabled={!cmdName.trim() || !cmdPrompt.trim()}
                className="h-8 cursor-pointer rounded-full border-none px-4 text-xs font-medium text-white disabled:cursor-default disabled:opacity-40"
                style={{ background: c }}
              >
                Add
              </button>
              <button
                onClick={cancelEdit}
                className="text-fg-2 hover:text-fg-1 h-8 cursor-pointer rounded-full border-none bg-transparent px-4 text-xs font-medium transition-colors duration-[120ms]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {commands.length === 0 && !addingNew && (
          <div className="text-fg-3 py-4 text-center text-xs">
            No quick commands yet
          </div>
        )}
      </div>
    </div>
  );
}
