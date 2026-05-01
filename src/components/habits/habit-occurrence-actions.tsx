"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  markHabitOccurrenceAvoided,
  markHabitOccurrenceSkipped,
  markHabitOccurrenceSpent,
} from "@/src/actions/habits";
import { Button } from "@/components/ui/button";

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

export function HabitOccurrenceActions({
  occurrenceId,
  currentStatus,
}: HabitOccurrenceActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  function runAction(
    action: (id: string) => Promise<{ success: boolean; message: string }>,
  ) {
    if (isPending) {
      return;
    }

    setFeedback(null);

    startTransition(async () => {
      const result = await action(occurrenceId);

      setFeedback({
        kind: result.success ? "success" : "error",
        message: result.message,
      });

      if (!result.success) {
        return;
      }

      window.setTimeout(() => {
        router.refresh();
      }, 500);
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <Button
          type="button"
          className="w-full"
          disabled={isPending}
          variant={currentStatus === "spent" ? "default" : "outline"}
          onClick={() => runAction(markHabitOccurrenceSpent)}
        >
          L&apos;ho fatto
        </Button>
        <Button
          type="button"
          className="w-full"
          disabled={isPending}
          variant={currentStatus === "avoided" ? "default" : "outline"}
          onClick={() => runAction(markHabitOccurrenceAvoided)}
        >
          Evitato
        </Button>
        <Button
          type="button"
          className="w-full"
          disabled={isPending}
          variant={currentStatus === "skipped" ? "secondary" : "ghost"}
          onClick={() => runAction(markHabitOccurrenceSkipped)}
        >
          Salta
        </Button>
      </div>

      <p
        className={
          feedback?.kind === "error"
            ? "text-sm text-rose-600"
            : feedback?.kind === "success"
              ? "text-sm text-emerald-700"
              : "text-xs text-zinc-500"
        }
        aria-live="polite"
      >
        {feedback?.message ?? "Scegli come trattare questa abitudine di oggi."}
      </p>
    </div>
  );
}
