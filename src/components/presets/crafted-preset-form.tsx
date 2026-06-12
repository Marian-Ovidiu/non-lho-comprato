"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { CircleOff, Loader2, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";

import { Label } from "@/components/crafted";
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

type PresetIntent = "spent" | "comparison" | "avoided";

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
  return (
    initialPreset ?? {
      title: "",
      categoryId: "",
      mode: "spent",
      savingContext: "none",
      amountSpent: "",
      comparisonAmount: "",
      note: "",
    }
  );
}

function shouldShowComparison(initialPreset?: CraftedPresetFormInitialValue) {
  return (
    initialPreset?.mode === "spent" &&
    initialPreset.savingContext === "comparison"
  );
}

function getPresetIntent(
  mode: EntryMode,
  showComparison: boolean,
): PresetIntent {
  if (mode === "avoided") {
    return "avoided";
  }

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
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const didHandleSuccessRef = useRef(false);
  const refresh = useCallback(() => router.refresh(), [router]);
  const initialValue = getInitialFormValue(initialPreset);
  const isEditing = Boolean(initialPreset?.id);
  const [mode, setMode] = useState<EntryMode>(initialValue.mode);
  const [showComparison, setShowComparison] = useState(
    shouldShowComparison(initialPreset),
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
        setMode("spent");
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

  const savingContext: EntrySavingContext =
    mode === "avoided" ? "comparison" : showComparison ? "comparison" : "none";
  const presetIntent = getPresetIntent(mode, showComparison);
  const hiddenAmountSpent =
    mode === "spent" ? toHiddenMoneyValue(amountSpent) : "";
  const hiddenComparisonAmount =
    mode === "avoided" || showComparison ? toHiddenMoneyValue(comparisonAmount) : "";
  const primaryFieldError = getPrimaryFieldError(state.errors);
  const comparisonFieldError = getComparisonFieldError(state.errors);
  const comparisonDelta = getMoneyDelta(amountSpent, comparisonAmount);
  const showLargeComparisonWarning =
    mode === "spent" &&
    showComparison &&
    comparisonAmount.trim().length > 0 &&
    Math.abs(comparisonDelta) >= 100;

  function handleIntentChange(nextIntent: PresetIntent) {
    if (nextIntent === "avoided") {
      setMode("avoided");
      setShowComparison(false);
      setComparisonAmount((current) => current || amountSpent);
      return;
    }

    setMode("spent");
    setAmountSpent((current) => current || comparisonAmount);
    setShowComparison(nextIntent === "comparison");

    if (nextIntent === "comparison") {
      setComparisonAmount((current) => current || amountSpent);
    }
  }

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

      {initialPreset && !initialPreset.id ? (
        <p className="border-y border-line py-3 text-sm leading-6 text-ink-3">
          Stai partendo da un preset di default. Salvandolo crei un preset personale
          modificabile.
        </p>
      ) : null}

      <div className="grid grid-cols-3 gap-2 border-y border-line py-3">
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
          Ho speso
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
          aria-label="Ho speso e voglio confrontarlo"
        >
          <span className="font-num text-sm" aria-hidden="true">
            ↘
          </span>
          Speso + confronto
        </button>
        <button
          type="button"
          onClick={() => handleIntentChange("avoided")}
          className={cn(
            "flex min-h-11 items-center justify-center gap-1.5 border-b px-2 py-2 text-center text-[12.5px] leading-4 transition-colors sm:text-sm",
            presetIntent === "avoided"
              ? "border-accent text-foreground"
              : "border-transparent text-ink-3 hover:text-foreground",
          )}
          aria-pressed={presetIntent === "avoided"}
        >
          <CircleOff className="size-4" aria-hidden="true" />
          Non l&apos;ho comprato
        </button>
      </div>
      <p className="-mt-2 text-xs leading-5 text-ink-3">
        {presetIntent === "spent"
          ? "Preset per una spesa normale."
          : presetIntent === "comparison"
            ? "Usalo quando hai scelto un'opzione più economica."
            : "Segna quanto avresti speso se l'avessi comprato."}
      </p>

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
          <Label>{mode === "avoided" ? "Avresti speso" : "Quanto hai speso"}</Label>
        </div>
        <FieldError message={mode === "avoided" ? comparisonFieldError : primaryFieldError} />
        {mode === "avoided" ? (
          <p className="mt-2 text-xs leading-5 text-ink-3">
            Segna quanto avresti speso se l&apos;avessi comprato.
          </p>
        ) : null}
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
            {showComparison
              ? "Nascondi confronto"
              : "Ho speso e voglio confrontarlo"}
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
                <Label>Quanto avresti speso di solito?</Label>
              </div>
              <p className="mt-2 text-xs leading-5 text-ink-3">
                Usalo quando hai scelto un&apos;opzione più economica.
              </p>
              {showLargeComparisonWarning ? (
                <p className="mt-2 text-xs font-medium leading-5 text-amber-700 dark:text-amber-300">
                  Questo confronto pesa molto sulle statistiche.
                </p>
              ) : null}
              <FieldError message={comparisonFieldError} />
            </>
          ) : null}
        </div>
      ) : null}

      <div className="border-y border-line py-3">
        <textarea
          name="note"
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Spesso capita dopo pranzo"
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
          "Aggiorna preset"
        ) : (
          "Salva preset"
        )}
      </button>
    </form>
  );
}
