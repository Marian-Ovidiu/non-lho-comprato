"use client";

import { Loader2, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CraftedBudgetSummary } from "@/src/components/budget/crafted-budget-summary";
import type { BudgetSummaryView } from "@/src/lib/budget-summary";

type CraftedBudgetRowProps = {
  budget: BudgetSummaryView;
  isEditing: boolean;
  isPending?: boolean;
  onEdit: (budget: BudgetSummaryView) => void;
  onDelete: (budgetId: string) => Promise<void>;
};

export function CraftedBudgetRow({
  budget,
  isEditing,
  isPending = false,
  onEdit,
  onDelete,
}: CraftedBudgetRowProps) {
  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Eliminare il budget "${budget.title}"? Questa azione non si può annullare.`,
    );
    if (!confirmed) {
      return;
    }

    await onDelete(budget.id);
  };

  return (
    <div className={isPending ? "pointer-events-none opacity-60" : undefined}>
      <CraftedBudgetSummary
        budget={budget}
        compact
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-[var(--r-cta)] border-line px-3"
          onClick={() => onEdit(budget)}
          disabled={isPending || isEditing}
        >
          <Pencil className="size-3.5" aria-hidden />
          Modifica
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 rounded-[var(--r-cta)] px-3 text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Trash2 className="size-3.5" aria-hidden />}
          Elimina
        </Button>
      </div>
    </div>
  );
}
