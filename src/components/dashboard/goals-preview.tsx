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
  return (
    <Card className="overflow-hidden border-zinc-200/80">
      <CardHeader className="space-y-3 p-5 pb-0">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Obiettivi</CardTitle>
            <p className="text-sm text-zinc-500">
              Le prossime mete dei vostri risparmi
            </p>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-fit px-0 text-zinc-600"
          >
            <Link href="/goals">Vai agli obiettivi</Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5">
        {goals.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-5 text-sm leading-6 text-zinc-600">
            Nessun obiettivo ancora. Dai una missione ai tuoi risparmi.
          </p>
        ) : (
          goals.map((goal) => {
            const progressWidth = getProgressWidth(goal.progressPercent);

            return (
              <div
                key={goal.id}
                className="rounded-2xl bg-zinc-50 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium text-zinc-950">
                      {goal.emoji ? `${goal.emoji} ` : ""}
                      {goal.title}
                    </p>
                    <p className="text-sm text-zinc-500">
                      Obiettivo {formatMoney(goal.targetAmount)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-emerald-700">
                    {goal.progressPercent}%
                  </p>
                </div>

                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
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
