"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
  CircleOff,
  Loader2,
  Receipt,
} from "lucide-react";

import { CraftedIcon, Label, Mono, Serif } from "@/components/crafted";
import { createEntry } from "@/src/actions/entries";
import { FormFieldError } from "@/src/components/shared/form-field-error";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";
import {
  formatMoneyPreview,
  formatMoneyValue,
  getMoneyDelta,
  moneyStringToInput,
  normalizeMoneyInput,
  toHiddenMoneyValue,
} from "@/src/components/entries/entry-form-money";
import type {
  EntryMode,
  EntrySavingContext,
} from "@/src/lib/entry-domain";
import { getRomeTodayDateKey } from "@/src/lib/rome-dates";
import { cn } from "@/lib/utils";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";
import { useStreakCelebrationTrigger } from "@/src/hooks/use-streak-celebration-trigger";
import { triggerHaptic } from "@/src/lib/haptics";
import { trackPostHogEvent } from "@/src/lib/posthog";

const EntryPeopleFields = dynamic(
  () =>
    import("@/src/components/entries/entry-people-fields").then(
      (module) => module.EntryPeopleFields,
    ),
  {
    ssr: false,
    loading: () => null,
  },
);

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
  isFirstEntryCreated?: boolean;
  isFirstEntryOfDay?: boolean;
  streakFrom?: number;
  streakTo?: number;
};

type EntryFormInitialValues = {
  title?: string;
  categoryId?: string;
  mode?: EntryMode;
  savingContext?: EntrySavingContext;
  amountSpent?: string;
  comparisonAmount?: string;
  realCost?: string;
  alternativeCost?: string;
  paidByUserId?: string;
  beneficiaryUserIds?: string[];
  date?: string;
  note?: string;
};

export type CraftedEntryFormProps = {
  categories: CategoryOption[];
  members: WorkspaceMemberOption[];
  initialPaidByUserId: string;
  initialBeneficiaryUserIds: string[];
  returnTo: string;
  initialValues?: EntryFormInitialValues;
};

const initialState: FormState = { success: false, message: "", errors: {} };

function getTodayLocal() {
  return getRomeTodayDateKey();
}

function getInitialComparisonEnabled(initialValues?: EntryFormInitialValues): boolean {
  if (initialValues?.mode === "avoided") {
    return false;
  }

  if (initialValues?.savingContext === "comparison") {
    return true;
  }

  return Boolean(
    initialValues?.comparisonAmount &&
      initialValues.comparisonAmount !== initialValues.amountSpent,
  );
}

function getPrimaryFieldError(errors?: Record<string, string>) {
  return errors?.amountSpent ?? errors?.realCost;
}

function getComparisonFieldError(errors?: Record<string, string>) {
  return errors?.comparisonAmount ?? errors?.alternativeCost;
}

function formatPrimaryFieldLabel(mode: EntryMode) {
  return mode === "avoided" ? "Avresti speso" : "Hai speso";
}

function formatPrimaryPlaceholder(mode: EntryMode) {
  return mode === "avoided" ? "18,00" : "12,00";
}

function getSummaryText(
  mode: EntryMode,
  savingContext: EntrySavingContext,
  amountSpentInput: string,
  comparisonInput: string,
) {
  if (mode === "avoided") {
    return "spesa evitata";
  }

  if (savingContext === "comparison") {
    const delta = getMoneyDelta(amountSpentInput, comparisonInput);

    if (delta > 0) {
      return `${formatMoneyValue(delta)}€ sotto il confronto`;
    }

    if (delta < 0) {
      return `${formatMoneyValue(delta)}€ sopra il confronto`;
    }

    return "in linea con il confronto";
  }

  return "spesa registrata";
}

function getSummaryAmount(
  mode: EntryMode,
  amountSpentInput: string,
  comparisonInput: string,
) {
  return mode === "avoided"
    ? formatMoneyPreview(comparisonInput)
    : formatMoneyPreview(amountSpentInput);
}

