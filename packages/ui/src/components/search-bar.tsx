import React from "react";
import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  size?: "sm" | "md";
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  size = "md",
}: SearchBarProps) {
  const height = size === "sm" ? "h-8" : "h-10";
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const iconSize = size === "sm" ? 14 : 16;

  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 ${height} bg-bg-2 focus-within:bg-bg-0 ease transition-all duration-[120ms] focus-within:shadow-[var(--shadow-focus)]`}
    >
      <Search size={iconSize} className="text-fg-4 shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full border-none bg-transparent ${textSize} text-fg-1 placeholder:text-fg-4 font-sans focus:outline-none`}
      />
    </div>
  );
}
