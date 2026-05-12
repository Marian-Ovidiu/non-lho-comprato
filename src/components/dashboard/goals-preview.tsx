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
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="space-y-2 p-3.5 pb-0 sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Obiettivi attivi</CardTitle>
            <p className="text-sm text-muted-text">
              Le mete che stanno ricevendo risparmio adesso.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm" className="w-fit px-0 text-muted-text">
            <Link href="/goals">Vai agli obiettivi</Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5 p-3.5 sm:p-5">
        {visibleGoals.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface-muted px-3.5 py-3.5 text-sm leading-5 text-muted-text">
            Nessun obiettivo attivo al momento. Dai una direzione ai risparmi.
          </p>
        ) : (
          visibleGoals.map((goal) => {
            const progressWidth = getProgressWidth(goal.progressPercent);

            return (
              <div key={goal.id} className="rounded-2xl bg-surface-muted px-3.5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {goal.emoji ? `${goal.emoji} ` : ""}
                      {goal.title}
                    </p>
                    <p className="text-xs text-muted-text">
                      Obiettivo {formatMoney(goal.targetAmount)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-success">
                    {goal.progressPercent}%
                  </p>
                </div>

                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-success"
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
