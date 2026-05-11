import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";

type GoalsPreviewProps = {
  goals: Array<{
    id: string;
    title: string;
    targetAmount: number;
    emoji: string | null;
    progressPercent: number;
  }>;
};

function getProgressWidth(progressPercent: number) {
  if (!Number.isFinite(progressPercent)) {
    return 0;
  }

  return Math.min(Math.max(progressPercent, 0), 100);
}

export function GoalsPreview({ goals }: GoalsPreviewProps) {
  const visibleGoals = goals.slice(0, 3);

  return (
    <Card className="overflow-hidden border-zinc-200/80 shadow-sm dark:border-zinc-800">
      <CardHeader className="space-y-2 p-4 pb-0 sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Obiettivi attivi</CardTitle>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Le mete che stanno ricevendo risparmio adesso.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm" className="w-fit px-0 text-zinc-600">
            <Link href="/goals">Vai agli obiettivi</Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 p-4 sm:p-5">
        {visibleGoals.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-4 text-sm leading-6 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            Nessun obiettivo attivo al momento. Dai una direzione ai risparmi.
          </p>
        ) : (
          visibleGoals.map((goal) => {
            const progressWidth = getProgressWidth(goal.progressPercent);

            return (
              <div key={goal.id} className="rounded-2xl bg-zinc-50 px-4 py-4 dark:bg-zinc-900">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
                      {goal.emoji ? `${goal.emoji} ` : ""}
                      {goal.title}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Obiettivo {formatMoney(goal.targetAmount)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-emerald-700">
                    {goal.progressPercent}%
                  </p>
                </div>

                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white dark:bg-zinc-950">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${progressWidth}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
