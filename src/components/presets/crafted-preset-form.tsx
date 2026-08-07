"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";

import { Label } from "@/components/crafted";
import { useTranslations } from "@/src/components/language/language-context";
import { createPreset, updatePreset } from "@/src/actions/presets";
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

export type CraftedPresetFormInitialValue = {
  id?: string;
  title: string;
  categoryId: string;
  mode: EntryMode;
  savingContext: EntrySavingContext;
  amountSpent: string;
  comparisonAmount: string;
  note: string;
};

type PresetIntent = "spent" | "comparison";

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

function getInitialFormValue(
  initialPreset?: CraftedPresetFormInitialValue,
): CraftedPresetFormInitialValue {
  if (!initialPreset) {
    return {
      title: "",
      categoryId: "",
      mode: "spent",
      savingContext: "none",
      amountSpent: "",
      comparisonAmount: "",
      note: "",
    };
  }

  // Presets stored before the real-spend-only rule carry a zero real cost. Reopen
  // them as a comparison with the spent amount blank: the alternative is still
  // useful, but saving now requires a real cost the user has actually paid. The
  // stored preset is left untouched until the user saves.
  if (initialPreset.mode === "avoided") {
    return {
      ...initialPreset,
      mode: "spent",
      savingContext: "comparison",
      amountSpent: "",
    };
  }

  return initialPreset;
}

function shouldShowComparison(initialValue: CraftedPresetFormInitialValue) {
  return initialValue.savingContext === "comparison";
}

function getPresetIntent(showComparison: boolean): PresetIntent {
  return showComparison ? "comparison" : "spent";
}

function getMoneyDelta(amountSpent: string, comparisonAmount: string): number {
  const amount = Number(amountSpent.replace(",", "."));
  const comparison = Number(comparisonAmount.replace(",", "."));

  if (!Number.isFinite(amount) || !Number.isFinite(comparison)) {
    return 0;
  }

  return Math.round((comparison - amount + Number.EPSILON) * 100) / 100;
}

