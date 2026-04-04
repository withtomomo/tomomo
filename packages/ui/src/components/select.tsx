import React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown, Check } from "lucide-react";

interface SelectOption {
  value: string;
  label?: string;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}

export function Select({
  value,
  options,
  onChange,
  placeholder = "Select...",
}: SelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange}>
      <SelectPrimitive.Trigger className="bg-bg-2 text-fg-1 hover:bg-bg-3 flex h-10 w-full cursor-pointer items-center justify-between rounded-full border-none px-5 text-sm font-medium transition-colors duration-[120ms] outline-none focus:shadow-[var(--shadow-focus)]">
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown size={14} className="text-fg-3" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="bg-bg-0 z-50 w-[var(--radix-select-trigger-width)] animate-none rounded-[22px] p-1.5 shadow-[var(--shadow-lg)]"
        >
          <SelectPrimitive.Viewport>
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value}
                value={opt.value}
                className="text-fg-1 data-[highlighted]:bg-bg-2 ease flex cursor-pointer items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-sm font-medium transition-colors duration-[120ms] outline-none"
              >
                <SelectPrimitive.ItemText>
                  {opt.label || opt.value}
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="ml-auto">
                  <Check size={14} className="text-accent" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
