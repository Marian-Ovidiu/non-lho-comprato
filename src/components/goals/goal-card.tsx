"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteGoal, toggleGoalActive } from "@/src/actions/goals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatMoney } from "@/src/lib/formatters";
import {
  getGoalScopeLabel,
  type LegacyPersonValue,
} from "@/src/lib/ui-person";

type GoalCardProps = {
  goal: {
    id: string;
    title: string;
    targetAmount: number;
    emoji: string | null;
    person: LegacyPersonValue | null;
    isActive: boolean;
    createdAt: string;
    progressAmount: number;
    progressPercent: number;
    remainingAmount: number;
    isCompleted: boolean;
  };
};

function getPersonLabel(person: GoalCardProps["goal"]["person"]) {
  return getGoalScopeLabel(person);
}

function getProgressWidth(progressPercent: number) {
  if (!Number.isFinite(progressPercent)) {
    return 0;
  }

  return Math.min(Math.max(progressPercent, 0), 100);
}

export function GoalCard({ goal }: GoalCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const progressWidth = getProgressWidth(goal.progressPercent);

  function handleToggleActive() {
    startTransition(async () => {
      const result = await toggleGoalActive(goal.id);

      if (!result.success) {
        window.alert(result.message);
        return;
      }

      router.refresh();
    });
  }

  function handleDelete() {
    const confirmed = window.confirm(
      "Vuoi eliminare questo obiettivo? L'operazione non si può annullare.",
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteGoal(goal.id);

      if (!result.success) {
        window.alert(result.message);
        return;
      }

      router.refresh();
    });
  }

  return (
    <Card
      className={
        goal.isCompleted
          ? "border-success/20 bg-success/10 shadow-sm"
          : "border-border shadow-sm"
      }
    >
      <CardHeader className="gap-3 p-5 pb-0 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg sm:text-xl">
                {goal.emoji ? `${goal.emoji} ` : ""}
                {goal.title}
              </CardTitle>
              {goal.isCompleted ? (
                <Badge className="bg-success text-background">Completato</Badge>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{getPersonLabel(goal.person)}</Badge>
              <Badge variant={goal.isActive ? "outline" : "ghost"}>
                {goal.isActive ? "Attivo" : "In pausa"}
              </Badge>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm text-muted-text">Obiettivo</p>
            <p className="text-lg font-semibold text-foreground">
              {formatMoney(goal.targetAmount)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-text">Progresso</span>
            <span className="font-medium text-foreground">
              {goal.progressPercent}%
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
            <div
              className={
                goal.isCompleted
                  ? "h-full rounded-full bg-success"
                  : "h-full rounded-full bg-success"
              }
              style={{ width: `${progressWidth}%` }}
            />
          </div>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-2xl bg-surface/70 px-3 py-2 ring-1 ring-border">
            <p className="text-muted-text">Risparmiati</p>
            <p className="font-medium text-foreground">
              {formatMoney(goal.progressAmount)}
            </p>
          </div>
          <div className="rounded-2xl bg-surface/70 px-3 py-2 ring-1 ring-border">
            <p className="text-muted-text">Obiettivo</p>
            <p className="font-medium text-foreground">
              {formatMoney(goal.targetAmount)}
            </p>
          </div>
          <div className="rounded-2xl bg-surface/70 px-3 py-2 ring-1 ring-border">
            <p className="text-muted-text">Mancano</p>
            <p className="font-medium text-foreground">
              {formatMoney(goal.remainingAmount)}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-text">
          Creato il {formatDate(goal.createdAt)}
        </p>
      </CardContent>

      <CardFooter className="flex-col gap-2 border-t border-border bg-surface-muted/50 p-5 sm:flex-row sm:justify-end sm:p-6">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={handleToggleActive}
          disabled={isPending}
        >
          {goal.isActive ? "Metti in pausa" : "Riattiva"}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="w-full sm:w-auto"
          onClick={handleDelete}
          disabled={isPending}
        >
          Elimina
        </Button>
      </CardFooter>
    </Card>
  );
}


