import { Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";
import { cn } from "@/lib/utils";

type HeroInsight = {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "success" | "premium";
};

type StatsHeroCardProps = {
  totalSaved: number;
  summary: string;
  insights: HeroInsight[];
};

export function StatsHeroCard({
  totalSaved,
  summary,
  insights,
}: StatsHeroCardProps) {
  const hasData = totalSaved > 0;

  return (
    <Card
      className={cn(
        "overflow-hidden border-border/60 bg-surface/90 shadow-none ring-1 ring-white/5 dark:border-border/60",
        hasData
          ? "bg-gradient-to-br from-success/15 via-surface to-surface-muted/70"
          : "bg-gradient-to-br from-surface via-surface to-surface-muted/70",
      )}
    >
      <CardHeader className="space-y-2 p-4 pb-0 sm:p-5">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-text">
          <Sparkles className="size-3.5 text-success" aria-hidden="true" />
          Lettura del mese
        </div>
        <CardTitle className="max-w-2xl text-[2rem] font-semibold tracking-tight text-foreground sm:text-[2.5rem]">
          {hasData
            ? `Hai tenuto ${formatMoney(totalSaved)} in tasca`
            : "Il quadro del mese Ã¨ ancora aperto"}
        </CardTitle>
        <p className="max-w-3xl text-sm leading-6 text-muted-text sm:text-[15px]">
          {summary}
        </p>
      </CardHeader>

      <CardContent className="p-4 pt-4 sm:p-5 sm:pt-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {insights.map((insight, index) => {
            const isPrimary = index === 0;

            return (
              <div
                key={insight.label}
                className={cn(
                  "rounded-[1.15rem] border px-4 py-4 transition-colors",
                  isPrimary && "sm:col-span-2 sm:min-h-[148px]",
                  insight.tone === "success"
                    ? "border-success/20 bg-success/10"
                    : insight.tone === "premium"
                      ? "border-premium-accent/25 bg-premium-accent/10"
                      : "border-border/70 bg-surface-muted/80",
                )}
              >
                <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-text">
                  {insight.label}
                </div>
                <p
                  className={cn(
                    "mt-2 truncate font-semibold text-foreground",
                    isPrimary ? "text-[1.1rem] sm:text-[1.2rem]" : "text-base",
                  )}
                >
                  {insight.value}
                </p>
                {insight.detail ? (
                  <p className="mt-1 text-xs leading-5 text-muted-text">
                    {insight.detail}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
