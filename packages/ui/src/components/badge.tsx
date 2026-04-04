import React from "react";

type BadgeVariant = "default" | "accent" | "success" | "warning" | "error";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-bg-2 text-fg-2",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
};

export function Badge({ variant = "default", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] leading-none font-semibold ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
