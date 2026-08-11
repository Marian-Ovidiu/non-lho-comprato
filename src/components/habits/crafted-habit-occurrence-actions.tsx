"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import {
  markHabitOccurrenceSkipped,
  markHabitOccurrenceSpent,
} from "@/src/actions/habits";
import { useTranslations } from "@/src/components/language/language-context";
import { triggerHaptic } from "@/src/lib/haptics";
import { cn } from "@/lib/utils";

type CraftedHabitOccurrenceActionsProps = {
  occurrenceId: string;
  currentStatus: "pending" | "spent" | "avoided" | "skipped";
  onStatusChange?: (status: "spent" | "skipped") => void;
};

/** Gli stati che si possono ancora assegnare: "avoided" resta solo in lettura. */
type ActionStatus = "spent" | "skipped";

function DrawnCheck({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("size-3.5", className)}
    >
      <path
        className="nlc-check-draw"
        d="M5 12.5l4.2 4.2L19 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CraftedHabitOccurrenceActions({
  occurrenceId,
  currentStatus,
  onStatusChange,
}: CraftedHabitOccurrenceActionsProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [pendingStatus, setPendingStatus] = useState<ActionStatus | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  function runAction(
    action: (id: string) => Promise<{ success: boolean; message: string }>,
    nextStatus: ActionStatus,
  ) {
    if (isPending || pendingStatus) {
      return;
    }

    setFeedback(null);
    setPendingStatus(nextStatus);
    triggerHaptic("subtle");

    startTransition(async () => {
      try {
        const result = await action(occurrenceId);

        if (!result.success) {
          setFeedback(result.message);
          setPendingStatus(null);
          return;
        }

        onStatusChange?.(nextStatus);
        triggerHaptic("light");
        setPendingStatus(null);
      } catch {
        setFeedback(t.habitOccurrence.error);
        setPendingStatus(null);
      }
    });
  }

  const loading = isPending && Boolean(pendingStatus);

  // Lo stato resta leggibile per le occorrenze già segnate così in passato:
  // si è tolto il modo di crearne di nuove, non la memoria di quelle vecchie.
  if (currentStatus === "avoided") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-medium text-ink-3">
        <DrawnCheck className="text-ink-3" />
        {t.habitOccurrence.avoided}
      </span>
    );
  }

  if (currentStatus === "spent") {
    return (
      <span className="shrink-0 text-[12.5px] font-medium text-ink-3">{t.habitOccurrence.paid}</span>
    );
  }

  if (currentStatus === "skipped") {
    return (
      <span className="shrink-0 text-[12.5px] font-medium text-ink-3">
        {t.habitOccurrence.notApplicable}
      </span>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex items-center gap-2" aria-busy={loading}>
        <button
          type="button"
          disabled={loading}
          onClick={() => runAction(markHabitOccurrenceSpent, "spent")}
          className={cn(
            "rounded-full border border-line px-3.5 py-1.5 text-[12.5px] font-semibold",
            "transition-opacity hover:opacity-80 disabled:opacity-50",
          )}
        >
          {pendingStatus === "spent" ? (
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
          ) : (
            t.habitOccurrence.paid
          )}
        </button>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={() => runAction(markHabitOccurrenceSkipped, "skipped")}
        className="text-[10px] text-ink-3 transition-colors hover:text-foreground disabled:opacity-50"
      >
        {t.habitOccurrence.notApplicable}
      </button>
      {feedback ? (
        <p className="max-w-[12rem] text-right text-[10px] leading-4 text-destructive">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
