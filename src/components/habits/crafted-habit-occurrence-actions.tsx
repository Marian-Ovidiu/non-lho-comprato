"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import {
  markHabitOccurrenceAvoided,
  markHabitOccurrenceSkipped,
  markHabitOccurrenceSpent,
} from "@/src/actions/habits";
import { useTranslations } from "@/src/components/language/language-context";
import { triggerHaptic } from "@/src/lib/haptics";
import { cn } from "@/lib/utils";

type CraftedHabitOccurrenceActionsProps = {
  occurrenceId: string;
  currentStatus: "pending" | "spent" | "avoided" | "skipped";
  onStatusChange?: (status: "spent" | "avoided" | "skipped") => void;
};

type ActionStatus = Exclude<CraftedHabitOccurrenceActionsProps["currentStatus"], "pending">;

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
        triggerHaptic(nextStatus === "avoided" ? "success" : "light");
        setPendingStatus(null);
      } catch {
        setFeedback(t.habitOccurrence.error);
        setPendingStatus(null);
      }
    });
  }

  const loading = isPending && Boolean(pendingStatus);

  if (currentStatus === "avoided") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-semibold text-accent">
        <DrawnCheck className="text-accent" />
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
          className="text-[11px] text-ink-3 transition-colors hover:text-foreground disabled:opacity-50"
        >
          {pendingStatus === "spent" ? (
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
          ) : (
            t.habitOccurrence.paid
          )}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => runAction(markHabitOccurrenceAvoided, "avoided")}
          className={cn(
            "rounded-full border border-line px-3.5 py-1.5 text-[12.5px] font-semibold",
            "transition-opacity hover:opacity-80 disabled:opacity-50",
          )}
        >
          {pendingStatus === "avoided" ? (
            <DrawnCheck className="text-accent" />
          ) : (
            t.habitOccurrence.avoided
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
