"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleOff, Receipt } from "lucide-react";

import { createPreset } from "@/src/actions/presets";
import { toHiddenMoneyValue } from "@/src/components/entries/entry-form-money";
import type { EntryMode, EntrySavingContext } from "@/src/lib/entry-domain";
import { useTranslations } from "@/src/components/language/language-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
};

type FormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
};

type PresetFormProps = {
  categories: CategoryOption[];
};

const initialState: FormState = {
  success: false,
  message: "",
  errors: {},
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-destructive">{message}</p>;
}

function getPrimaryFieldError(errors?: Record<string, string>) {
  return errors?.amountSpent ?? errors?.realCost;
}

function getComparisonFieldError(errors?: Record<string, string>) {
  return errors?.comparisonAmount ?? errors?.alternativeCost;
}

export function PresetForm({ categories }: PresetFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const didHandleSuccessRef = useRef(false);
  const refresh = useCallback(() => router.refresh(), [router]);
  const [mode, setMode] = useState<EntryMode>("spent");
  const [showComparison, setShowComparison] = useState(false);
  const [amountSpent, setAmountSpent] = useState("");
  const [comparisonAmount, setComparisonAmount] = useState("");
  const [state, formAction, pending] = useActionState(
    async (_previousState: FormState, formData: FormData) => {
      return createPreset(formData);
    },
    initialState,
  );

  const hasCategories = categories.length > 0;

  useEffect(() => {
    if (!state.success) {
      didHandleSuccessRef.current = false;
      return;
    }

    if (didHandleSuccessRef.current) {
      return;
    }

    didHandleSuccessRef.current = true;

    formRef.current?.reset();
    setMode("spent");
    setShowComparison(false);
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
    <Card className="border-border shadow-sm">
      <CardHeader className="space-y-2 p-5 pb-0 sm:p-6">
        <CardTitle>{t.preset.newPresetTitle}</CardTitle>
        <CardDescription>{t.preset.newPresetDesc}</CardDescription>
      </CardHeader>

      <form ref={formRef} action={formAction}>
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

        <CardContent className="space-y-5 p-5 sm:p-6">
          {state.message ? (
            <div
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm leading-6",
                state.success
                  ? "border-success/20 bg-success/10 text-success"
                  : "border-destructive/20 bg-destructive/10 text-destructive",
              )}
            >
              {state.message}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("spent");
                    setAmountSpent((current) => current || comparisonAmount);
                  }}
                  className={cn(
                    "flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                    mode === "spent"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-surface-muted",
                  )}
                >
                  <Receipt className="size-4" aria-hidden="true" />
                  {t.preset.intentSpent}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("avoided");
                    setShowComparison(false);
                    setComparisonAmount((current) => current || amountSpent);
                  }}
                  className={cn(
                    "flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                    mode === "avoided"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-surface-muted",
                  )}
                >
                  <CircleOff className="size-4" aria-hidden="true" />
                  {t.preset.intentAvoided}
                </button>
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">{t.preset.titleLabel}</Label>
              <Input
                id="title"
                name="title"
                placeholder={mode === "avoided" ? t.preset.titlePlaceholderAvoided : t.preset.titlePlaceholderSpent}
                autoComplete="off"
                aria-invalid={Boolean(state.errors?.title)}
              />
              <FieldError message={state.errors?.title} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="categoryId">{t.preset.categoryLabel}</Label>
              <select
                id="categoryId"
                name="categoryId"
                defaultValue=""
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:border-border focus-visible:ring-2 focus-visible:ring-border/40"
                aria-invalid={Boolean(state.errors?.categoryId)}
              >
                <option value="" disabled>
                  {hasCategories ? t.preset.selectCategory : t.preset.noCategoriesAvailable}
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <FieldError message={state.errors?.categoryId} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="primaryAmount">
                {mode === "avoided" ? t.preset.wouldHaveSpent : t.preset.youSpent}
              </Label>
              <Input
                id="primaryAmount"
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
                placeholder={mode === "avoided" ? t.preset.amountPlaceholderAvoided : t.preset.amountPlaceholderSpent}
                aria-invalid={Boolean(mode === "avoided" ? comparisonFieldError : primaryFieldError)}
              />
              <FieldError message={mode === "avoided" ? comparisonFieldError : primaryFieldError} />
            </div>

            {mode === "spent" ? (
              <div className="space-y-2 sm:col-span-2">
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
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showComparison ? t.preset.hideComparison : t.preset.addComparison}
                </button>

                {showComparison ? (
                  <>
                    <Label htmlFor="comparisonAmount">{t.preset.comparisonLabel}</Label>
                    <Input
                      id="comparisonAmount"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={comparisonAmount}
                      onChange={(event) => setComparisonAmount(event.target.value)}
                      placeholder={t.preset.comparisonPlaceholder}
                      aria-invalid={Boolean(comparisonFieldError)}
                    />
                    <FieldError message={comparisonFieldError} />
                  </>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="note">{t.preset.noteLabel}</Label>
              <Textarea
                id="note"
                name="note"
                placeholder={t.preset.notePlaceholder}
                className="min-h-24"
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-end border-t border-border bg-surface-muted/50 p-5 sm:p-6">
          <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
            {pending ? t.preset.savingButton : t.preset.saveButton}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
