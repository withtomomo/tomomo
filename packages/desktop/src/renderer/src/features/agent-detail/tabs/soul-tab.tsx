import React, { useState, useEffect } from "react";
import { Button, Empty, useIpcQuery, useToast } from "@tomomo/ui";
import { Sparkles, PenLine } from "lucide-react";
import { ipc } from "../../../lib/ipc";

interface SoulTabProps {
  agentId: string;
  agentColor?: string;
}

export function SoulTab({ agentId, agentColor }: SoulTabProps) {
  const { toast } = useToast();
  const { data: soulContent, loading } = useIpcQuery<string | null>(
    () => ipc.agents.soulRead(agentId),
    [agentId]
  );
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setContent(soulContent ?? "");
    setDirty(false);
    setEditing(false);
  }, [soulContent, agentId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await ipc.agents.soulWrite(agentId, content);
      setDirty(false);
      toast({ title: "Personality saved", variant: "success" });
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

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-fg-2 text-sm">Loading...</p>
      </div>
    );
  }

  const isEmpty = !content.trim() || content.trim().length < 20;
  const showEmpty = isEmpty && !dirty && !editing;

  if (showEmpty) {
    return (
      <Empty
        icon={<Sparkles size={28} />}
        color={agentColor}
        title="No personality yet"
        description="The personality defines how the agent thinks, works, and communicates. Write one to shape who the agent is."
        action={
          <Button
            size="sm"
            style={
              agentColor ? { background: agentColor, color: "#fff" } : undefined
            }
            variant={agentColor ? undefined : "accent"}
            onClick={() => setEditing(true)}
          >
            <PenLine size={14} />
            Write personality
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-fg-1 text-sm font-medium">Personality</div>
          <div className="text-fg-2 mt-0.5 text-xs">
            Define who this agent is, how they think, and how they communicate
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!dirty || saving}
          style={
            agentColor
              ? dirty
                ? { background: agentColor, color: "#fff" }
                : {
                    background: `color-mix(in srgb, ${agentColor} 12%, var(--bg-0))`,
                    color: agentColor,
                  }
              : undefined
          }
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setDirty(true);
        }}
        className="bg-bg-1 text-fg-1 placeholder:text-fg-4 w-full flex-1 resize-none rounded-2xl border-none p-4 font-mono text-xs leading-[1.8] outline-none"
        placeholder="Write the agent's personality..."
        spellCheck={false}
        autoFocus={editing}
      />
    </div>
  );
}
