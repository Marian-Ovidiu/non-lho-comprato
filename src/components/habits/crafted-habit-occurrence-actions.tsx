"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { CraftedIcon } from "@/components/crafted";
import {
  markHabitOccurrenceAvoided,
  markHabitOccurrenceSkipped,
  markHabitOccurrenceSpent,
} from "@/src/actions/habits";
import { triggerHaptic } from "@/src/lib/haptics";
import { cn } from "@/lib/utils";

type CraftedHabitOccurrenceActionsProps = {
  occurrenceId: string;
  currentStatus: "pending" | "spent" | "avoided" | "skipped";
  onStatusChange?: (status: "spent" | "avoided" | "skipped") => void;
};

type ActionStatus = Exclude<CraftedHabitOccurrenceActionsProps["currentStatus"], "pending">;

export function CraftedHabitOccurrenceActions({
  occurrenceId,
  currentStatus,
  onStatusChange,
}: CraftedHabitOccurrenceActionsProps) {
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
        setPendingStatus(null);
      } catch {
        setFeedback("Non riesco ad aggiornare l'abitudine adesso. Riprova tra poco.");
        setPendingStatus(null);
      }
    });
  }

  const loading = isPending && Boolean(pendingStatus);

  if (currentStatus === "avoided") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-semibold text-accent">
        <CraftedIcon name="check" size={14} strokeWidth={2.2} className="text-accent" />
        Evitata
      </span>
    );
  }

  if (currentStatus === "spent") {
    return (
      <span className="shrink-0 text-[12.5px] font-medium text-ink-3">Spesa</span>
    );
  }

  if (currentStatus === "skipped") {
    return (
      <span className="shrink-0 text-[12.5px] font-medium text-ink-3">Saltata</span>
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
            "Spesa"
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
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            "Evita"
          )}
        </button>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={() => runAction(markHabitOccurrenceSkipped, "skipped")}
        className="text-[10px] text-ink-3 transition-colors hover:text-foreground disabled:opacity-50"
      >
        Salta
      </button>
      {feedback ? (
        <p className="max-w-[12rem] text-right text-[10px] leading-4 text-destructive">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