export function CraftedPresetForm({
  categories,
  initialPreset,
}: {
  categories: CategoryOption[];
  initialPreset?: CraftedPresetFormInitialValue;
}) {
  const t = useTranslations();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const didHandleSuccessRef = useRef(false);
  const refresh = useCallback(() => router.refresh(), [router]);
  const initialValue = getInitialFormValue(initialPreset);
  const isEditing = Boolean(initialPreset?.id);
  const [showComparison, setShowComparison] = useState(
    shouldShowComparison(initialValue),
  );
  const [title, setTitle] = useState(initialValue.title);
  const [categoryId, setCategoryId] = useState(initialValue.categoryId);
  const [amountSpent, setAmountSpent] = useState(initialValue.amountSpent);
  const [comparisonAmount, setComparisonAmount] = useState(
    initialValue.comparisonAmount,
  );
  const [note, setNote] = useState(initialValue.note);
  const [state, formAction, pending] = useActionState(
    async (_previousState: FormState, formData: FormData) =>
      initialPreset?.id
        ? updatePreset(initialPreset.id, formData)
        : createPreset(formData),
    initialState,
  );

  useEffect(() => {
    if (!state.success) {
      didHandleSuccessRef.current = false;
      return;
    }

    if (didHandleSuccessRef.current) return;
    didHandleSuccessRef.current = true;

    let frameId: number | null = null;

    if (!isEditing) {
      frameId = window.requestAnimationFrame(() => {
        formRef.current?.reset();
        setShowComparison(false);
        setTitle("");
        setCategoryId("");
        setAmountSpent("");
        setComparisonAmount("");
        setNote("");
      });
    }

    refresh();

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [isEditing, refresh, state]);

  const savingContext: EntrySavingContext = showComparison
    ? "comparison"
    : "none";
  const presetIntent = getPresetIntent(showComparison);
  const hiddenAmountSpent = toHiddenMoneyValue(amountSpent);
  const hiddenComparisonAmount = showComparison
    ? toHiddenMoneyValue(comparisonAmount)
    : "";
  const primaryFieldError = getPrimaryFieldError(state.errors);
  const comparisonFieldError = getComparisonFieldError(state.errors);
  const comparisonDelta = getMoneyDelta(amountSpent, comparisonAmount);
  const showLargeComparisonWarning =
    showComparison &&
    comparisonAmount.trim().length > 0 &&
    Math.abs(comparisonDelta) >= 100;

  function handleIntentChange(nextIntent: PresetIntent) {
    setShowComparison(nextIntent === "comparison");

    if (nextIntent === "comparison") {
      setComparisonAmount((current) => current || amountSpent);
    }
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="mode" value="spent" />
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

      {initialPreset && !initialPreset.id ? (
        <p className="border-y border-line py-3 text-sm leading-6 text-ink-3">
          {t.preset.defaultPresetInfo}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 border-y border-line py-3">
        <button
          type="button"
          onClick={() => handleIntentChange("spent")}
          className={cn(
            "flex min-h-11 items-center justify-center gap-1.5 border-b px-2 py-2 text-center text-[12.5px] leading-4 transition-colors sm:text-sm",
            presetIntent === "spent"
              ? "border-accent text-foreground"
              : "border-transparent text-ink-3 hover:text-foreground",
          )}
          aria-pressed={presetIntent === "spent"}
        >
          <Receipt className="size-4" aria-hidden="true" />
          {t.preset.intentSpent}
        </button>
        <button
          type="button"
          onClick={() => handleIntentChange("comparison")}
          className={cn(
            "flex min-h-11 items-center justify-center gap-1.5 border-b px-2 py-2 text-center text-[12.5px] leading-4 transition-colors sm:text-sm",
            presetIntent === "comparison"
              ? "border-accent text-foreground"
              : "border-transparent text-ink-3 hover:text-foreground",
          )}
          aria-pressed={presetIntent === "comparison"}
          aria-label={t.preset.intentComparisonAria}
        >
          <span className="font-num text-sm" aria-hidden="true">↘</span>
          {t.preset.intentComparison}
        </button>
      </div>
      <p className="-mt-2 text-xs leading-5 text-ink-3">
        {presetIntent === "spent"
          ? t.preset.intentSpentDesc
          : t.preset.intentComparisonDesc}
      </p>

      <div className="border-y border-line py-3">
        <label htmlFor="preset-title" className="flex items-center justify-between gap-4">
          <input
            id="preset-title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t.preset.titlePlaceholderSpent}
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3/70"
          />
          <Label>{t.preset.titleLabel}</Label>
        </label>
        <FieldError message={state.errors?.title} />
      </div>

      <div className="border-y border-line py-3">
        <label htmlFor="preset-categoryId" className="flex items-center justify-between gap-4">
          <select
            id="preset-categoryId"
            name="categoryId"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          >
            <option value="" disabled>
              {t.preset.categoryPlaceholder}
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <Label>{t.preset.categoryLabel}</Label>
        </label>
        <FieldError message={state.errors?.categoryId} />
      </div>

      <div className="border-y border-line py-3">
        <label htmlFor="preset-amount" className="flex items-center justify-between gap-4">
          <input
            id="preset-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amountSpent}
            onChange={(event) => setAmountSpent(event.target.value)}
            placeholder={t.preset.amountPlaceholderSpent}
            className="min-w-0 flex-1 bg-transparent font-num text-sm outline-none"
          />
          <Label>{t.preset.amountSpentLabel}</Label>
        </label>
        <FieldError message={primaryFieldError} />
      </div>

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
          {showComparison ? t.preset.hideComparison : t.preset.showComparison}
        </button>

        {showComparison ? (
          <>
            <label htmlFor="preset-comparison-amount" className="mt-3 flex items-center justify-between gap-4">
              <input
                id="preset-comparison-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={comparisonAmount}
                onChange={(event) => setComparisonAmount(event.target.value)}
                placeholder={t.preset.comparisonPlaceholder}
                className="min-w-0 flex-1 bg-transparent font-num text-sm outline-none"
              />
              <Label>{t.preset.comparisonLabel}</Label>
            </label>
            <p className="mt-2 text-xs leading-5 text-ink-3">
              {t.preset.intentComparisonDesc}
            </p>
            {showLargeComparisonWarning ? (
              <p className="mt-2 text-xs font-medium leading-5 text-nlc-warn">
                {t.preset.largeComparisonWarning}
              </p>
            ) : null}
            <FieldError message={comparisonFieldError} />
          </>
        ) : null}
      </div>

      <div className="border-y border-line py-3">
        <textarea
          name="note"
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t.preset.notePlaceholder}
          className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-ink-3/70"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[15.5px] font-bold text-accent-foreground disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : isEditing ? (
          t.preset.updateButton
        ) : (
          t.preset.saveButton
        )}
      </button>
    </form>
  );
}
