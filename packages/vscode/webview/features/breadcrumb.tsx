import React from "react";
import { ArrowLeft } from "lucide-react";

interface BreadcrumbProps {
  title: string;
  onBack: () => void;
}

export function Breadcrumb({ title, onBack }: BreadcrumbProps) {
  return (
    <div className="bg-bg-0 flex h-10 shrink-0 items-center gap-2 px-3">
      <button
        onClick={onBack}
        className="text-fg-3 hover:bg-bg-2 hover:text-fg-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-transparent transition-colors duration-[120ms]"
      >
        <ArrowLeft size={16} />
      </button>
      <span className="text-fg-1 text-sm font-medium">{title}</span>
    </div>
  );
}
