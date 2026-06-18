"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CraftedAmount } from "@/components/crafted/motion";
import { Label, Mono, ProgressLine, Serif } from "@/components/crafted";
import { cn } from "@/lib/utils";
import { getCurrencySymbol } from "@/src/lib/workspace-currency";
import type { BudgetSummaryView } from "@/src/lib/budget-summary";
import { CraftedBudgetStatusPill } from "@/src/components/budget/crafted-budget-status-pill";

type CraftedBudgetSummaryProps =
  | {
      empty: true;
      title: string;
      description: string;
      actionLabel: string;
      actionHref: string;
      className?: string;
    }
  | {
      empty?: false;
      budget: BudgetSummaryView;
      manageHref?: string;
      manageLabel?: string;
      compact?: boolean;
      className?: string;
    };

function Money({
  value,
  currency,
  compact = false,
}: {
  value: number;
  currency: string;
  compact?: boolean;
}) {
  return (
    <Mono
      className={cn(
        "inline-flex items-baseline gap-1 font-medium",
        compact ? "text-[15px]" : "text-[18px]",
      )}
    >
      <CraftedAmount value={value} />
      <span className={compact ? "text-[10px] text-accent" : "text-xs text-accent"}>
        {currency}
      </span>
    </Mono>
  );
}

export function CraftedBudgetSummary(props: CraftedBudgetSummaryProps) {
  if (props.empty) {
    return (
      <div
        className={cn(
          "border border-line bg-surface-muted/35",
          "rounded-[var(--r-card)] px-4 py-4",
          props.className,
        )}
      >
        <Label className="mb-2 block">Budget</Label>
        <h2 className="text-[18px] font-semibold tracking-[-0.02em]">
          {props.title}
        </h2>
        <Serif className="mt-2 block text-sm text-muted-foreground">
          {props.description}
        </Serif>
        <div className="mt-4">
          <Button asChild className="h-10 rounded-[var(--r-cta)]">
            <Link href={props.actionHref}>{props.actionLabel}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const currency = getCurrencySymbol(props.budget.currency ?? "EUR");

  return (
    <div
      className={cn(
        "border border-line bg-surface-muted/35",
        "rounded-[var(--r-card)]",
        props.compact ? "px-4 py-4" : "px-4 py-5",
        props.className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            className={cn(
              "truncate font-semibold tracking-[-0.02em]",
              props.compact ? "text-[16px]" : "text-[18px]",
            )}
          >
            {props.budget.title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{props.budget.subtitle}</p>
        </div>
        <CraftedBudgetStatusPill status={props.budget.status} />
      </div>

      <div className={cn("mt-4 grid gap-3", props.compact ? "grid-cols-3" : "grid-cols-3")}>
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-3">Budget</p>
          <Money value={props.budget.budgetAmount} currency={currency} compact={props.compact} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-3">Speso</p>
          <Money value={props.budget.spentAmount} currency={currency} compact={props.compact} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-ink-3">Rimanente</p>
          <Money value={props.budget.remainingAmount} currency={currency} compact={props.compact} />
        </div>
      </div>

      <div className="mt-4">
        <ProgressLine value={props.budget.spentPercentage} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <Mono className="text-[11px] text-muted-foreground">
          {Math.round(props.budget.spentPercentage)}% usato · {Math.round(props.budget.timeProgressPercentage)}% del tempo
        </Mono>
        <Mono
          className={cn(
            "text-[11px]",
            props.budget.remainingAmount < 0 ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {props.budget.dailyRemainingAmount > 0
            ? `${props.budget.dailyRemainingAmount.toFixed(2)}${currency}/giorno`
            : "Fine periodo"}
        </Mono>
      </div>

      <Serif className="mt-2 block text-sm text-muted-foreground">
        {props.budget.message}
      </Serif>

      {props.manageHref ? (
        <div className="mt-4">
          <Button asChild variant="outline" className="h-10 rounded-[var(--r-cta)] border-line px-4">
            <Link href={props.manageHref}>{props.manageLabel ?? "Gestisci budget"}</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
