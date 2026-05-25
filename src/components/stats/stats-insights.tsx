import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatsInsight } from "@/src/actions/stats";
import { spacing } from "@/src/lib/spacing";
import { cn } from "@/lib/utils";

type StatsInsightsProps = {
  insights: StatsInsight[];
};

const toneClasses: Record<
  StatsInsight["tone"],
  {
    badge: string;
    card: string;
  }
> = {
  default: {
    badge: "border-border/70 bg-background text-foreground",
    card: "border-border/60 bg-surface/85 shadow-none ring-1 ring-white/5",
  },
  success: {
    badge: "border-accent/20 bg-accent/8 text-accent",
    card: "border-accent/15 bg-accent/5 shadow-none ring-1 ring-accent/10",
  },
  premium: {
    badge: "border-primary/20 bg-primary/8 text-foreground",
    card: "border-primary/15 bg-primary/5 shadow-none ring-1 ring-primary/10",
  },
  warning: {
    badge: "border-destructive/20 bg-destructive/10 text-destructive",
    card: "border-destructive/15 bg-destructive/5 shadow-none ring-1 ring-destructive/10",
  },
};

export function StatsInsights({ insights }: StatsInsightsProps) {
  if (insights.length === 0) {
    return (
      <div className="rounded-[14px] border border-dashed border-border/70 bg-surface-muted/60 px-4 py-4 text-sm leading-6 text-muted-foreground">
        Gli insight compariranno quando ci saranno abbastanza dati per leggerli bene.
      </div>
    );
  }

  return (
    <section aria-label="Insight" className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Segnali utili
        </h2>
        <p className="text-sm leading-6 text-muted-text">
          Tre letture rapide per capire dove stai tenendo di più e dove serve attenzione.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {insights.map((insight) => {
          const tone = toneClasses[insight.tone];

          return (
            <Card
              key={insight.id}
              className={cn(
                "overflow-hidden",
                tone.card,
              )}
            >
              <CardHeader className={spacing.cardHeader}>
                <Badge
                  variant="outline"
                  className={cn("w-fit rounded-full px-3 py-1 text-[11px] font-medium", tone.badge)}
                >
                  {insight.label}
                </Badge>
                <CardTitle className="text-base tracking-tight text-foreground">
                  {insight.value}
                </CardTitle>
              </CardHeader>

              <CardContent className={spacing.cardBody}>
                <p className="text-sm leading-6 text-muted-text">{insight.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
