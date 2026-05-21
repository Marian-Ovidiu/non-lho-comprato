import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MomentumTone = "goal" | "habit" | "savings" | "fallback";

type MomentumCardProps = {
  label: string;
  title: string;
  detail: string;
  badge: string;
  icon: LucideIcon;
  tone?: MomentumTone;
  progressPercent?: number;
};

function getToneClasses(tone: MomentumTone) {
  switch (tone) {
    case "goal":
      return {
        card: "border-premium-accent/20 bg-premium-accent/8",
        icon: "bg-premium-accent/15 text-premium-accent",
        bar: "bg-premium-accent",
        badge: "border-premium-accent/25 bg-premium-accent/10 text-premium-accent",
      };
    case "habit":
      return {
        card: "border-success/20 bg-success/8",
        icon: "bg-success/15 text-success",
        bar: "bg-success",
        badge: "border-success/20 bg-success-bg text-success",
      };
    case "savings":
      return {
        card: "border-success/20 bg-success/8",
        icon: "bg-success/15 text-success",
        bar: "bg-success",
        badge: "border-success/20 bg-success-bg text-success",
      };
    default:
      return {
        card: "border-border bg-surface",
        icon: "bg-surface-muted text-foreground",
        bar: "bg-foreground/70",
        badge: "border-border/70 bg-background/70 text-muted-text",
      };
  }
}

export function MomentumCard({
  label,
  title,
  detail,
  badge,
  icon: Icon,
  tone = "fallback",
  progressPercent,
}: MomentumCardProps) {
  const toneClasses = getToneClasses(tone);
  const clampedProgress = Math.min(Math.max(progressPercent ?? 0, 0), 100);

  return (
    <Card size="sm" className={cn("overflow-hidden border shadow-sm", toneClasses.card)}>
      <CardContent className="space-y-3 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-2xl", toneClasses.icon)}>
            <Icon className="size-4" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-text">
              {label}
            </p>
            <h2 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-[1.05rem]">
              {title}
            </h2>
            <p className="text-sm leading-5 text-muted-text">{detail}</p>
          </div>

          <span
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em]",
              toneClasses.badge,
            )}
          >
            {badge}
          </span>
        </div>

        {typeof progressPercent === "number" ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs text-muted-text">
              <span>Progresso</span>
              <span>{Math.round(clampedProgress)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
              <div
                className={cn("h-full rounded-full", toneClasses.bar)}
                style={{ width: `${clampedProgress}%` }}
              />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