export function CraftedEntryForm({
  categories,
  members,
  initialPaidByUserId,
  initialBeneficiaryUserIds,
  returnTo,
  initialValues,
}: CraftedEntryFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const didHandleSuccessRef = useRef(false);
  const redirectTimerRef = useRef<number | null>(null);
  const successTimerRef = useRef<number | null>(null);

  const initialMode = initialValues?.mode === "avoided" ? "avoided" : "spent";
  const initialComparisonEnabled = getInitialComparisonEnabled(initialValues);
  const resolvedInitialPaidByUserId =
    initialValues?.paidByUserId ?? initialPaidByUserId;
  const resolvedInitialBeneficiaryUserIds =
    initialValues?.beneficiaryUserIds ?? initialBeneficiaryUserIds;

  const [successStage, setSuccessStage] = useState<"idle" | "confirming" | "closing">("idle");
  const [mode, setMode] = useState<EntryMode>(initialMode);
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [categoryId, setCategoryId] = useState(initialValues?.categoryId ?? "");
  const [paidByUserId, setPaidByUserId] = useState(resolvedInitialPaidByUserId);
  const [beneficiaryUserIds, setBeneficiaryUserIds] = useState(
    resolvedInitialBeneficiaryUserIds,
  );
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(initialValues?.note?.trim()),
  );
  const [showComparison, setShowComparison] = useState(initialComparisonEnabled);
  const [note, setNote] = useState(initialValues?.note ?? "");
  const [date, setDate] = useState(initialValues?.date ?? getTodayLocal());
  const [amountSpentInput, setAmountSpentInput] = useState(() =>
    moneyStringToInput(initialValues?.amountSpent ?? initialValues?.realCost),
  );
  const [comparisonInput, setComparisonInput] = useState(() =>
    moneyStringToInput(
      initialValues?.comparisonAmount ?? initialValues?.alternativeCost,
    ),
  );

  const redirect = useCallback(() => router.replace(returnTo), [router, returnTo]);
  const { tryTrigger, overlay } = useStreakCelebrationTrigger({ onComplete: redirect });

  const [state, formAction, pending] = useActionState(
    async (_prev: FormState, formData: FormData) => createEntry(formData),
    initialState,
  );

  useEffect(() => {
    if (!state.success) {
      didHandleSuccessRef.current = false;
      return;
    }

    if (didHandleSuccessRef.current) {
      return;
    }

    didHandleSuccessRef.current = true;
    trackPostHogEvent("entry_created");
    if (state.isFirstEntryCreated) {
      trackPostHogEvent("first_entry_created");
    }
    setSuccessStage("confirming");

    if (successTimerRef.current) {
      window.clearTimeout(successTimerRef.current);
    }
    if (redirectTimerRef.current) {
      window.clearTimeout(redirectTimerRef.current);
    }

    const showedCelebration = tryTrigger(state);
    if (!showedCelebration) {
      triggerHaptic("light");
    }

    successTimerRef.current = window.setTimeout(
      () => setSuccessStage("closing"),
      1400,
    );

    if (!showedCelebration) {
      redirectTimerRef.current = window.setTimeout(redirect, 1800);
    }
  }, [redirect, state, tryTrigger]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current);
      }
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const savingContext: EntrySavingContext =
    mode === "avoided" ? "comparison" : showComparison ? "comparison" : "none";
  const primaryFieldError = getPrimaryFieldError(state.errors);
  const comparisonFieldError = getComparisonFieldError(state.errors);
  const hiddenAmountSpent = mode === "spent" ? toHiddenMoneyValue(amountSpentInput) : "";
  const hiddenComparisonAmount =
    mode === "avoided" || showComparison ? toHiddenMoneyValue(comparisonInput) : "";
  const canSubmit =
    title.trim().length > 0 &&
    categoryId.length > 0 &&
    members.length > 0 &&
    categories.length > 0 &&
    !pending &&
    (mode === "avoided"
      ? hiddenComparisonAmount !== "" && hiddenComparisonAmount !== "0.00"
      : hiddenAmountSpent !== "" &&
        hiddenAmountSpent !== "0.00" &&
        (!showComparison || hiddenComparisonAmount !== ""));

  function handleModeChange(nextMode: EntryMode) {
    triggerHaptic("subtle");
    setMode(nextMode);

    if (nextMode === "avoided") {
      setComparisonInput((current) => current || amountSpentInput);
      setShowComparison(false);
      return;
    }

    setAmountSpentInput((current) => current || comparisonInput);
  }

  function toggleComparison() {
    triggerHaptic("subtle");
    setShowComparison((current) => {
      if (current) {
        return false;
      }

      setComparisonInput((prev) => prev || amountSpentInput);
      return true;
    });
  }

  return (
    <>
      {overlay}
      <form
        ref={formRef}
        action={formAction}
        className={cn(
          "-mx-4 flex min-h-[100dvh] flex-col bg-background sm:-mx-6 lg:-mx-8",
          "transition-[opacity,transform,filter] duration-200 ease-out",
          successStage === "closing" && "translate-y-1 opacity-0 blur-[1px]",
        )}
      >
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
        <input type="hidden" name="categoryId" value={categoryId} />
        <input type="hidden" name="paidByUserId" value={paidByUserId} />
        {beneficiaryUserIds.map((id) => (
          <input key={id} type="hidden" name="beneficiaryUserIds" value={id} />
        ))}

        <div className="flex items-center justify-between px-5 pb-1.5 pt-3">
          <Link
            href={returnTo}
            className="text-sm text-muted-foreground transition-opacity hover:opacity-80"
          >
            Annulla
          </Link>
          <Label>Nuovo movimento</Label>
          <div className="w-14" aria-hidden="true" />
        </div>

        {state.message && !state.success ? (
          <div
            className="mx-5 mb-3 border border-destructive/30 px-4 py-3 text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {state.message}
          </div>
        ) : null}

        <div className="px-5 pb-4 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleModeChange("spent")}
              className={cn(
                "flex min-h-12 items-center justify-center gap-2 border-b-[1.5px] px-3 py-2 text-sm transition-colors",
                mode === "spent"
                  ? "border-accent text-foreground"
                  : "border-transparent text-ink-3 hover:text-foreground",
              )}
              aria-pressed={mode === "spent"}
            >
              <Receipt className="size-4" aria-hidden="true" />
              Ho speso
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("avoided")}
              className={cn(
                "flex min-h-12 items-center justify-center gap-2 border-b-[1.5px] px-3 py-2 text-sm transition-colors",
                mode === "avoided"
                  ? "border-accent text-foreground"
                  : "border-transparent text-ink-3 hover:text-foreground",
              )}
              aria-pressed={mode === "avoided"}
            >
              <CircleOff className="size-4" aria-hidden="true" />
              Non l&apos;ho comprato
            </button>
          </div>
        </div>

        <section className="px-5 pb-5 pt-2 text-center">
          {successStage !== "idle" ? (
            <div className="flex flex-col items-center gap-4">
              <CraftedIcon
                name="check"
                size={28}
                className="text-green"
                strokeWidth={2}
              />
              <div className="flex items-baseline gap-2">
                <Mono className="text-[clamp(3rem,16vw,4.5rem)] font-semibold leading-none text-accent">
                  {getSummaryAmount(mode, amountSpentInput, comparisonInput)}
                </Mono>
                <Mono className="text-[26px] text-muted-foreground">€</Mono>
              </div>
              <p className="text-[15px] font-semibold">Movimento salvato</p>
            </div>
          ) : (
            <>
              <Serif className="mb-3 text-[16px] text-muted-foreground">
                {mode === "avoided" ? "stai evitando una spesa" : "stai registrando una spesa"}
              </Serif>
              <div className="flex items-baseline justify-center gap-2">
                <Mono className="text-[clamp(3rem,16vw,5rem)] font-semibold leading-[0.9] text-accent">
                  {getSummaryAmount(mode, amountSpentInput, comparisonInput)}
                </Mono>
                <Mono className="text-[28px] text-muted-foreground">€</Mono>
              </div>
              <p className="mt-3 text-[12.5px] text-ink-3">
                {getSummaryText(
                  mode,
                  savingContext,
                  amountSpentInput,
                  comparisonInput,
                )}
              </p>
            </>
          )}
        </section>

        <div className="px-5 pb-2">
          <Label className="mb-3 block">Categoria</Label>
          <div className="flex gap-5 overflow-x-auto pb-1">
            {categories.map((cat) => {
              const selected = categoryId === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={cn(
                    "flex shrink-0 flex-col items-center gap-2 border-b-[1.5px] pb-2 transition-colors",
                    selected ? "border-accent" : "border-transparent",
                  )}
                >
                  <CraftedIcon
                    name={getCategoryCraftedIcon(cat)}
                    size={22}
                    className={selected ? "text-accent" : "text-muted-foreground"}
                  />
                  <span
                    className={cn(
                      "whitespace-nowrap text-[11.5px]",
                      selected
                        ? "font-semibold text-foreground"
                        : "font-[450] text-ink-3",
                    )}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
          <FormFieldError message={state.errors?.categoryId} />
        </div>

        <div className="px-5 pb-3">
          <div className="flex items-center justify-between gap-4 border-y border-line py-3">
            <input
              type="text"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={mode === "avoided" ? "Delivery" : "Pranzo"}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-ink-3/70"
              aria-invalid={Boolean(state.errors?.title)}
            />
            <Label>Cosa</Label>
          </div>
          <FormFieldError message={state.errors?.title} />
        </div>

        <div className="space-y-3 px-5 pb-3">
          <div className="border-y border-line py-3">
            <label className="flex items-center justify-between gap-4">
              <input
                type="text"
                inputMode="decimal"
                value={mode === "avoided" ? comparisonInput : amountSpentInput}
                onChange={(event) => {
                  const nextValue = normalizeMoneyInput(event.target.value);
                  if (mode === "avoided") {
                    setComparisonInput(nextValue);
                    return;
                  }
                  setAmountSpentInput(nextValue);
                }}
                placeholder={formatPrimaryPlaceholder(mode)}
                className="min-w-0 flex-1 bg-transparent font-num text-sm text-foreground outline-none placeholder:text-ink-3/70"
                aria-invalid={Boolean(primaryFieldError)}
              />
              <Label>{formatPrimaryFieldLabel(mode)}</Label>
            </label>
            <FormFieldError message={primaryFieldError} className="mt-2 text-xs" />
          </div>

          {mode === "spent" ? (
            <>
              <button
                type="button"
                onClick={toggleComparison}
                className="flex w-full items-center justify-center gap-1.5 text-[13px] text-ink-3 transition-colors hover:text-foreground"
              >
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform duration-200",
                    showComparison && "rotate-180",
                  )}
                  aria-hidden="true"
                />
                {showComparison ? "Nascondi confronto" : "Aggiungi confronto"}
              </button>

              {showComparison ? (
                <div className="border-y border-line py-3">
                  <label className="flex items-center justify-between gap-4">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={comparisonInput}
                      onChange={(event) =>
                        setComparisonInput(normalizeMoneyInput(event.target.value))
                      }
                      placeholder="45,00"
                      className="min-w-0 flex-1 bg-transparent font-num text-sm text-foreground outline-none placeholder:text-ink-3/70"
                      aria-invalid={Boolean(comparisonFieldError)}
                    />
                    <Label>Quanto sarebbe costato</Label>
                  </label>
                  <p className="mt-2 text-xs text-ink-3">
                    Serve solo se vuoi confrontare la spesa con un importo di riferimento.
                  </p>
                  <FormFieldError
                    message={comparisonFieldError}
                    className="mt-2 text-xs"
                  />
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-[13px] text-ink-3">
              Registriamo una spesa evitata: non verrà contato nulla come speso.
            </p>
          )}
        </div>

        <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] pt-1.5">
          <button
            type="button"
            onClick={() => setShowAdvanced((value) => !value)}
            className="mb-4 flex w-full items-center justify-center gap-1.5 text-[13px] text-ink-3 transition-colors hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform duration-200",
                showAdvanced && "rotate-180",
              )}
              aria-hidden="true"
            />
            {showAdvanced ? "Nascondi dettagli" : "Data, nota e ripartizione"}
          </button>

          {showAdvanced ? (
            <div className="mb-5 space-y-4 border-t border-line pt-4">
              <div className="space-y-2 border-b border-line pb-3">
                <Label>Data</Label>
                <input
                  type="date"
                  name="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-full bg-transparent py-2 text-sm text-foreground outline-none"
                />
                <FormFieldError message={state.errors?.date} className="text-xs" />
              </div>

              <div className="space-y-2 border-b border-line pb-3">
                <Label>Nota</Label>
                <textarea
                  name="note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Pasta al tonno invece di delivery"
                  rows={2}
                  className="w-full resize-none bg-transparent py-2 text-sm text-foreground outline-none placeholder:text-ink-3/70"
                />
              </div>

              <EntryPeopleFields
                members={members}
                paidByUserId={paidByUserId}
                beneficiaryUserIds={beneficiaryUserIds}
                errors={state.errors}
                onPaidByUserIdChange={setPaidByUserId}
                onBeneficiaryUserIdsChange={setBeneficiaryUserIds}
              />
            </div>
          ) : (
            <input type="hidden" name="date" value={date} />
          )}

          {!showAdvanced && note.trim() ? (
            <input type="hidden" name="note" value={note} />
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl text-[15.5px] font-bold",
              "transition-[opacity,transform,background-color] duration-200",
              canSubmit
                ? "bg-accent text-accent-foreground active:scale-[0.98] active:opacity-90"
                : "bg-surface-muted text-ink-3",
            )}
          >
            {pending ? (
              <>
                <Loader2
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                Salvataggio…
              </>
            ) : (
              <>
                Salva movimento
                <ArrowRight className="size-4" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
}
