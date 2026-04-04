import React, { useState, useRef, useEffect } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { Empty, getStoredValue, setStoredValue } from "@tomomo/ui";
import type { TerminalSession } from "@tomomo/ui";
import {
  Terminal,
  Columns2,
  Rows2,
  Columns3,
  Rows3,
  PanelLeft,
  PanelTop,
  LayoutGrid,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TerminalCard } from "./terminal-card";

// Layout presets per session count
const LAYOUTS: Record<number, string[]> = {
  2: ["side-by-side", "stacked"],
  3: ["2-top-1-bottom", "1-left-2-right", "3-columns", "3-rows"],
  4: ["2x2", "1-left-3-right"],
};

const LAYOUT_ICONS: Record<string, LucideIcon> = {
  "side-by-side": Columns2,
  stacked: Rows2,
  "2-top-1-bottom": PanelTop,
  "1-left-2-right": PanelLeft,
  "3-columns": Columns3,
  "3-rows": Rows3,
  "2x2": LayoutGrid,
  "1-left-3-right": PanelLeft,
};

const LAYOUT_LABELS: Record<string, string> = {
  "side-by-side": "Side by side",
  stacked: "Stacked",
  "2-top-1-bottom": "2 top, 1 bottom",
  "1-left-2-right": "1 left, 2 right",
  "3-columns": "3 columns",
  "3-rows": "3 rows",
  "2x2": "2x2 grid",
  "1-left-3-right": "1 left, 3 right",
};

export { LAYOUT_ICONS, LAYOUT_LABELS, LAYOUTS };

export function useLayoutPreset(count: number) {
  const options = LAYOUTS[count];
  const key = `hub-layout-${count}`;

  const [layout, setLayout] = useState<string>(() => {
    if (!options) return "default";
    const stored = getStoredValue<string>(key, options[0]!);
    return options.includes(stored) ? stored : options[0]!;
  });

  useEffect(() => {
    if (!options) return;
    const stored = getStoredValue<string>(key, options[0]!);
    const valid = options.includes(stored) ? stored : options[0]!;
    setLayout(valid);
  }, [count, key, options]);

  const select = (value: string) => {
    if (!options || !options.includes(value)) return;
    setLayout(value);
    setStoredValue(key, value);
  };

  return { layout, select, options: options ?? [] };
}

