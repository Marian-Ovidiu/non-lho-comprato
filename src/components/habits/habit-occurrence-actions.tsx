"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

import {
  markHabitOccurrenceAvoided,
  markHabitOccurrenceSkipped,
  markHabitOccurrenceSpent,
} from "@/src/actions/habits";
import { Button } from "@/components/ui/button";
import { triggerHaptic } from "@/src/lib/haptics";
import { cn } from "@/lib/utils";

type HabitOccurrenceActionsProps = {
  occurrenceId: string;
  currentStatus: "pending" | "spent" | "avoided" | "skipped";
};

type FeedbackState =
  | {
      kind: "success" | "error";
      message: string;
    }
  | null;

type ActionStatus = Exclude<HabitOccurrenceActionsProps["currentStatus"], "pending">;

export function HabitOccurrenceActions({
  occurrenceId,
  currentStatus,
}: HabitOccurrenceActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingStatus, setPendingStatus] = useState<ActionStatus | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

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
      let shouldClearPending = true;

      try {
        const result = await action(occurrenceId);

        setFeedback({
          kind: result.success ? "success" : "error",
          message: result.message,
        });

        if (!result.success) {
          return;
        }

        shouldClearPending = false;
        window.setTimeout(() => {
          setPendingStatus(null);
          router.refresh();
        }, 400);
      } finally {
        if (shouldClearPending) {
          setPendingStatus(null);
        }
      }
    });
  }

  function getButtonClass(status: ActionStatus) {
    return cn(
      "w-full",
      pendingStatus === status && "border-primary/30 bg-primary/10 text-primary shadow-sm",
    );
  }

  function getButtonLabel(label: string, status: ActionStatus) {
    if (pendingStatus !== status) {
      return label;
    }

    return (
      <>
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        Salvo...
      </>
    );
  }

  return (
    <div className="space-y-3" aria-busy={Boolean(pendingStatus)}>
      <div className="grid gap-2 sm:grid-cols-3">
        <Button
          type="button"
          className={getButtonClass("spent")}
          disabled={isPending || Boolean(pendingStatus)}
          variant={currentStatus === "spent" ? "default" : "outline"}
          onClick={() => runAction(markHabitOccurrenceSpent, "spent")}
        >
          {getButtonLabel("L&apos;ho fatto", "spent")}
        </Button>
        <Button
          type="button"
          className={getButtonClass("avoided")}
          disabled={isPending || Boolean(pendingStatus)}
          variant={currentStatus === "avoided" ? "default" : "outline"}
          onClick={() => runAction(markHabitOccurrenceAvoided, "avoided")}
        >
          {getButtonLabel("Evitato", "avoided")}
        </Button>
        <Button
          type="button"
          className={getButtonClass("skipped")}
          disabled={isPending || Boolean(pendingStatus)}
          variant={currentStatus === "skipped" ? "secondary" : "ghost"}
          onClick={() => runAction(markHabitOccurrenceSkipped, "skipped")}
        >
          {getButtonLabel("Salta", "skipped")}
        </Button>
      </div>

      <p
        className={
          feedback?.kind === "error"
            ? "text-sm text-destructive"
            : feedback?.kind === "success"
              ? "text-sm text-success"
              : "text-xs text-muted-text"
        }
        aria-live="polite"
      >
        <span className="inline-flex items-start gap-2">
          {feedback?.kind === "success" ? (
            <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          ) : pendingStatus ? (
            <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin" aria-hidden="true" />
          ) : null}
          <span>
            {feedback?.message ??
              (pendingStatus
                ? "Aggiornamento in corso..."
                : "Scegli come trattare questa abitudine di oggi.")}
          </span>
        </span>
      </p>
    </div>
  );
}
