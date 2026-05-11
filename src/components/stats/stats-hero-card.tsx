import { Award, Flame, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";
import { cn } from "@/lib/utils";

type StatsHeroCardProps = {
  totalSaved: number;
  savingRatePercent: number;
  bestCategoryName?: string | null;
  biggestSavingTitle?: string | null;
};

function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value)}%`;
}

function getHeadline(totalSaved: number): string {
  return `Avete schivato ${formatMoney(totalSaved)}`;
}

export function StatsHeroCard({
  totalSaved,
  savingRatePercent,
  bestCategoryName,
  biggestSavingTitle,
}: StatsHeroCardProps) {
  const hasData = totalSaved > 0;

  return (
    <Card
      className={cn(
        "overflow-hidden border-border shadow-sm dark:border-border",
        hasData
          ? "bg-gradient-to-br from-success/15 via-surface to-surface-muted/80"
          : "bg-gradient-to-br from-surface via-surface to-surface-muted/80",
      )}
    >
      <CardHeader className="space-y-2 p-4 pb-0 sm:p-5">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-text">
          <Sparkles className="size-3.5 text-success" aria-hidden="true" />
          In evidenza
        </div>
        <CardTitle className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {getHeadline(totalSaved)}
        </CardTitle>
        <p className="max-w-2xl text-sm leading-6 text-muted-text">
          {hasData
            ? "Le metriche chiave del mese, riassunte in un colpo d'occhio."
            : "Appena inizierete a risparmiare, qui apparirà il quadro chiave del mese."}
        </p>
      </CardHeader>

      <CardContent className="p-4 pt-4 sm:p-5 sm:pt-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface-muted px-4 py-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-text">
              <Award className="size-3.5 text-success" aria-hidden="true" />
              Categoria migliore
            </div>
            <p className="mt-2 truncate text-base font-semibold text-foreground">
              {bestCategoryName ?? "Nessuna"}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface-muted px-4 py-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-text">
              <Flame className="size-3.5 text-success" aria-hidden="true" />
              Tasso risparmio
            </div>
            <p className="mt-2 text-base font-semibold text-foreground">
              {formatPercent(savingRatePercent)}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface-muted px-4 py-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-text">
              <Sparkles className="size-3.5 text-success" aria-hidden="true" />
              Schivata top
            </div>
            <p className="mt-2 truncate text-base font-semibold text-foreground">
              {biggestSavingTitle ?? "Nessuna"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

