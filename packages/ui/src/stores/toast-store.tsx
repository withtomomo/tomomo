import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

type ToastVariant = "success" | "error" | "info";

interface ToastData {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toasts: ToastData[];
  toast: (options: {
    title: string;
    description?: string;
    variant?: ToastVariant;
  }) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (options: {
      title: string;
      description?: string;
      variant?: ToastVariant;
    }) => {
      const id = crypto.randomUUID();
      const newToast: ToastData = {
        id,
        title: options.title,
        description: options.description,
        variant: options.variant || "info",
      };
      setToasts((prev) => [...prev, newToast]);
      // Single owner: our timer handles all dismissal (Radix duration=Infinity)
      const timer = setTimeout(() => {
        timersRef.current.delete(id);
        dismiss(id);
      }, 4000);
      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  // Clean up timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
