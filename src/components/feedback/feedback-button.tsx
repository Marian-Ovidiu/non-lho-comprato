"use client";

import { PenLine } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { submitFeedback, type FeedbackActionState } from "@/src/actions/feedback";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const FEEDBACK_TYPES = [
  { value: "bug", label: "Problema" },
  { value: "suggestion", label: "Consiglio" },
  { value: "confusion", label: "Non ho capito qualcosa" },
  { value: "other", label: "Altro" },
] as const;

const INITIAL_STATE: FeedbackActionState = { success: false, message: "" };

type BrowserCtx = {
  userAgent: string;
  viewport: string;
  timezone: string;
  locale: string;
  displayMode: string;
};

function readBrowserCtx(): BrowserCtx {
  const nav = navigator as Navigator & { standalone?: boolean };
  const standalone =
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;

  return {
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language,
    displayMode: standalone ? "standalone" : "browser",
  };
}

export function FeedbackButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("bug");
  const [state, formAction, isPending] = useActionState(submitFeedback, INITIAL_STATE);
  // Computed once at mount — these values are stable within a session.
  const [browserCtx] = useState<BrowserCtx>(readBrowserCtx);

  useEffect(() => {
    if (state.success) {
      const timer = window.setTimeout(() => setOpen(false), 1400);
      return () => window.clearTimeout(timer);
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Lascia un feedback"
          className={cn(
            "fixed right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-lg ring-1 ring-border/50",
            "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] md:bottom-6 md:right-6",
            "bg-foreground text-background transition-opacity hover:opacity-90 active:scale-95",
            "motion-reduce:transition-none",
          )}
        >
          <PenLine className="size-[18px]" aria-hidden="true" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Lascia un feedback</DialogTitle>
          <DialogDescription>
            Segnala un problema, un consiglio o qualcosa che non ti torna.
          </DialogDescription>
        </DialogHeader>

        {state.success ? (
          <p className="py-4 text-center text-sm font-medium text-foreground">
            {state.message}
          </p>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="route" value={pathname} />
            <input type="hidden" name="userAgent" value={browserCtx.userAgent} />
            <input type="hidden" name="viewport" value={browserCtx.viewport} />
            <input type="hidden" name="timezone" value={browserCtx.timezone} />
            <input type="hidden" name="locale" value={browserCtx.locale} />
            <input type="hidden" name="displayMode" value={browserCtx.displayMode} />

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium leading-none">Tipo</legend>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedType(value)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      selectedType === value
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-transparent text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input type="hidden" name="type" value={selectedType} />
              {state.errors?.type ? (
                <p className="text-xs text-destructive">{state.errors.type}</p>
              ) : null}
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor="feedback-message">Messaggio</Label>
              <Textarea
                id="feedback-message"
                name="message"
                placeholder="Scrivi cosa è successo o cosa miglioreresti..."
                rows={4}
                maxLength={2000}
                aria-invalid={!!state.errors?.message}
                disabled={isPending}
              />
              {state.errors?.message ? (
                <p className="text-xs text-destructive">{state.errors.message}</p>
              ) : null}
            </div>

            {state.message && !state.success ? (
              <p className="text-xs text-destructive">{state.message}</p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Invio…" : "Invia feedback"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
