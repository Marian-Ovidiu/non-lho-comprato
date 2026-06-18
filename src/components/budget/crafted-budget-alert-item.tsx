"use client";

import Link from "next/link";
import { AlertTriangle, Clock3, Gauge } from "lucide-react";

import { cn } from "@/lib/utils";
import { Label, Mono, Serif } from "@/components/crafted";
import type { BudgetAlert } from "@/src/lib/budget-alerts";

const ALERT_STYLES = {
  danger: {
    cardClassName: "border-destructive/20 bg-destructive/5",
    labelClassName: "border-destructive/20 bg-background text-destructive",
  },
  warning: {
    cardClassName: "border-warm/20 bg-warm/5",
    labelClassName: "border-warm/20 bg-background text-warm",
  },
} as const;

const KIND_META: Record<
  BudgetAlert["kind"],
  { title: string; icon: typeof AlertTriangle }
> = {
  over_budget: {
    title: "Budget superato",
    icon: AlertTriangle,
  },
  pace_risk: {
    title: "Ritmo troppo alto",
    icon: Gauge,
  },
  low_runway: {
    title: "Poco margine rimasto",
    icon: Clock3,
  },
};

type CraftedBudgetAlertItemProps = {
  alert: BudgetAlert;
  className?: string;
};

export function CraftedBudgetAlertItem({
  alert,
  className,
}: CraftedBudgetAlertItemProps) {
  const severity = ALERT_STYLES[alert.level];
  const kind = KIND_META[alert.kind];
  const Icon = kind.icon;

  return (
    <Link
      href={alert.ctaHref ?? "/workspace/budgets"}
      aria-label={`${kind.title}: ${alert.message}`}
      className={cn(
        "group block rounded-[var(--r-card)] border px-4 py-4 shadow-none transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        "hover:border-border hover:bg-surface",
        severity.cardClassName,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[var(--r-control)] border",
            severity.labelClassName,
          )}
          aria-hidden="true"
        >
          <Icon className="size-4" />
        </span>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
              {kind.title}
            </h3>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-[8px] py-[2px] text-[10px] font-medium uppercase tracking-[0.14em]",
                severity.labelClassName,
              )}
            >
              {alert.level}
            </span>
          </div>

          <Serif className="block text-sm text-muted-foreground">
            {alert.message}
          </Serif>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-3">
            <Label className="tracking-[0.18em] text-ink-3">
              {alert.subtitle}
            </Label>
            <Mono className="text-[11px] text-ink-3">{alert.detail}</Mono>
          </div>
        </div>
      </div>
    </Link>
  );
}
