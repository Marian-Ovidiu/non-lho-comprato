"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Label, Rule, Serif } from "@/components/crafted";
import { CraftedBudgetAlertList } from "@/src/components/budget/crafted-budget-alert-list";
import { CraftedBudgetForm } from "@/src/components/workspace/crafted-budget-form";
import { CraftedBudgetRow } from "@/src/components/workspace/crafted-budget-row";
import { deleteBudgetAction } from "@/src/actions/budgets";
import type {
  BudgetCategoryOption,
  BudgetSummaryView,
} from "@/src/lib/budget-summary";
import type { BudgetAlertSelection } from "@/src/lib/budget-alerts";
import { sortBudgetSummariesForManagement } from "@/src/lib/budget-summary";

type CraftedBudgetManagementProps = {
  initialBudgets: BudgetSummaryView[];
  categories: BudgetCategoryOption[];
  currency: string;
  alertSelection: BudgetAlertSelection;
  embedded?: boolean;
};

export function CraftedBudgetManagement({
  initialBudgets,
  categories,
  currency,
  alertSelection,
  embedded = false,
}: CraftedBudgetManagementProps) {
  const router = useRouter();
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formWrapRef = useRef<HTMLDivElement | null>(null);

  const sortedBudgets = useMemo(
    () => sortBudgetSummariesForManagement(initialBudgets),
    [initialBudgets],
  );

  const editingBudget = sortedBudgets.find((budget) => budget.id === editingBudgetId) ?? null;
  const workspaceBudgets = sortedBudgets.filter((budget) => budget.scope === "workspace");
  const categoryBudgets = sortedBudgets.filter((budget) => budget.scope === "category");

  const handleSaved = () => {
    setEditingBudgetId(null);
    setNotice("Budget salvato.");
    setResetToken((value) => value + 1);
  };

  const handleCancel = () => {
    setEditingBudgetId(null);
    setNotice(null);
    setResetToken((value) => value + 1);
  };

  const handleEdit = (budget: BudgetSummaryView) => {
    setEditingBudgetId(budget.id);
    setNotice(null);
    window.setTimeout(() => {
      formWrapRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 40);
  };

  const handleDelete = async (budgetId: string) => {
    const formData = new FormData();
    formData.set("budgetId", budgetId);

    startTransition(async () => {
      const result = await deleteBudgetAction(formData);
      setNotice(result.message);

      if (result.success) {
        if (editingBudgetId === budgetId) {
          setEditingBudgetId(null);
        }
        router.refresh();
      }
    });
  };

  return (
    <section
      id="gestione-budget"
      className={embedded ? "px-[var(--sp-page-x)] py-[var(--sp-section-y)]" : "-mx-4 px-5 py-6 sm:-mx-6 lg:-mx-8"}
    >
      <Label className="mb-2 block">
        {embedded ? "Gestione budget" : "Budget"}
      </Label>
      <h2 className={embedded ? "text-[16px] font-semibold" : "text-[clamp(1.5rem,6vw,2rem)] font-semibold tracking-[-0.03em]"}>
        {embedded ? "Limiti e categorie" : "Imposta e controlla i tuoi budget"}
      </h2>
      <Serif className="mt-3 block max-w-2xl text-sm leading-6 text-muted-foreground">
        I budget usano solo la spesa reale. Evitate e confronti restano separati nell’impatto netto.
      </Serif>

      <CraftedBudgetAlertList
        alerts={alertSelection.pageAlerts}
        title="Da controllare"
        description="Alcuni budget stanno andando più veloce del previsto."
        className="mt-6"
      />

      <div ref={formWrapRef} className="scroll-mt-20">
        <CraftedBudgetForm
          key={editingBudget ? editingBudget.id : `create-${resetToken}`}
          mode={editingBudget ? "edit" : "create"}
          currency={currency}
          categories={categories}
          initialBudget={editingBudget}
          onSaved={handleSaved}
          onCancel={editingBudget ? handleCancel : undefined}
        />
      </div>

      {notice ? (
        <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
          {notice}
        </p>
      ) : null}

      <Rule className="my-6" />

      {sortedBudgets.length === 0 ? (
        <div className="border-y border-line py-5">
          <p className="text-sm text-muted-foreground">
            Nessun budget ancora configurato. Puoi partire dal workspace globale oppure da una categoria specifica.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {workspaceBudgets.length > 0 ? (
            <section>
              <Label className="mb-3 block">Budget workspace</Label>
              <div className="space-y-4">
                {workspaceBudgets.map((budget) => (
                  <CraftedBudgetRow
                    key={budget.id}
                    budget={budget}
                    isEditing={editingBudgetId === budget.id}
                    isPending={isPending}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {categoryBudgets.length > 0 ? (
            <section>
              <Label className="mb-3 block">Budget categoria</Label>
              <div className="space-y-4">
                {categoryBudgets.map((budget) => (
                  <CraftedBudgetRow
                    key={budget.id}
                    budget={budget}
                    isEditing={editingBudgetId === budget.id}
                    isPending={isPending}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </section>
  );
}