interface HubProps {
  sessions: TerminalSession[];
  layout: string;
  onClose: (sessionId: string) => void;
  onLaunchProject: (agentId: string, projectDir: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function Hub({
  sessions,
  layout,
  onClose,
  onLaunchProject,
  onReorder,
}: HubProps) {
  if (sessions.length === 0) {
    return (
      <div className="m-3 flex flex-1">
        <Empty
          icon={<Terminal size={28} />}
          title="No active sessions"
          description="Launch an agent to see it here. Use the + button above to get started."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-3">
      {/* Resizable terminal grid */}
      <div className="flex-1 overflow-hidden">
        <TerminalGrid
          sessions={sessions}
          layout={layout}
          onClose={onClose}
          onDuplicate={onLaunchProject}
          onReorder={onReorder}
        />
      </div>
    </div>
  );
}

// Helper to render a TerminalCard with standard props
function GridCell({
  sessions,
  idx,
  onClose,
  onDuplicate,
  onReorder,
  dragSourceRef,
}: {
  sessions: TerminalSession[];
  idx: number;
  onClose: (sessionId: string) => void;
  onDuplicate: (agentId: string, projectDir: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  dragSourceRef: React.MutableRefObject<number | null>;
}) {
  const s = sessions[idx];
  if (!s) return null;
  return (
    <TerminalCard
      session={s}
      index={idx}
      totalCount={sessions.length}
      onClose={() => onClose(s.sessionId)}
      onDuplicate={() => onDuplicate(s.agentId, s.projectDir)}
      onReorder={onReorder}
      dragSourceRef={dragSourceRef}
    />
  );
}

// Builds the right layout based on session count and layout preset
function TerminalGrid({
  sessions,
  layout,
  onClose,
  onDuplicate,
  onReorder,
}: {
  sessions: TerminalSession[];
  layout: string;
  onClose: (sessionId: string) => void;
  onDuplicate: (agentId: string, projectDir: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}) {
  const dragSourceRef = useRef<number | null>(null);
  const cellProps = {
    sessions,
    onClose,
    onDuplicate,
    onReorder,
    dragSourceRef,
  };

  if (sessions.length === 1) {
    return (
      <div className="h-full w-full">
        <GridCell {...cellProps} idx={0} />
      </div>
    );
  }

  if (sessions.length === 2) {
    if (layout === "stacked") {
      return (
        <Group orientation="vertical">
          <Panel minSize={20}>
            <GridCell {...cellProps} idx={0} />
          </Panel>
          <ResizeHandle orientation="horizontal" />
          <Panel minSize={20}>
            <GridCell {...cellProps} idx={1} />
          </Panel>
        </Group>
      );
    }
    return (
      <Group orientation="horizontal">
        <Panel minSize={20}>
          <GridCell {...cellProps} idx={0} />
        </Panel>
        <ResizeHandle orientation="vertical" />
        <Panel minSize={20}>
          <GridCell {...cellProps} idx={1} />
        </Panel>
      </Group>
    );
  }

  if (sessions.length === 3) {
    if (layout === "1-left-2-right") {
      return (
        <Group orientation="horizontal">
          <Panel minSize={20}>
            <GridCell {...cellProps} idx={0} />
          </Panel>
          <ResizeHandle orientation="vertical" />
          <Panel minSize={20}>
            <Group orientation="vertical">
              <Panel minSize={20}>
                <GridCell {...cellProps} idx={1} />
              </Panel>
              <ResizeHandle orientation="horizontal" />
              <Panel minSize={20}>
                <GridCell {...cellProps} idx={2} />
              </Panel>
            </Group>
          </Panel>
        </Group>
      );
    }
    if (layout === "3-columns") {
      return (
        <Group orientation="horizontal">
          <Panel minSize={15}>
            <GridCell {...cellProps} idx={0} />
          </Panel>
          <ResizeHandle orientation="vertical" />
          <Panel minSize={15}>
            <GridCell {...cellProps} idx={1} />
          </Panel>
          <ResizeHandle orientation="vertical" />
          <Panel minSize={15}>
            <GridCell {...cellProps} idx={2} />
          </Panel>
        </Group>
      );
    }
    if (layout === "3-rows") {
      return (
        <Group orientation="vertical">
          <Panel minSize={15}>
            <GridCell {...cellProps} idx={0} />
          </Panel>
          <ResizeHandle orientation="horizontal" />
          <Panel minSize={15}>
            <GridCell {...cellProps} idx={1} />
          </Panel>
          <ResizeHandle orientation="horizontal" />
          <Panel minSize={15}>
            <GridCell {...cellProps} idx={2} />
          </Panel>
        </Group>
      );
    }
    return (
      <Group orientation="vertical">
        <Panel minSize={20}>
          <Group orientation="horizontal">
            <Panel minSize={20}>
              <GridCell {...cellProps} idx={0} />
            </Panel>
            <ResizeHandle orientation="vertical" />
            <Panel minSize={20}>
              <GridCell {...cellProps} idx={1} />
            </Panel>
          </Group>
        </Panel>
        <ResizeHandle orientation="horizontal" />
        <Panel minSize={20}>
          <GridCell {...cellProps} idx={2} />
        </Panel>
      </Group>
    );
  }

  if (sessions.length === 4) {
    if (layout === "1-left-3-right") {
      return (
        <Group orientation="horizontal">
          <Panel minSize={20}>
            <GridCell {...cellProps} idx={0} />
          </Panel>
          <ResizeHandle orientation="vertical" />
          <Panel minSize={20}>
            <Group orientation="vertical">
              <Panel minSize={15}>
                <GridCell {...cellProps} idx={1} />
              </Panel>
              <ResizeHandle orientation="horizontal" />
              <Panel minSize={15}>
                <GridCell {...cellProps} idx={2} />
              </Panel>
              <ResizeHandle orientation="horizontal" />
              <Panel minSize={15}>
                <GridCell {...cellProps} idx={3} />
              </Panel>
            </Group>
          </Panel>
        </Group>
      );
    }
    return (
      <Group orientation="vertical">
        <Panel minSize={20}>
          <Group orientation="horizontal">
            <Panel minSize={20}>
              <GridCell {...cellProps} idx={0} />
            </Panel>
            <ResizeHandle orientation="vertical" />
            <Panel minSize={20}>
              <GridCell {...cellProps} idx={1} />
            </Panel>
          </Group>
        </Panel>
        <ResizeHandle orientation="horizontal" />
        <Panel minSize={20}>
          <Group orientation="horizontal">
            <Panel minSize={20}>
              <GridCell {...cellProps} idx={2} />
            </Panel>
            <ResizeHandle orientation="vertical" />
            <Panel minSize={20}>
              <GridCell {...cellProps} idx={3} />
            </Panel>
          </Group>
        </Panel>
      </Group>
    );
  }

  // 5+ sessions: 2-column rows
  const rows: TerminalSession[][] = [];
  for (let i = 0; i < sessions.length; i += 2) {
    rows.push(sessions.slice(i, i + 2));
  }

  return (
    <Group orientation="vertical">
      {rows.map((row, rowIdx) => {
        const startIdx = rowIdx * 2;
        return (
          <React.Fragment key={rowIdx}>
            {rowIdx > 0 && <ResizeHandle orientation="horizontal" />}
            <Panel minSize={15}>
              {row.length === 2 ? (
                <Group orientation="horizontal">
                  <Panel minSize={20}>
                    <GridCell {...cellProps} idx={startIdx} />
                  </Panel>
                  <ResizeHandle orientation="vertical" />
                  <Panel minSize={20}>
                    <GridCell {...cellProps} idx={startIdx + 1} />
                  </Panel>
                </Group>
              ) : (
                <GridCell {...cellProps} idx={startIdx} />
              )}
            </Panel>
          </React.Fragment>
        );
      })}
    </Group>
  );
}

// Styled resize handle
function ResizeHandle({
  orientation,
}: {
  orientation: "horizontal" | "vertical";
}) {
  const isVertical = orientation === "vertical";
  return (
    <Separator
      className={`group relative flex items-center justify-center bg-transparent ${
        isVertical ? "w-[6px]" : "h-[6px]"
      }`}
    >
      <div
        className={`bg-fg-4/0 group-hover:bg-fg-4/30 group-active:bg-accent/50 ease rounded-full transition-colors duration-[120ms] ${
          isVertical ? "h-8 w-[3px]" : "h-[3px] w-8"
        }`}
      />
    </Separator>
  );
}
