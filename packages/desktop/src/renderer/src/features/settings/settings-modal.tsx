import React, { useState } from "react";
import { Modal, Button, useSettings, useTheme, useToast } from "@tomomo/ui";
import { useRuntimes } from "../../hooks/use-runtimes";
import { ipc } from "../../lib/ipc";
import { Minus, Plus, Sun, Moon, ChevronRight, Copy } from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Triggered when the user clicks "Replay intro". The parent is expected to
  // close the modal and open the OnboardingFlow in forceIntro mode.
  onReplayIntro: () => void;
}

// Collapsible section
function Section({
  title,
  description,
  children,
  defaultOpen = true,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-bg-1 rounded-2xl">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-2xl border-none bg-transparent px-4 py-3 text-left transition-colors duration-[120ms]"
      >
        <ChevronRight
          size={14}
          className={`text-fg-4 shrink-0 transition-transform duration-[120ms] ${open ? "rotate-90" : ""}`}
        />
        <div className="flex-1">
          <div className="text-fg-1 text-sm font-medium">{title}</div>
          {description && !open && (
            <div className="text-fg-3 mt-0.5 text-xs">{description}</div>
          )}
        </div>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export function SettingsModal({
  open,
  onOpenChange,
  onReplayIntro,
}: SettingsModalProps) {
  const { settings, updateSettings } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const { runtimes, refetch: refetchRuntimes } = useRuntimes();
  const [adapterPackage, setAdapterPackage] = useState("");
  const [installingAdapter, setInstallingAdapter] = useState(false);
  const [copiedRuntime, setCopiedRuntime] = useState<string | null>(null);

  const handleInstallAdapter = async () => {
    if (!adapterPackage.trim()) return;
    setInstallingAdapter(true);
    try {
      const result = await ipc.runtimes.installAdapter(adapterPackage.trim());
      toast({
        title: `Adapter "${result.name}" installed`,
        variant: "success",
      });
      setAdapterPackage("");
      refetchRuntimes();
    } catch (err) {
      toast({
        title: "Install failed",
        description: (err as Error).message,
        variant: "error",
      });
    } finally {
      setInstallingAdapter(false);
    }
  };

  const handleCopyCommand = (name: string, command: string) => {
    navigator.clipboard.writeText(command);
    setCopiedRuntime(name);
    setTimeout(() => setCopiedRuntime(null), 2000);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Settings">
      <div className="flex flex-col gap-3">
        {/* Appearance */}
        <Section title="Appearance">
          <div className="flex items-center justify-between">
            <span className="text-fg-2 text-xs">Theme</span>
            <button
              onClick={toggleTheme}
              className="bg-bg-2 text-fg-1 hover:bg-bg-3 flex h-8 items-center gap-2 rounded-full border-none px-3 text-xs font-medium transition-colors duration-[120ms]"
            >
              {theme === "dark" ? <Moon size={13} /> : <Sun size={13} />}
              {theme === "dark" ? "Dark" : "Light"}
            </button>
          </div>
        </Section>

        {/* Terminal */}
        <Section title="Terminal">
          <div className="flex items-center justify-between">
            <span className="text-fg-2 text-xs">Font size</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  updateSettings({
                    terminalFontSize: Math.max(
                      9,
                      settings.terminalFontSize - 1
                    ),
                  })
                }
                className="text-fg-2 hover:text-fg-1 hover:bg-bg-2 flex h-7 w-7 items-center justify-center rounded-full border-none bg-transparent transition-colors duration-[120ms]"
              >
                <Minus size={14} />
              </button>
              <span className="text-fg-1 w-8 text-center text-sm font-medium">
                {settings.terminalFontSize}
              </span>
              <button
                onClick={() =>
                  updateSettings({
                    terminalFontSize: Math.min(
                      20,
                      settings.terminalFontSize + 1
                    ),
                  })
                }
                className="text-fg-2 hover:text-fg-1 hover:bg-bg-2 flex h-7 w-7 items-center justify-center rounded-full border-none bg-transparent transition-colors duration-[120ms]"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
          <div
            className="bg-bg-2 text-fg-2 mt-3 rounded-xl p-3 font-mono"
            style={{ fontSize: settings.terminalFontSize }}
          >
            $ tomomo launch ember ~/project
          </div>
        </Section>

        {/* Runtimes */}
        <Section
          title="Runtimes"
          description="AI runtimes that power your agents"
        >
          <div className="flex flex-col gap-1.5">
            {runtimes.map((rt) => (
              <div
                key={rt.name}
                className="bg-bg-2 flex items-center gap-3 rounded-xl px-3 py-2"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    background: rt.available ? "var(--success)" : "var(--fg-4)",
                  }}
                />
                <span className="text-fg-1 min-w-0 truncate text-sm font-medium">
                  {rt.name}
                </span>
                <span className="text-fg-3 shrink-0 text-[10px]">
                  {rt.type}
                </span>
                <span className="flex-1" />
                {rt.available ? (
                  <span className="text-success shrink-0 text-[10px]">
                    installed
                  </span>
                ) : (
                  rt.install.command && (
                    <button
                      onClick={() =>
                        handleCopyCommand(rt.name, rt.install.command)
                      }
                      className="text-fg-3 hover:text-fg-1 flex shrink-0 items-center gap-1 rounded-full border-none bg-transparent text-[10px] transition-colors duration-[120ms]"
                      title={rt.install.command}
                    >
                      <Copy size={10} />
                      {copiedRuntime === rt.name ? "Copied!" : "Copy install"}
                    </button>
                  )
                )}
              </div>
            ))}
            {runtimes.length === 0 && (
              <p className="text-fg-3 py-2 text-center text-xs">
                Loading runtimes...
              </p>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={adapterPackage}
              onChange={(e) => setAdapterPackage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleInstallAdapter();
              }}
              className="bg-bg-2 text-fg-1 placeholder:text-fg-4 focus:bg-bg-0 h-8 flex-1 rounded-full border-none px-4 text-xs outline-none focus:shadow-[var(--shadow-focus)]"
              placeholder="Add community adapter (npm package)..."
            />
            <Button
              size="sm"
              variant="accent"
              onClick={handleInstallAdapter}
              disabled={!adapterPackage.trim() || installingAdapter}
            >
              {installingAdapter ? "Installing..." : "Install"}
            </Button>
          </div>
        </Section>

        {/* Help */}
        <Section title="Help">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-fg-1 text-sm font-medium">Replay intro</div>
              <div className="text-fg-3 mt-0.5 text-xs">
                Watch the welcome tour again
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={onReplayIntro}>
              Replay
            </Button>
          </div>
        </Section>
      </div>
    </Modal>
  );
}
