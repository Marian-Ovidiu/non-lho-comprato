"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastTone = "default" | "success" | "error" | "celebrate";

type ToastAction = {
  label: string;
  onClick: () => Promise<void> | void;
};

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  action?: ToastAction;
  duration?: number;
};

type ToastRecord = ToastInput & {
  id: string;
  tone: ToastTone;
};

type ToastContextValue = {
  push: (toast: ToastInput) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function createToastId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: (id: string) => void;
}) {
  const [isActionPending, setIsActionPending] = useState(false);

  async function handleAction() {
    if (!toast.action || isActionPending) {
      return;
    }

    setIsActionPending(true);

    try {
      await toast.action.onClick();
    } finally {
      onDismiss(toast.id);
    }
  }

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex w-full items-start gap-3 rounded-[1.35rem] border border-line bg-surface/95 p-3.5 text-sm shadow-[0_18px_50px_rgba(0,0,0,0.16)] backdrop-blur-xl",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2",
        toast.tone === "success" && "border-accent/35",
        toast.tone === "error" && "border-destructive/35",
        toast.tone === "celebrate" && "border-premium-accent/40",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-1 size-2.5 shrink-0 rounded-full bg-ink-3",
          toast.tone === "success" && "bg-accent",
          toast.tone === "error" && "bg-destructive",
          toast.tone === "celebrate" && "bg-premium-accent",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold tracking-tight text-foreground">{toast.title}</p>
        {toast.description ? (
          <p className="mt-0.5 text-xs leading-5 text-ink-3">{toast.description}</p>
        ) : null}
        {toast.action ? (
          <button
            type="button"
            disabled={isActionPending}
            onClick={handleAction}
            className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-full border border-line px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/55 disabled:cursor-wait disabled:opacity-65"
          >
            {isActionPending ? (
              <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />
            ) : null}
            {toast.action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        disabled={isActionPending}
        onClick={() => onDismiss(toast.id)}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/55 disabled:cursor-wait disabled:opacity-60"
      >
        <X className="size-3.5" aria-hidden="true" />
        <span className="sr-only">Chiudi notifica</span>
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);

    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: ToastInput) => {
      const id = createToastId();
      const duration = toast.duration ?? (toast.action ? 6500 : 4200);
      const nextToast: ToastRecord = {
        ...toast,
        id,
        tone: toast.tone ?? "default",
      };

      setToasts((current) => [...current.slice(-2), nextToast]);

      if (duration > 0) {
        const timer = window.setTimeout(() => dismiss(id), duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push, dismiss }), [dismiss, push]);

  useEffect(() => {
    const timers = timersRef.current;

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions text"
        className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-[90] mx-auto flex max-w-md flex-col gap-2 sm:bottom-5"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
