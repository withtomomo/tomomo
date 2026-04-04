import React, { useState } from "react";
import { Download } from "lucide-react";
import { Button, useToast } from "@tomomo/ui";
import { ipc } from "../lib/ipc";
import { Breadcrumb } from "./breadcrumb";

interface InstallAgentProps {
  onBack: () => void;
  onInstalled: () => void;
}

export function InstallAgent({ onBack, onInstalled }: InstallAgentProps) {
  const { toast } = useToast();
  const [source, setSource] = useState("");
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    if (!source.trim()) return;
    setInstalling(true);
    try {
      const agent = (await ipc.agents.install(source.trim())) as {
        name: string;
      };
      toast({ title: `Agent "${agent.name}" installed`, variant: "success" });
      setSource("");
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
    <div className="flex h-full flex-col overflow-hidden">
      <Breadcrumb title="Install agent" onBack={onBack} />

      {/* Content */}
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <label className="text-fg-2 mb-1 block text-xs font-medium">
            GitHub source
          </label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && source.trim() && !installing)
                handleInstall();
            }}
            className="bg-bg-1 text-fg-1 placeholder:text-fg-4 focus:bg-bg-0 h-9 w-full rounded-full border-none px-4 text-sm transition-colors duration-[120ms] outline-none focus:shadow-[var(--shadow-focus)]"
            placeholder="owner/repo or owner/repo/path"
            autoFocus
          />
        </div>
        <p className="text-fg-4 text-xs">
          Install any agent from GitHub. The repo or subfolder must contain
          agent.json and soul.md.
        </p>
        <Button
          variant="accent"
          className="w-full"
          onClick={handleInstall}
          disabled={!source.trim() || installing}
        >
          <Download size={14} />
          {installing ? "Installing..." : "Install"}
        </Button>
      </div>
    </div>
  );
}
