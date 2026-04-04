import React, { useState } from "react";
import {
  Trash2,
  Plus,
  Server,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Save,
} from "lucide-react";
import { Button, Empty, Modal, useIpcQuery, useToast } from "@tomomo/ui";
import { ipc } from "../../../lib/ipc";

interface McpTabProps {
  agentId: string;
  agentColor?: string;
}

interface McpServerInfo {
  name: string;
  command: string;
  args: string[];
  envKeys: string[];
  status: "ready" | "missing";
  missingVars: string[];
}

interface EnvPair {
  key: string;
  value: string;
}

// Derive a server name from the command string
// "npx -y @modelcontextprotocol/server-github" → "server-github"
// "npx -y mcp-server-linear" → "mcp-server-linear"
// "node my-server.js" → "my-server"
function deriveServerName(command: string): string {
  const parts = command.trim().split(/\s+/);
  // Find the last part that looks like a package name (skip flags like -y)
  let pkg = "";
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]!;
    if (!part.startsWith("-")) {
      pkg = part;
      break;
    }
  }
  if (!pkg) return "";
  // Handle scoped packages: @org/server-name → server-name
  if (pkg.includes("/")) {
    pkg = pkg.split("/").pop()!;
  }
  // Remove file extensions: my-server.js → my-server
  pkg = pkg.replace(/\.[^.]+$/, "");
  return pkg;
}

