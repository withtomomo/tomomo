import React, { useState, useRef, useEffect } from "react";
import {
  TerminalView,
  CharacterSprite,
  Modal,
  Button,
  DropdownMenu,
  DropdownItem,
} from "@tomomo/ui";
import type { TerminalSession } from "@tomomo/ui";
import {
  GripVertical,
  MoreVertical,
  Copy,
  Trash2,
  SquareSlash,
  ShieldOff,
} from "lucide-react";
import { ipc } from "../../lib/ipc";
import type { QuickCommand } from "@tomomo/core";

// Terminal card with three-dot menu and drag-and-drop
export function TerminalCard({
  session,
  index,
  totalCount,
  onClose,
  onDuplicate,
  onReorder,
  dragSourceRef,
}: {
  session: TerminalSession;
  index: number;
  totalCount: number;
  onClose: () => void;
  onDuplicate: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  dragSourceRef: React.MutableRefObject<number | null>;
}) {
  const [confirmClose, setConfirmClose] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const [quickCommands, setQuickCommands] = useState<QuickCommand[]>([]);

  // Loaded once per mount. Edits in settings reflect on next card mount.
  useEffect(() => {
    ipc.agents
      .load(session.agentId)
      .then((agent) => {
        if (agent?.quickCommands) setQuickCommands(agent.quickCommands);
      })
      .catch(() => {});
  }, [session.agentId]);

  const projectName =
    session.projectDir.split(/[/\\]/).pop() || session.projectDir;

  useEffect(() => {
    return () => {
      if (dragSourceRef.current === index) {
        dragSourceRef.current = null;
      }
    };
  }, [index, dragSourceRef]);

  const handleDragStart = (e: React.DragEvent) => {
    dragSourceRef.current = index;
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (dragSourceRef.current !== null && dragSourceRef.current !== index) {
      setDragOver(true);
    }
  };

  const handleDragLeave = () => {
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setDragOver(false);
    if (dragSourceRef.current !== null && dragSourceRef.current !== index) {
      onReorder(dragSourceRef.current, index);
    }
    dragSourceRef.current = null;
  };

  const handleDragEnd = () => {
    dragCounterRef.current = 0;
    setDragOver(false);
    setIsDragging(false);
    dragSourceRef.current = null;
  };

  const canDrag = totalCount > 1;

  return (
    <div
      className={`ease flex h-full w-full flex-col overflow-hidden rounded-[18px] transition-opacity duration-[120ms] ${
        isDragging ? "opacity-50" : ""
      } ${dragOver ? "bg-accent/10" : ""}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div
        className="flex h-11 shrink-0 items-center gap-2.5 rounded-t-[18px] px-3"
        style={{
          background: `color-mix(in srgb, ${session.agentColor} 15%, var(--bg-0))`,
        }}
        draggable={canDrag}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {canDrag && (
          <GripVertical
            size={14}
            className="text-fg-4 shrink-0 cursor-grab active:cursor-grabbing"
          />
        )}
        {session.character && (
          <CharacterSprite
            grid={session.character.grid}
            color={session.character.color}
            size={session.character.size}
            displaySize={28}
            className="rounded-[10px]"
            animate
          />
        )}
        <span
          className="truncate text-sm font-semibold"
          style={{ color: session.agentColor }}
        >
          {session.agentName}
        </span>
        <span className="bg-bg-2 text-fg-2 shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium">
          {projectName}
        </span>
        {session.skipPermissions && (
          <span
            className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium"
            style={{
              background: "color-mix(in srgb, var(--warning) 15%, var(--bg-0))",
              color: "var(--warning)",
            }}
          >
            <ShieldOff size={10} />
            Unrestricted
          </span>
        )}
        <div className="flex-1" />
        {quickCommands.length > 0 && (
          <DropdownMenu
            trigger={
              <button className="text-fg-3 hover:text-fg-1 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent transition-colors duration-[120ms]">
                <SquareSlash size={14} />
              </button>
            }
          >
            {quickCommands.map((cmd) => (
              <DropdownItem
                key={cmd.id}
                onSelect={() => {
                  ipc.terminal.write(session.sessionId, cmd.prompt + "\n");
                }}
              >
                {cmd.name}
              </DropdownItem>
            ))}
          </DropdownMenu>
        )}
        <DropdownMenu
          trigger={
            <button className="text-fg-3 hover:text-fg-1 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent transition-colors duration-[120ms]">
              <MoreVertical size={14} />
            </button>
          }
        >
          <DropdownItem icon={<Copy size={14} />} onSelect={onDuplicate}>
            Duplicate
          </DropdownItem>
          <DropdownItem
            icon={<Trash2 size={14} />}
            danger
            onSelect={() => setConfirmClose(true)}
          >
            Remove
          </DropdownItem>
        </DropdownMenu>
      </div>

      {/* Terminal body */}
      <div className="flex-1 overflow-hidden">
        <TerminalView sessionId={session.sessionId} />
      </div>

      {/* Close confirmation */}
      <Modal
        open={confirmClose}
        onOpenChange={(open) => {
          if (!open) setConfirmClose(false);
        }}
        title="Remove session"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmClose(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmClose(false);
                onClose();
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="text-fg-2 text-sm">
          Remove <strong className="text-fg-1">{session.agentName}</strong> on{" "}
          <strong className="text-fg-1">{projectName}</strong>? The session will
          be terminated.
        </p>
      </Modal>
    </div>
  );
}
