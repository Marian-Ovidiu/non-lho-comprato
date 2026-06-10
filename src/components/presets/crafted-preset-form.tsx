"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { CircleOff, Loader2, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";

import { Label } from "@/components/crafted";
import { createPreset } from "@/src/actions/presets";
import { toHiddenMoneyValue } from "@/src/components/entries/entry-form-money";
import type { EntryMode, EntrySavingContext } from "@/src/lib/entry-domain";
import { cn } from "@/lib/utils";

type CategoryOption = {
  id: string;
  name: string;
};

type FormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
};

const initialState: FormState = { success: false, message: "", errors: {} };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 text-sm text-destructive">{message}</p>;
}

function getPrimaryFieldError(errors?: Record<string, string>) {
  return errors?.amountSpent ?? errors?.realCost;
}

function getComparisonFieldError(errors?: Record<string, string>) {
  return errors?.comparisonAmount ?? errors?.alternativeCost;
}

export function CraftedPresetForm({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const didHandleSuccessRef = useRef(false);
  const refresh = useCallback(() => router.refresh(), [router]);
  const [mode, setMode] = useState<EntryMode>("spent");
  const [showComparison, setShowComparison] = useState(false);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amountSpent, setAmountSpent] = useState("");
  const [comparisonAmount, setComparisonAmount] = useState("");
  const [state, formAction, pending] = useActionState(
    async (_previousState: FormState, formData: FormData) => createPreset(formData),
    initialState,
  );

  useEffect(() => {
    if (!state.success) {
      didHandleSuccessRef.current = false;
      return;
    }

    if (didHandleSuccessRef.current) return;
    didHandleSuccessRef.current = true;
    formRef.current?.reset();
    setMode("spent");
    setShowComparison(false);
    setTitle("");
    setCategoryId("");
    setAmountSpent("");
    setComparisonAmount("");
    refresh();
  }, [refresh, state]);

  const savingContext: EntrySavingContext =
    mode === "avoided" ? "comparison" : showComparison ? "comparison" : "none";
  const hiddenAmountSpent =
    mode === "spent" ? toHiddenMoneyValue(amountSpent) : "";
  const hiddenComparisonAmount =
    mode === "avoided" || showComparison ? toHiddenMoneyValue(comparisonAmount) : "";
  const primaryFieldError = getPrimaryFieldError(state.errors);
  const comparisonFieldError = getComparisonFieldError(state.errors);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="savingContext" value={savingContext} />
      {hiddenAmountSpent ? (
        <input type="hidden" name="amountSpent" value={hiddenAmountSpent} />
      ) : null}
      {hiddenComparisonAmount ? (
        <input
          type="hidden"
          name="comparisonAmount"
          value={hiddenComparisonAmount}
        />
      ) : null}

      {state.message ? (
        <div
          className={cn(
            "border px-4 py-3 text-sm",
            state.success ? "border-green/30 text-green" : "border-destructive/30 text-destructive",
          )}
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 border-y border-line py-3">
        <button
          type="button"
          onClick={() => {
            setMode("spent");
            setAmountSpent((current) => current || comparisonAmount);
          }}
          className={cn(
            "flex min-h-11 items-center justify-center gap-2 border-b px-3 py-2 text-sm transition-colors",
            mode === "spent"
              ? "border-accent text-foreground"
              : "border-transparent text-ink-3 hover:text-foreground",
          )}
        >
          <Receipt className="size-4" aria-hidden="true" />
          Ho speso
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("avoided");
            setShowComparison(false);
            setComparisonAmount((current) => current || amountSpent);
          }}
          className={cn(
            "flex min-h-11 items-center justify-center gap-2 border-b px-3 py-2 text-sm transition-colors",
            mode === "avoided"
              ? "border-accent text-foreground"
              : "border-transparent text-ink-3 hover:text-foreground",
          )}
        >
          <CircleOff className="size-4" aria-hidden="true" />
          Non l&apos;ho comprato
        </button>
      </div>

      <div className="border-y border-line py-3">
        <div className="flex items-center justify-between gap-4">
          <input
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={mode === "avoided" ? "Delivery" : "Pranzo"}
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3/70"
          />
          <Label>Titolo</Label>
        </div>
        <FieldError message={state.errors?.title} />
      </div>

      <div className="border-y border-line py-3">
        <div className="flex items-center justify-between gap-4">
          <select
            name="categoryId"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          >
            <option value="" disabled>
              Categoria
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <Label>Categoria</Label>
        </div>
        <FieldError message={state.errors?.categoryId} />
      </div>

      <div className="border-y border-line py-3">
        <div className="flex items-center justify-between gap-4">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={mode === "avoided" ? comparisonAmount : amountSpent}
            onChange={(event) => {
              if (mode === "avoided") {
                setComparisonAmount(event.target.value);
                return;
              }

              setAmountSpent(event.target.value);
            }}
            placeholder={mode === "avoided" ? "18,00" : "12,00"}
            className="min-w-0 flex-1 bg-transparent font-num text-sm outline-none"
          />
          <Label>{mode === "avoided" ? "Avresti speso" : "Hai speso"}</Label>
        </div>
        <FieldError message={mode === "avoided" ? comparisonFieldError : primaryFieldError} />
      </div>

      {mode === "spent" ? (
        <div className="border-y border-line py-3">
          <button
            type="button"
            onClick={() => {
              setShowComparison((current) => {
                if (current) {
                  return false;
                }

                setComparisonAmount((prev) => prev || amountSpent);
                return true;
              });
            }}
            className="w-full text-left text-[13px] text-ink-3 transition-colors hover:text-foreground"
          >
            {showComparison ? "Nascondi confronto" : "Aggiungi confronto"}
          </button>

          {showComparison ? (
            <>
              <div className="mt-3 flex items-center justify-between gap-4">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={comparisonAmount}
                  onChange={(event) => setComparisonAmount(event.target.value)}
                  placeholder="45,00"
                  className="min-w-0 flex-1 bg-transparent font-num text-sm outline-none"
                />
                <Label>Confronto</Label>
              </div>
              <FieldError message={comparisonFieldError} />
            </>
          ) : null}
        </div>
      ) : null}

      <div className="border-y border-line py-3">
        <textarea
          name="note"
          rows={2}
          placeholder="Spesso capita dopo pranzo"
          className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-ink-3/70"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[15.5px] font-bold text-accent-foreground disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : "Salva preset"}
      </button>
    </form>
  );
}
