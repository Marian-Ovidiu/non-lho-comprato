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

function getInitialCategoryIds(
  categories: BudgetCategoryOption[],
  initialBudget?: BudgetSummaryView | null,
): string[] {
  const initial = getInitialCategoryId(categories, initialBudget);
  return initial ? [initial] : [];
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
  const [categoryIds, setCategoryIds] = useState<string[]>(() =>
    getInitialCategoryIds(categories, initialBudget),
  );
  const [budgetErrors, setBudgetErrors] = useState<BudgetFormErrors>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canUseCategory = categories.length > 0;
  const effectiveCategoryIds = useMemo(
    () => (mode === "edit" ? (categoryId ? [categoryId] : []) : categoryIds),
    [categoryId, categoryIds, mode],
  );
  const scopeKey =
    scope === "workspace" ? "workspace" : effectiveCategoryIds[0] || "";
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId) ?? null,
    [categories, categoryId],
  );
  const selectedCategoryNames = useMemo(
    () =>
      categories
        .filter((category) => effectiveCategoryIds.includes(category.id))
        .map((category) => category.name),
    [categories, effectiveCategoryIds],
  );

  function toggleCategory(nextCategoryId: string) {
    setCategoryIds((current) =>
      current.includes(nextCategoryId)
        ? current.filter((value) => value !== nextCategoryId)
        : [...current, nextCategoryId],
    );
  }

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
      for (const selectedCategoryId of effectiveCategoryIds) {
        formData.append("categoryId", selectedCategoryId);
      }
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
                setCategoryIds([categories[0].id]);
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

        {mode === "edit" ? (
          <div className="space-y-2">
            <label htmlFor="budget-category" className="text-sm font-medium leading-none">
              Categoria
            </label>
            <Select
              value={categoryId}
              onValueChange={(value) => {
                setCategoryId(value);
                setCategoryIds([value]);
              }}
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
        ) : (
          <div className="space-y-2">
            <span className="text-sm font-medium leading-none">Categorie</span>
            <div
              className="max-h-40 overflow-y-auto rounded-[var(--r-control)] border border-line p-2"
              role="group"
              aria-label="Categorie budget"
              tabIndex={0}
            >
              {categories.map((category) => {
                const checked = categoryIds.includes(category.id);
                return (
                  <label
                    key={category.id}
                    className="flex min-h-10 cursor-pointer items-center gap-2 rounded-[var(--r-chip)] px-2 text-sm hover:bg-surface-muted"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={scope !== "category" || !canUseCategory}
                      onChange={() => toggleCategory(category.id)}
                      className="size-4 accent-[var(--accent)]"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {category.name}
                      {category.archivedAt ? " (archiviata)" : ""}
                    </span>
                  </label>
                );
              })}
            </div>
            <FormFieldError message={budgetErrors?.categoryId} />
          </div>
        )}
      </div>

      <input type="hidden" name="scopeKey" value={scopeKey} />
      <input type="hidden" name="currency" value={currency} />
      {mode === "edit" && initialBudget ? (
        <input type="hidden" name="budgetId" value={initialBudget.id} />
      ) : null}

      {scope === "category" && mode === "create" && selectedCategoryNames.length > 0 ? (
        <Serif className="block text-xs text-muted-foreground">
          Categorie selezionate: {selectedCategoryNames.join(", ")}
        </Serif>
      ) : selectedCategory && scope === "category" ? (
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
