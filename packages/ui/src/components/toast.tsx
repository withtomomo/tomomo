import React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useToast } from "../stores/toast-store";

const icons = {
  success: <CheckCircle size={20} className="text-success shrink-0" />,
  error: <AlertCircle size={20} className="text-error shrink-0" />,
  info: <Info size={20} className="text-accent shrink-0" />,
};

export function ToastViewport() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastPrimitive.Provider duration={Infinity}>
      {toasts.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          open={true}
          onOpenChange={(open) => {
            if (!open) dismiss(t.id);
          }}
          className="bg-bg-0 flex w-full max-w-[360px] animate-none items-center gap-3 rounded-full px-4 py-3 shadow-[var(--shadow-lg)]"
        >
          {icons[t.variant]}
          <div className="min-w-0 flex-1">
            <ToastPrimitive.Title className="text-fg-1 text-sm font-medium">
              {t.title}
            </ToastPrimitive.Title>
            {t.description && (
              <ToastPrimitive.Description className="text-fg-3 mt-0.5 truncate text-xs">
                {t.description}
              </ToastPrimitive.Description>
            )}
          </div>
          <ToastPrimitive.Close className="text-fg-4 hover:text-fg-1 hover:bg-bg-2 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent outline-none">
            <X size={14} />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed right-4 bottom-4 z-50 flex w-[360px] flex-col gap-2 outline-none" />
    </ToastPrimitive.Provider>
  );
}
