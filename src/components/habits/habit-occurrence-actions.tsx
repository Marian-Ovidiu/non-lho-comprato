"use client";

import { useState, useTransition } from "react";
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
  compact?: boolean;
  onStatusChange?: (status: "spent" | "avoided" | "skipped") => void;
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
  compact = false,
  onStatusChange,
}: HabitOccurrenceActionsProps) {
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
      try {
        const result = await action(occurrenceId);

        if (!result.success) {
          setFeedback({
            kind: "error",
            message: result.message,
          });
          setPendingStatus(null);
          return;
        }

        onStatusChange?.(nextStatus);
        setPendingStatus(null);
      } catch {
        setFeedback({
          kind: "error",
          message: "Non riesco ad aggiornare l'abitudine adesso. Riprova tra poco.",
        });
        setPendingStatus(null);
      }
    });
  }

  if (compact) {
    const loading = isPending && Boolean(pendingStatus);

    if (currentStatus === "avoided") {
      return (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 12px",
            borderRadius: 999,
            background: "var(--accent)",
            color: "var(--accent-foreground)",
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          <Check style={{ width: 11, height: 11, flexShrink: 0 }} aria-hidden="true" />
          Evitata
        </div>
      );
    }

    if (currentStatus === "spent") {
      return (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "7px 12px",
            borderRadius: 999,
            border: "1px solid var(--border-strong)",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--muted-foreground)",
            whiteSpace: "nowrap",
          }}
        >
          Spesa
        </div>
      );
    }

    if (currentStatus === "skipped") {
      return (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "7px 12px",
            borderRadius: 999,
            border: "1px solid var(--border)",
            fontSize: 12,
            color: "var(--muted-foreground)",
            whiteSpace: "nowrap",
          }}
        >
          Saltata
        </div>
      );
    }

    return (
      <div className="flex flex-col items-end gap-1.5">
        <div style={{ display: "flex", gap: 6 }} aria-busy={loading}>
          <button
            type="button"
            disabled={loading}
            onClick={() => runAction(markHabitOccurrenceSpent, "spent")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "7px 12px",
              borderRadius: 999,
              border: "1px solid var(--border-strong)",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--muted-foreground)",
              cursor: "pointer",
              background: "transparent",
            }}
          >
            {pendingStatus === "spent" ? (
              <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" aria-hidden="true" />
            ) : null}
            Spesa
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => runAction(markHabitOccurrenceAvoided, "avoided")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "7px 12px",
              borderRadius: 999,
              border: "1px solid var(--foreground)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--foreground)",
              cursor: "pointer",
              background: "transparent",
            }}
          >
            {pendingStatus === "avoided" ? (
              <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" aria-hidden="true" />
            ) : null}
            Evitata
          </button>
        </div>

        {currentStatus === "pending" ? (
          <p className="max-w-[17rem] text-right text-[11px] leading-4 text-muted-text">
            Se non la segni oggi, domani verrà chiusa come spesa.
          </p>
        ) : null}

        {feedback?.kind === "error" ? (
          <p className="max-w-[17rem] text-right text-[11px] leading-4 text-destructive">
            {feedback.message}
          </p>
        ) : null}
      </div>
    );
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
          {getButtonLabel("Segna spesa", "spent")}
        </Button>
        <Button
          type="button"
          className={getButtonClass("avoided")}
          disabled={isPending || Boolean(pendingStatus)}
          variant={currentStatus === "avoided" ? "default" : "outline"}
          onClick={() => runAction(markHabitOccurrenceAvoided, "avoided")}
        >
          {getButtonLabel("Segna evitata", "avoided")}
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
                : currentStatus === "pending"
                  ? "Scegli se è una spesa, un evitamento o un salto."
                  : currentStatus === "spent"
                    ? "Questa abitudine è già conteggiata come spesa."
                    : currentStatus === "avoided"
                      ? "Questa abitudine è già conteggiata come evitata."
                      : "Questa abitudine è stata saltata manualmente.")}
          </span>
        </span>
      </p>
    </div>
  );
}
