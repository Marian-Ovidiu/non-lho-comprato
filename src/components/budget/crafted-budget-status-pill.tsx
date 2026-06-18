"use client";

import { cn } from "@/lib/utils";

import type { BudgetStatus } from "@/src/lib/budget-domain";

const STATUS_STYLES: Record<
  BudgetStatus,
  { label: string; className: string }
> = {
  ok: {
    label: "ok",
    className: "border-green/20 bg-green/5 text-green",
  },
  warning: {
    label: "warning",
    className: "border-warm/20 bg-warm/5 text-warm",
  },
  danger: {
    label: "danger",
    className: "border-destructive/20 bg-destructive/5 text-destructive",
  },
};

type CraftedBudgetStatusPillProps = {
  status: BudgetStatus;
  className?: string;
};

export function CraftedBudgetStatusPill({
  status,
  className,
}: CraftedBudgetStatusPillProps) {
  const variant = STATUS_STYLES[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-[9px] py-[3px] text-[10px] font-medium uppercase tracking-[0.12em]",
        variant.className,
        className,
      )}
    >
      {variant.label}
    </span>
  );
}
