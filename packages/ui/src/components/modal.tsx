import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export function Modal({
  open,
  onOpenChange,
  title,
  children,
  footer,
  width = "max-w-md",
}: ModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-none bg-black/50" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={`fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 ${width} bg-bg-0 w-[calc(100%-32px)] animate-none rounded-[28px] shadow-[var(--shadow-xl)] outline-none`}
        >
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <DialogPrimitive.Title className="text-fg-1 text-xl font-semibold">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className="text-fg-3 hover:bg-bg-2 hover:text-fg-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-transparent outline-none">
              <X size={16} />
            </DialogPrimitive.Close>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
            {children}
          </div>
          {footer && (
            <div className="flex items-center justify-end gap-2 px-6 pb-6">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
