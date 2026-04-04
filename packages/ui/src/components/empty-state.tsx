import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  color?: string;
}

export function Empty({
  icon,
  title,
  description,
  action,
  color,
}: EmptyStateProps) {
  return (
    <div className="bg-bg-1 flex h-full flex-1 flex-col items-center justify-center gap-4 rounded-2xl">
      {icon && (
        <div
          style={color ? { color } : undefined}
          className={color ? "" : "text-fg-3"}
        >
          {icon}
        </div>
      )}
      <p className="text-fg-1 text-sm font-medium">{title}</p>
      {description && (
        <p className="text-fg-2 max-w-xs text-center text-xs">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
