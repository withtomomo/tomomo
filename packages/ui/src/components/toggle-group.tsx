import React from "react";

interface ToggleGroupItem {
  value: string;
  icon?: React.ReactNode;
  label?: string;
  title?: string;
}

type ToggleGroupSize = "xs" | "sm" | "md";

interface ToggleGroupProps {
  items: ToggleGroupItem[];
  value: string;
  onChange: (value: string) => void;
  size?: ToggleGroupSize;
}

const sizeConfigs: Record<
  ToggleGroupSize,
  {
    height: string;
    text: string;
    iconOnly: string;
    px: string;
    gap: string;
    padding: string;
  }
> = {
  xs: {
    height: "h-5",
    text: "text-[10px]",
    iconOnly: "w-5",
    px: "px-2.5",
    gap: "gap-1",
    padding: "p-[2px]",
  },
  sm: {
    height: "h-6",
    text: "text-[10px]",
    iconOnly: "w-6",
    px: "px-3",
    gap: "gap-1",
    padding: "p-[2px]",
  },
  md: {
    height: "h-6",
    text: "text-[11px]",
    iconOnly: "w-6",
    px: "px-3",
    gap: "gap-1.5",
    padding: "p-[3px]",
  },
};

export function ToggleGroup({
  items,
  value,
  onChange,
  size = "sm",
}: ToggleGroupProps) {
  if (items.length <= 1) return null;

  const sizeConfig = sizeConfigs[size];

  return (
    <div
      className={`bg-bg-2 inline-flex items-center gap-[2px] rounded-full ${sizeConfig.padding}`}
    >
      {items.map((item) => {
        const isActive = item.value === value;
        const hasLabel = item.label !== undefined;
        const hasIcon = item.icon !== undefined;
        return (
          <button
            key={item.value}
            onClick={() => onChange(item.value)}
            className={`flex ${sizeConfig.height} cursor-pointer items-center justify-center rounded-full border-none transition-colors duration-[120ms] ${
              hasLabel
                ? `${sizeConfig.gap} ${sizeConfig.px}`
                : hasIcon
                  ? sizeConfig.iconOnly
                  : sizeConfig.px
            } ${isActive ? "bg-fg-1 text-bg-0" : "text-fg-3 bg-transparent"}`}
            title={item.title}
          >
            {item.icon}
            {item.label && (
              <span className={`${sizeConfig.text} font-medium`}>
                {item.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
