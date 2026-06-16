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
import { useTranslations } from "@/src/components/language/language-context";

const INITIAL_STATE: FeedbackActionState = { success: false, message: "" };

type BrowserCtx = {
  userAgent: string;
  viewport: string;
  timezone: string;
  locale: string;
  displayMode: string;
};

const EMPTY_BROWSER_CTX: BrowserCtx = {
  userAgent: "",
  viewport: "",
  timezone: "",
  locale: "",
  displayMode: "browser",
};

function readBrowserCtx(): BrowserCtx {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return EMPTY_BROWSER_CTX;
  }

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
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("bug");
  const [state, formAction, isPending] = useActionState(submitFeedback, INITIAL_STATE);
  const [browserCtx, setBrowserCtx] = useState<BrowserCtx>(EMPTY_BROWSER_CTX);

  const FEEDBACK_TYPES = [
    { value: "bug", label: t.feedback.typeBug },
    { value: "suggestion", label: t.feedback.typeSuggestion },
    { value: "confusion", label: t.feedback.typeConfusion },
    { value: "other", label: t.feedback.typeOther },
  ] as const;

  useEffect(() => {
    if (state.success) {
      const timer = window.setTimeout(() => setOpen(false), 1400);
      return () => window.clearTimeout(timer);
    }
  }, [state.success]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setBrowserCtx(readBrowserCtx());
        }

        setOpen(nextOpen);
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={t.feedback.buttonLabel}
          className={cn(
            "fixed right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-[var(--shadow-pop)] ring-1 ring-border/50",
            "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] md:bottom-6 md:right-6",
            "bg-foreground text-background transition-opacity hover:opacity-90 active:scale-95",
            "motion-reduce:transition-none",
          )}
        >
          <PenLine className="size-[18px]" aria-hidden="true" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-sm rounded-[22px] bg-surface shadow-[var(--shadow-pop)]">
        <DialogHeader>
          <DialogTitle>{t.feedback.title}</DialogTitle>
          <DialogDescription>
            {t.feedback.desc}
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
              <legend className="text-sm font-medium leading-none">{t.feedback.typeLegend}</legend>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_TYPES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedType(value)}
                    aria-pressed={selectedType === value}
                    className={cn(
                      "rounded-full border px-[9px] py-[3px] text-xs font-medium transition-colors",
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
              <Label htmlFor="feedback-message">{t.feedback.messageLabel}</Label>
              <Textarea
                id="feedback-message"
                name="message"
                placeholder={t.feedback.messagePlaceholder}
                rows={4}
                maxLength={2000}
                aria-invalid={!!state.errors?.message}
                disabled={isPending}
                className="rounded-[var(--r-control)] border-line bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring/50"
              />
              {state.errors?.message ? (
                <p className="text-xs text-destructive">{state.errors.message}</p>
              ) : null}
            </div>

            {state.message && !state.success ? (
              <p className="text-xs text-destructive">{state.message}</p>
            ) : null}

            <Button type="submit" className="w-full rounded-[var(--r-cta)]" disabled={isPending}>
              {isPending ? t.feedback.sendingButton : t.feedback.sendButton}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
