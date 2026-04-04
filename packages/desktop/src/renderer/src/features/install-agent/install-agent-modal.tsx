import React, { useState } from "react";
import { Modal, Button, Input, useToast } from "@tomomo/ui";
import { ipc } from "../../lib/ipc";
import { Download } from "lucide-react";

interface InstallAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstalled: () => void;
}

export function InstallAgentModal({
  open,
  onOpenChange,
  onInstalled,
}: InstallAgentModalProps) {
  const { toast } = useToast();
  const [source, setSource] = useState("");
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    if (!source.trim()) return;
    setInstalling(true);
    try {
      const agent = await ipc.agents.install(source.trim());
      toast({ title: `Agent "${agent.name}" installed`, variant: "success" });
      setSource("");
      onOpenChange(false);
      onInstalled();
    } catch (err) {
      toast({
        title: "Install failed",
        description: (err as Error).message,
        variant: "error",
      });
    } finally {
      setInstalling(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) setSource("");
        onOpenChange(o);
      }}
      title="Install agent"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={handleInstall}
            disabled={!source.trim() || installing}
          >
            <Download size={14} />
            Install
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-fg-2 mb-1.5 block text-xs font-medium">
            GitHub source
          </label>
          <Input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="owner/repo or owner/repo/path"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && source.trim() && !installing)
                handleInstall();
            }}
          />
        </div>
        <p className="text-fg-4 text-xs">
          Install any agent from GitHub. The repo or subfolder must contain
          agent.json and soul.md.
        </p>
      </div>
    </Modal>
  );
}
