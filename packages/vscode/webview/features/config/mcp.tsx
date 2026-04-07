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
import { Button, Empty, useIpcQuery, useToast } from "@tomomo/ui";
import { ipc } from "../../lib/ipc";

interface McpProps {
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
function deriveServerName(command: string): string {
  const parts = command.trim().split(/\s+/);
  let pkg = "";
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]!;
    if (!part.startsWith("-")) {
      pkg = part;
      break;
    }
  }
  if (!pkg) return "";
  if (pkg.includes("/")) {
    pkg = pkg.split("/").pop()!;
  }
  pkg = pkg.replace(/\.[^.]+$/, "");
  return pkg;
}

export function Mcp({ agentId, agentColor }: McpProps) {
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
      const parts = addCommand.trim().split(/\s+/);
      const command = parts[0]!;
      const args = parts.slice(1);
      await ipc.mcp.add(agentId, name, {
        command,
        args,
        env: Object.keys(env).length > 0 ? env : undefined,
      });
      toast({ title: `MCP server "${name}" added`, variant: "success" });
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
      const defaults: Record<string, string> = {};
      for (const key of server.envKeys) defaults[key] = "";
      setEditEnvValues(defaults);
    }
  };

  const handleSaveEnv = async (serverName: string) => {
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
    return agentColor || "var(--fg-3)";
  };

  const getStatusLabel = (status: "ready" | "missing") => {
    if (status === "missing") return "Missing credentials";
    return "Ready";
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
        <div className="flex items-center justify-between">
          <div className="text-fg-1 text-sm font-medium">MCP servers</div>
          <Button size="sm" onClick={() => setAddOpen(true)} style={tintBg}>
            <Plus size={14} />
            Add
          </Button>
        </div>

        {hasMissing && (
          <div className="bg-bg-1 flex items-center gap-2 rounded-xl px-3 py-2.5">
            <AlertCircle size={14} className="text-error shrink-0" />
            <span className="text-fg-2 text-xs">
              One or more servers have missing credentials.
            </span>
          </div>
        )}

        {addOpen && (
          <div className="bg-bg-1 flex flex-col gap-3 rounded-2xl p-3">
            <div className="text-fg-1 text-xs font-medium">Add MCP server</div>
            <div className="flex flex-col gap-1.5">
              <input
                type="text"
                value={addCommand}
                onChange={(e) => setAddCommand(e.target.value)}
                className="bg-bg-0 text-fg-1 placeholder:text-fg-4 h-9 w-full rounded-full border-none px-3 text-xs outline-none focus:shadow-[var(--shadow-focus)]"
                placeholder="npx -y @modelcontextprotocol/server-github"
                autoFocus
              />
              {addCommand.trim() && deriveServerName(addCommand) && (
                <span className="text-fg-3 px-1 text-[10px]">
                  Name: {deriveServerName(addCommand)}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-fg-2 text-xs font-medium">
                  Env variables
                </span>
                <button
                  onClick={handleAddEnvPair}
                  className="text-fg-3 hover:text-fg-1 flex cursor-pointer items-center gap-1 border-none bg-transparent text-[10px] transition-colors duration-[120ms]"
                  style={{ color: agentColor || undefined }}
                >
                  <Plus size={10} />
                  Add
                </button>
              </div>
              {addEnvPairs.map((pair, i) => (
                <div key={i} className="flex gap-1.5">
                  <input
                    type="text"
                    value={pair.key}
                    onChange={(e) =>
                      handleEnvPairChange(i, "key", e.target.value)
                    }
                    className="bg-bg-0 text-fg-1 placeholder:text-fg-4 h-8 min-w-0 flex-1 rounded-full border-none px-3 text-xs outline-none focus:shadow-[var(--shadow-focus)]"
                    placeholder="KEY"
                  />
                  <input
                    type="password"
                    value={pair.value}
                    onChange={(e) =>
                      handleEnvPairChange(i, "value", e.target.value)
                    }
                    className="bg-bg-0 text-fg-1 placeholder:text-fg-4 h-8 min-w-0 flex-1 rounded-full border-none px-3 text-xs outline-none focus:shadow-[var(--shadow-focus)]"
                    placeholder="value"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAddOpen(false);
                  setAddCommand("");
                  setAddEnvPairs([{ key: "", value: "" }]);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {servers && servers.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {servers.map((server) => (
              <div key={server.name} className="flex flex-col">
                <div className="hover:bg-bg-1 flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors duration-[120ms]">
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
                    <div className="text-fg-3 truncate text-[10px]">
                      {server.command}
                      {server.args && server.args.length > 0
                        ? " " + server.args.join(" ")
                        : ""}
                    </div>
                  </button>
                  <span
                    className="shrink-0 text-[10px]"
                    style={{ color: getServerColor(server.status) }}
                  >
                    {getStatusLabel(server.status)}
                  </span>
                  <button
                    onClick={() => setRemoveTarget(server)}
                    className="text-fg-4 hover:text-error flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent transition-colors duration-[120ms]"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {expandedServer === server.name &&
                  server.envKeys.length > 0 && (
                    <div className="bg-bg-1 mx-2 mb-1 flex flex-col gap-2 rounded-xl px-3 py-2.5">
                      <div className="text-fg-3 text-xs font-medium">
                        Update credentials
                      </div>
                      {server.envKeys.map((key) => (
                        <div key={key} className="flex flex-col gap-1">
                          <span className="text-fg-3 font-mono text-[10px]">
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
                            className="bg-bg-0 text-fg-1 placeholder:text-fg-4 h-8 w-full rounded-full border-none px-3 text-xs outline-none focus:shadow-[var(--shadow-focus)]"
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

        {removeTarget && (
          <div className="bg-bg-1 flex flex-col gap-3 rounded-2xl p-3">
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
