import React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
}

export function DropdownMenu({
  trigger,
  children,
  align = "end",
}: DropdownMenuProps) {
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        {trigger}
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          sideOffset={4}
          className="bg-bg-0 z-50 min-w-[200px] animate-none rounded-[22px] p-1.5 shadow-[var(--shadow-lg)]"
        >
          {children}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

interface DropdownItemProps {
  icon?: React.ReactNode;
  children: React.ReactNode;
  danger?: boolean;
  onSelect?: () => void;
}

export function DropdownItem({
  icon,
  children,
  danger,
  onSelect,
}: DropdownItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      onSelect={onSelect}
      className={`ease flex cursor-pointer items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-sm font-medium transition-colors duration-[120ms] outline-none ${
        danger
          ? "text-error data-[highlighted]:bg-error/10"
          : "text-fg-1 data-[highlighted]:bg-bg-2"
      }`}
    >
      {icon && (
        <span className={`shrink-0 ${danger ? "text-error" : "text-fg-3"}`}>
          {icon}
        </span>
      )}
      {children}
    </DropdownMenuPrimitive.Item>
  );
}

export function DropdownDivider() {
  return (
    <DropdownMenuPrimitive.Separator className="bg-bg-2 mx-2 my-1 h-0.5 rounded-full" />
  );
}
