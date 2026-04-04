import React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "accent" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-fg-1 text-bg-0 hover:opacity-[0.88]",
  secondary: "bg-accent/10 text-accent hover:bg-accent/20",
  ghost: "bg-transparent text-fg-2 hover:bg-bg-2 hover:text-fg-1",
  accent: "bg-accent text-white hover:bg-accent-hover",
  danger: "bg-error/15 text-error hover:bg-error hover:text-white",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-4 text-xs",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-6 text-base",
  xl: "h-14 px-8 text-lg",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`ease inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border-none leading-none font-medium transition-colors duration-[120ms] ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
