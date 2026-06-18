"use client";

import { cn } from "@/lib/utils";
import { Label, Serif } from "@/components/crafted";
import type { BudgetAlert } from "@/src/lib/budget-alerts";
import { CraftedBudgetAlertItem } from "@/src/components/budget/crafted-budget-alert-item";

type CraftedBudgetAlertListProps = {
  alerts: BudgetAlert[];
  title?: string;
  description?: string;
  className?: string;
};

export function CraftedBudgetAlertList({
  alerts,
  title = "Alert budget",
  description = "Controlla i budget che richiedono attenzione.",
  className,
}: CraftedBudgetAlertListProps) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <section className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <Label className="block">{title}</Label>
        <Serif className="block text-sm text-muted-foreground">
          {description}
        </Serif>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <CraftedBudgetAlertItem key={alert.id} alert={alert} />
        ))}
      </div>
    </section>
  );
}
