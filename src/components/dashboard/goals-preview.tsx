import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";
import { getGoalEmoji } from "@/src/lib/visual-cues";
import { spacing } from "@/src/lib/spacing";

type GoalsPreviewProps = {
  goals: Array<{
    id: string;
    title: string;
    targetAmount: number;
    emoji: string | null;
    progressPercent: number;
  }>;
  description?: string;
};

function getProgressWidth(progressPercent: number) {
  if (!Number.isFinite(progressPercent)) {
    return 0;
  }

  return Math.min(Math.max(progressPercent, 0), 100);
}

export function GoalsPreview({
  goals,
  description = "Le mete che avanzano con risparmi positivi ed evitati.",
}: GoalsPreviewProps) {
  const visibleGoals = goals.slice(0, 3);

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className={spacing.cardHeader}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Obiettivi attivi</CardTitle>
            <p className="text-sm text-muted-text">{description}</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="w-fit px-0 text-muted-text">
            <Link href="/goals">Vai agli obiettivi</Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className={`space-y-3 ${spacing.cardBodyCompact}`}>
        {visibleGoals.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface-muted px-4 py-3 text-sm leading-5 text-muted-text">
            🎯 Nessun obiettivo attivo al momento. Dai una direzione a risparmi ed evitati.
          </p>
        ) : (
          visibleGoals.map((goal) => {
            const progressWidth = getProgressWidth(goal.progressPercent);

            return (
              <div key={goal.id} className="rounded-2xl bg-surface-muted px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {getGoalEmoji(goal.emoji)}{" "}
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
