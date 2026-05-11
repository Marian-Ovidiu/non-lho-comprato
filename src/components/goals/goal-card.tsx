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

type GoalCardProps = {
  goal: {
    id: string;
    title: string;
    targetAmount: number;
    emoji: string | null;
    person: "MARIAN" | "MARTINA" | null;
    isActive: boolean;
    createdAt: string;
    progressAmount: number;
    progressPercent: number;
    remainingAmount: number;
    isCompleted: boolean;
  };
};

function getPersonLabel(person: GoalCardProps["goal"]["person"]) {
  if (person === "MARIAN") {
    return "Marian";
  }

  if (person === "MARTINA") {
    return "Martina";
  }

  return "Entrambi";
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
          ? "border-emerald-200 bg-emerald-50/40 shadow-sm"
          : "border-zinc-200/80 shadow-sm"
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
                <Badge className="bg-emerald-600 text-white">Completato</Badge>
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
            <p className="text-sm text-zinc-500">Obiettivo</p>
            <p className="text-lg font-semibold text-zinc-950">
              {formatMoney(goal.targetAmount)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-zinc-500">Progresso</span>
            <span className="font-medium text-zinc-950">
              {goal.progressPercent}%
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
            <div
              className={
                goal.isCompleted
                  ? "h-full rounded-full bg-emerald-600"
                  : "h-full rounded-full bg-emerald-500"
              }
              style={{ width: `${progressWidth}%` }}
            />
          </div>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-2xl bg-white/70 px-3 py-2 ring-1 ring-zinc-100">
            <p className="text-zinc-500">Risparmiati</p>
            <p className="font-medium text-zinc-950">
              {formatMoney(goal.progressAmount)}
            </p>
          </div>
          <div className="rounded-2xl bg-white/70 px-3 py-2 ring-1 ring-zinc-100">
            <p className="text-zinc-500">Obiettivo</p>
            <p className="font-medium text-zinc-950">
              {formatMoney(goal.targetAmount)}
            </p>
          </div>
          <div className="rounded-2xl bg-white/70 px-3 py-2 ring-1 ring-zinc-100">
            <p className="text-zinc-500">Mancano</p>
            <p className="font-medium text-zinc-950">
              {formatMoney(goal.remainingAmount)}
            </p>
          </div>
        </div>

        <p className="text-xs text-zinc-500">
          Creato il {formatDate(goal.createdAt)}
        </p>
      </CardContent>

      <CardFooter className="flex-col gap-2 border-t border-zinc-200/70 bg-zinc-50/50 p-5 sm:flex-row sm:justify-end sm:p-6">
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