export function McpTab({ agentId, agentColor }: McpTabProps) {
  const { toast } = useToast();
  const { data: servers, refetch } = useIpcQuery<McpServerInfo[]>(
    () => ipc.mcp.list(agentId),
    [agentId]
  );
  const [addOpen, setAddOpen] = useState(false);
  const [addCommand, setAddCommand] = useState("");
  const [addEnvPairs, setAddEnvPairs] = useState<EnvPair[]>([
    { key: "", value: "" },
  ]);
  const [adding, setAdding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<McpServerInfo | null>(null);
  const [expandedServer, setExpandedServer] = useState<string | null>(null);
  const [editEnvValues, setEditEnvValues] = useState<Record<string, string>>(
    {}
  );
  const [saving, setSaving] = useState(false);

  const hasMissing = servers?.some((s) => s.status === "missing") ?? false;

  const handleAdd = async () => {
    if (!addCommand.trim()) return;
    const name = deriveServerName(addCommand);
    if (!name) return;
    setAdding(true);
    try {
      const env: Record<string, string> = {};
      for (const pair of addEnvPairs) {
        if (pair.key.trim()) {
          env[pair.key.trim()] = pair.value;
        }
      }
      // Split "npx -y @org/server" into command + args
      const parts = addCommand.trim().split(/\s+/);
      const command = parts[0]!;
      const args = parts.slice(1);
      await ipc.mcp.add(agentId, name, {
        command,
        args,
        env: Object.keys(env).length > 0 ? env : undefined,
      });
      toast({
        title: `MCP server "${name}" added`,
        variant: "success",
      });
      setAddOpen(false);
      setAddCommand("");
      setAddEnvPairs([{ key: "", value: "" }]);
      refetch();
    } catch (err) {
      toast({
        title: "Failed to add MCP server",
        description: (err as Error).message,
        variant: "error",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    try {
      await ipc.mcp.remove(agentId, removeTarget.name);
      toast({
        title: `MCP server "${removeTarget.name}" removed`,
        variant: "success",
      });
      setRemoveTarget(null);
      refetch();
    } catch (err) {
      toast({
        title: "Failed to remove MCP server",
        description: (err as Error).message,
        variant: "error",
      });
    }
  };

  const handleAddEnvPair = () => {
    setAddEnvPairs((prev) => [...prev, { key: "", value: "" }]);
  };

  const handleEnvPairChange = (
    index: number,
    field: "key" | "value",
    val: string
  ) => {
    setAddEnvPairs((prev) =>
      prev.map((pair, i) => (i === index ? { ...pair, [field]: val } : pair))
    );
  };

  const handleToggleExpand = (server: McpServerInfo) => {
    if (expandedServer === server.name) {
      setExpandedServer(null);
      setEditEnvValues({});
    } else {
      setExpandedServer(server.name);
      // Pre-fill with empty strings so the user sees all keys
      const defaults: Record<string, string> = {};
      for (const key of server.envKeys) defaults[key] = "";
      setEditEnvValues(defaults);
    }
  };

  const handleSaveEnv = async (serverName: string) => {
    // Only submit keys that have a non-empty value entered
    const updates: Record<string, string> = {};
    for (const [k, v] of Object.entries(editEnvValues)) {
      if (v.trim()) updates[k] = v;
    }
    if (Object.keys(updates).length === 0) return;
    setSaving(true);
    try {
      await ipc.mcp.updateEnv(agentId, updates);
      toast({
        title: `Credentials updated for "${serverName}"`,
        variant: "success",
      });
      setExpandedServer(null);
      setEditEnvValues({});
      refetch();
    } catch (err) {
      toast({
        title: "Failed to update credentials",
        description: (err as Error).message,
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const tintBg = agentColor
    ? {
        background: `color-mix(in srgb, ${agentColor} 12%, var(--bg-0))`,
        color: agentColor,
      }
    : undefined;

  const getServerColor = (status: "ready" | "missing") => {
    if (status === "missing") return "var(--error)";
    if (status === "ready") return agentColor || "var(--fg-3)";
    return "var(--fg-3)";
  };

  const getStatusLabel = (status: "ready" | "missing") => {
    if (status === "missing") return "Missing credentials";
    if (status === "ready") return "Ready";
    return status;
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-fg-1 text-sm font-medium">MCP servers</div>
          <div className="text-fg-3 mt-0.5 text-xs">
            Services and accounts this agent can use
          </div>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} style={tintBg}>
          <Plus size={14} />
          Add server
        </Button>
      </div>

      {/* Warning banner for missing credentials */}
      {hasMissing && (
        <div className="bg-bg-1 flex items-center gap-2 rounded-xl px-4 py-3">
          <AlertCircle size={14} className="text-error shrink-0" />
          <span className="text-fg-2 text-xs">
            One or more servers have missing credentials. Edit the agent .env to
            add them.
          </span>
        </div>
      )}

      {/* Server list */}
      {servers && servers.length > 0 ? (
        <div className="flex flex-col gap-0.5">
          {servers.map((server) => (
            <div key={server.name} className="flex flex-col">
              <div className="group ease hover:bg-bg-1 flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-[120ms]">
                <button
                  onClick={() => handleToggleExpand(server)}
                  className="text-fg-3 flex shrink-0 cursor-pointer border-none bg-transparent p-0"
                  style={{ color: getServerColor(server.status) }}
                >
                  {expandedServer === server.name ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </button>
                <button
                  onClick={() => handleToggleExpand(server)}
                  className="min-w-0 flex-1 cursor-pointer border-none bg-transparent p-0 text-left"
                >
                  <div className="text-fg-1 text-sm font-medium">
                    {server.name}
                  </div>
                  <div className="text-fg-3 truncate text-xs">
                    {server.command}
                    {server.args && server.args.length > 0
                      ? " " + server.args.join(" ")
                      : ""}
                  </div>
                </button>
                <span
                  className="text-xs"
                  style={{ color: getServerColor(server.status) }}
                >
                  {getStatusLabel(server.status)}
                </span>
                <button
                  onClick={() => setRemoveTarget(server)}
                  className="text-fg-4 hover:text-error ease flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent opacity-0 transition-all duration-[120ms] group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              {expandedServer === server.name && server.envKeys.length > 0 && (
                <div className="bg-bg-1 mx-3 mb-1 flex flex-col gap-2 rounded-xl px-4 py-3">
                  <div className="text-fg-3 text-xs font-medium">
                    Update credentials
                  </div>
                  {server.envKeys.map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-fg-3 w-32 shrink-0 truncate font-mono text-xs">
                        {key}
                      </span>
                      <input
                        type="password"
                        value={editEnvValues[key] ?? ""}
                        onChange={(e) =>
                          setEditEnvValues((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        className="bg-bg-0 text-fg-1 placeholder:text-fg-4 h-8 min-w-0 flex-1 rounded-full border-none px-3 text-sm outline-none focus:shadow-[var(--shadow-focus)]"
                        placeholder="new value"
                      />
                    </div>
                  ))}
                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleSaveEnv(server.name)}
                      disabled={saving}
                      style={
                        agentColor
                          ? { background: agentColor, color: "#fff" }
                          : undefined
                      }
                    >
                      <Save size={12} />
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty
          icon={<Server size={20} />}
          title="No MCP servers"
          description="Add an MCP server to connect services and accounts to this agent."
        />
      )}

      {/* Add server modal */}
      <Modal
        open={addOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAddOpen(false);
            setAddCommand("");
            setAddEnvPairs([{ key: "", value: "" }]);
          }
        }}
        title="Add MCP server"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setAddOpen(false);
                setAddCommand("");
                setAddEnvPairs([{ key: "", value: "" }]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={
                !addCommand.trim() || !deriveServerName(addCommand) || adding
              }
              style={
                addCommand.trim() && agentColor
                  ? { background: agentColor, color: "#fff" }
                  : undefined
              }
            >
              {adding ? "Adding..." : "Add server"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-fg-2 text-xs font-medium">Command</label>
            <input
              type="text"
              value={addCommand}
              onChange={(e) => setAddCommand(e.target.value)}
              className="bg-bg-1 text-fg-1 placeholder:text-fg-4 h-10 w-full rounded-full border-none px-4 text-sm outline-none focus:shadow-[var(--shadow-focus)]"
              placeholder="npx -y @modelcontextprotocol/server-github"
              autoFocus
            />
            {addCommand.trim() && deriveServerName(addCommand) && (
              <span className="text-fg-3 px-1 text-xs">
                Name: {deriveServerName(addCommand)}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-fg-2 text-xs font-medium">
                Environment variables
              </label>
              <button
                onClick={handleAddEnvPair}
                className="text-fg-3 hover:text-fg-1 ease flex cursor-pointer items-center gap-1 border-none bg-transparent text-xs transition-colors duration-[120ms]"
                style={{ color: agentColor || undefined }}
              >
                <Plus size={12} />
                Add variable
              </button>
            </div>
            {addEnvPairs.map((pair, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={pair.key}
                  onChange={(e) =>
                    handleEnvPairChange(i, "key", e.target.value)
                  }
                  className="bg-bg-1 text-fg-1 placeholder:text-fg-4 h-9 min-w-0 flex-1 rounded-full border-none px-3 text-sm outline-none focus:shadow-[var(--shadow-focus)]"
                  placeholder="KEY"
                />
                <input
                  type="password"
                  value={pair.value}
                  onChange={(e) =>
                    handleEnvPairChange(i, "value", e.target.value)
                  }
                  className="bg-bg-1 text-fg-1 placeholder:text-fg-4 h-9 min-w-0 flex-1 rounded-full border-none px-3 text-sm outline-none focus:shadow-[var(--shadow-focus)]"
                  placeholder="value"
                />
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Remove confirmation */}
      <Modal
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title="Remove MCP server"
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
          from this agent? The credentials in .env will remain.
        </p>
      </Modal>
    </div>
  );
}
