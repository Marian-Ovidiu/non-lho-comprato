"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Serif } from "@/components/crafted";
import { FormFieldError } from "@/src/components/shared/form-field-error";
import { createBudgetAction, updateBudgetAction } from "@/src/actions/budgets";
import type { BudgetCategoryOption, BudgetSummaryView } from "@/src/lib/budget-summary";
import type { BudgetPeriod, BudgetScope } from "@/src/lib/budget-model";

type BudgetFormErrors = Record<string, string> | null;

type CraftedBudgetFormProps = {
  mode: "create" | "edit";
  currency: string;
  categories: BudgetCategoryOption[];
  initialBudget?: BudgetSummaryView | null;
  onSaved: () => void;
  onCancel?: () => void;
};

function getInitialScope(initialBudget?: BudgetSummaryView | null): BudgetScope {
  return initialBudget?.scope ?? "workspace";
}

function getInitialPeriod(initialBudget?: BudgetSummaryView | null): BudgetPeriod {
  return initialBudget?.period ?? "monthly";
}

function getInitialCategoryId(
  categories: BudgetCategoryOption[],
  initialBudget?: BudgetSummaryView | null,
): string {
  if (initialBudget?.categoryId) {
    return initialBudget.categoryId;
  }

  return categories[0]?.id ?? "";
}

export function CraftedBudgetForm({
  mode,
  currency,
  categories,
  initialBudget,
  onSaved,
  onCancel,
}: CraftedBudgetFormProps) {
  const router = useRouter();
  const [scope, setScope] = useState<BudgetScope>(getInitialScope(initialBudget));
  const [period, setPeriod] = useState<BudgetPeriod>(getInitialPeriod(initialBudget));
  const [amount, setAmount] = useState(initialBudget ? initialBudget.budgetAmount.toFixed(2) : "");
  const [categoryId, setCategoryId] = useState(getInitialCategoryId(categories, initialBudget));
  const [budgetErrors, setBudgetErrors] = useState<BudgetFormErrors>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canUseCategory = categories.length > 0;
  const scopeKey =
    scope === "workspace" ? "workspace" : categoryId || categories[0]?.id || "";
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId) ?? null,
    [categories, categoryId],
  );

  async function submitBudget(
    action: (formData: FormData) => Promise<{ success: boolean; message: string; errors?: BudgetFormErrors }>,
  ) {
    const formData = new FormData();
    formData.set("scope", scope);
    formData.set("period", period);
    formData.set("amount", amount);
    formData.set("scopeKey", scopeKey);
    formData.set("currency", currency);
    if (scope === "category") {
      formData.set("categoryId", categoryId);
    }
    if (mode === "edit" && initialBudget) {
      formData.set("budgetId", initialBudget.id);
    }

    const result = await action(formData);
    setBudgetErrors(result.errors ?? null);
    setMessage(result.message);

    if (result.success) {
      onSaved();
      router.refresh();
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBudgetErrors(null);
    setMessage(null);
    startTransition(async () => {
      await submitBudget(mode === "edit" ? updateBudgetAction : createBudgetAction);
    });
  }

  const title =
    mode === "edit" && initialBudget
      ? `Modifica ${initialBudget.title}`
      : "Nuovo budget";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-y border-line py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label className="mb-2 block">Budget</Label>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        </div>
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Annulla
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="budget-period" className="text-sm font-medium leading-none">
            Periodo
          </label>
          <Select value={period} onValueChange={(value) => setPeriod(value as BudgetPeriod)}>
            <SelectTrigger id="budget-period" className="w-full">
              <SelectValue placeholder="Seleziona periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Settimanale</SelectItem>
              <SelectItem value="monthly">Mensile</SelectItem>
            </SelectContent>
          </Select>
          <FormFieldError message={budgetErrors?.period} />
        </div>

        <div className="space-y-2">
          <label htmlFor="budget-amount" className="text-sm font-medium leading-none">
            Importo
          </label>
          <Input
            id="budget-amount"
            name="amount"
            inputMode="decimal"
            placeholder={`es. 120 ${currency}`}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <FormFieldError message={budgetErrors?.amount} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="budget-scope" className="text-sm font-medium leading-none">
            Ambito
          </label>
          <Select
            value={scope}
            onValueChange={(value) => {
              const nextScope = value as BudgetScope;
              setScope(nextScope);

              if (nextScope === "category" && !categoryId && categories[0]) {
                setCategoryId(categories[0].id);
              }
            }}
          >
            <SelectTrigger id="budget-scope" className="w-full">
              <SelectValue placeholder="Seleziona ambito" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="workspace">Tutte le categorie</SelectItem>
              <SelectItem value="category" disabled={!canUseCategory}>
                Categoria specifica
              </SelectItem>
            </SelectContent>
          </Select>
          <FormFieldError message={budgetErrors?.scope} />
        </div>

        <div className="space-y-2">
          <label htmlFor="budget-category" className="text-sm font-medium leading-none">
            Categoria
          </label>
          <Select
            value={categoryId}
            onValueChange={(value) => setCategoryId(value)}
            disabled={scope !== "category" || !canUseCategory}
          >
            <SelectTrigger id="budget-category" className="w-full">
              <SelectValue placeholder={canUseCategory ? "Seleziona categoria" : "Nessuna categoria disponibile"} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                  {category.archivedAt ? " (archiviata)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormFieldError message={budgetErrors?.categoryId} />
        </div>
      </div>

      <input type="hidden" name="scopeKey" value={scopeKey} />
      <input type="hidden" name="currency" value={currency} />
      {mode === "edit" && initialBudget ? (
        <input type="hidden" name="budgetId" value={initialBudget.id} />
      ) : null}

      {selectedCategory && scope === "category" ? (
        <Serif className="block text-xs text-muted-foreground">
          Categoria selezionata: {selectedCategory.name}
        </Serif>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isPending} className="h-10 rounded-[var(--r-cta)] px-4">
          {mode === "edit" ? "Aggiorna budget" : "Crea budget"}
        </Button>
        {message ? (
          <Serif className="text-sm text-muted-foreground">{message}</Serif>
        ) : null}
      </div>
    </form>
  );
}
