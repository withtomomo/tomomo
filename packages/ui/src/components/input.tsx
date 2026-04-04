import React from "react";

type InputSize = "sm" | "md" | "lg";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputSize?: InputSize;
}

const sizeClasses: Record<InputSize, string> = {
  sm: "h-8 px-4 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function Input({
  inputSize = "md",
  className = "",
  ...props
}: InputProps) {
  return (
    <input
      className={`bg-bg-2 text-fg-1 placeholder:text-fg-4 focus:bg-bg-0 ease w-full rounded-full border-none font-sans transition-all duration-[120ms] focus:shadow-[var(--shadow-focus)] focus:outline-none ${sizeClasses[inputSize]} ${className}`}
      {...props}
    />
  );
}
