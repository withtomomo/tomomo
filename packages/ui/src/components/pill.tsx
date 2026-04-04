import React from "react";

interface PillProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
}

export function Pill({ children, color, className = "" }: PillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-xs leading-none ${className}`}
      style={
        color
          ? { background: `color-mix(in srgb, ${color} 8%, var(--bg-0))` }
          : { background: "var(--bg-2)" }
      }
    >
      {children}
    </span>
  );
}
