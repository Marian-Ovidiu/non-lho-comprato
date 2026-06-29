"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
  Loader2,
  Receipt,
  Users2,
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
import { getBrowserTodayDateKey } from "@/src/lib/workspace-dates";
import { cn } from "@/lib/utils";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";
import { useStreakCelebrationTrigger } from "@/src/hooks/use-streak-celebration-trigger";
import { triggerHaptic } from "@/src/lib/haptics";
import { trackPostHogEvent } from "@/src/lib/posthog";
import { useCurrencySymbol } from "@/src/components/currency/currency-context";
import { useTranslations } from "@/src/components/language/language-context";
import {
  normalizeEntryPaymentMode,
  type EntryPaymentModeValue,
} from "@/src/lib/entry-payment-mode";

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
  paymentMode?: EntryPaymentModeValue;
  date?: string;
  note?: string;
};

type EntryIntent = "spent" | "comparison" | "joint";

export type CraftedEntryFormProps = {
  categories: CategoryOption[];
  members: WorkspaceMemberOption[];
  initialPaidByUserId: string;
  initialBeneficiaryUserIds: string[];
  returnTo: string;
  initialValues?: EntryFormInitialValues;
};

const initialState: FormState = { success: false, message: "", errors: {} };

// How long the "Movimento salvato" confirmation stays visible before the form
// fades out, and when the return navigation fires. Kept short on purpose: the
// destination is prefetched during this window so the transition feels instant.
const CONFIRMATION_VISIBLE_MS = 600;
const REDIRECT_DELAY_MS = 800;

function getTodayLocal() {
  return getBrowserTodayDateKey();
}

function getInitialComparisonEnabled(initialValues?: EntryFormInitialValues): boolean {
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

function getSummaryText(
  savingContext: EntrySavingContext,
  amountSpentInput: string,
  comparisonInput: string,
  currencySymbol: string,
  tForm: { summarySaved: (a: string) => string; summarySpentMore: (a: string) => string; summaryInline: string; expenseRecorded: string },
) {
  if (savingContext === "comparison") {
    const delta = getMoneyDelta(amountSpentInput, comparisonInput);

    if (delta > 0) {
      return tForm.summarySaved(`${formatMoneyValue(delta)}${currencySymbol}`);
    }

    if (delta < 0) {
      return tForm.summarySpentMore(`${formatMoneyValue(Math.abs(delta))}${currencySymbol}`);
    }

    return tForm.summaryInline;
  }

  return tForm.expenseRecorded;
}

function getEntryIntent(
  showComparison: boolean,
  paymentMode: EntryPaymentModeValue,
): EntryIntent {
  if (paymentMode === "joint_account") {
    return "joint";
  }

  return showComparison ? "comparison" : "spent";
}

function getSummaryAmount(amountSpentInput: string) {
  return formatMoneyPreview(amountSpentInput);
}

export function CraftedEntryForm(props: CraftedEntryFormProps) {
  const [formInstance, setFormInstance] = useState(0);

  useLayoutEffect(() => {
    return () => {
      // Next 16 preserves route state while hiding pages; remount the form so
      // useActionState and the closing confirmation do not leak into the next visit.
      setFormInstance((current) => current + 1);
    };
  }, []);

  return <CraftedEntryFormFields key={formInstance} {...props} />;
}

function CraftedEntryFormFields({
  categories,
  members,
  initialPaidByUserId,
  initialBeneficiaryUserIds,
  returnTo,
  initialValues,
}: CraftedEntryFormProps) {
  const router = useRouter();
  const currencySymbol = useCurrencySymbol();
  const t = useTranslations();
  const formRef = useRef<HTMLFormElement>(null);
  const didHandleSuccessRef = useRef(false);
  const redirectTimerRef = useRef<number | null>(null);
  const successTimerRef = useRef<number | null>(null);

  const initialComparisonEnabled = getInitialComparisonEnabled(initialValues);
  const resolvedInitialPaidByUserId =
    initialValues?.paidByUserId ?? initialPaidByUserId;
  const resolvedInitialBeneficiaryUserIds =
    initialValues?.beneficiaryUserIds ?? initialBeneficiaryUserIds;

  const [successStage, setSuccessStage] = useState<"idle" | "confirming" | "closing">("idle");
  const [mode, setMode] = useState<EntryMode>("spent");
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [categoryId, setCategoryId] = useState(initialValues?.categoryId ?? "");
  const [paidByUserId, setPaidByUserId] = useState(resolvedInitialPaidByUserId);
  const [beneficiaryUserIds, setBeneficiaryUserIds] = useState(
    resolvedInitialBeneficiaryUserIds,
  );
  const [paymentMode, setPaymentMode] = useState<EntryPaymentModeValue>(() =>
    normalizeEntryPaymentMode(initialValues?.paymentMode),
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

    // Warm the destination's router cache while the confirmation animation
    // plays, so the return navigation is near-instant instead of a cold
    // server round-trip after the action already revalidated those paths.
    router.prefetch(returnTo);

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
      CONFIRMATION_VISIBLE_MS,
    );

    if (!showedCelebration) {
      redirectTimerRef.current = window.setTimeout(redirect, REDIRECT_DELAY_MS);
    }
  }, [redirect, returnTo, router, state, tryTrigger]);

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

  const canUseJointPayment = members.length === 2;
  const effectivePaymentMode = canUseJointPayment ? paymentMode : "single_payer";
  const savingContext: EntrySavingContext = showComparison ? "comparison" : "none";
  const entryIntent = getEntryIntent(showComparison, effectivePaymentMode);
  const primaryFieldError = getPrimaryFieldError(state.errors);
  const comparisonFieldError = getComparisonFieldError(state.errors);
  const comparisonDelta = getMoneyDelta(amountSpentInput, comparisonInput);
  const showLargeComparisonWarning =
    showComparison &&
    comparisonInput.trim().length > 0 &&
    Math.abs(comparisonDelta) >= 100;
  const hiddenAmountSpent = toHiddenMoneyValue(amountSpentInput);
  const hiddenComparisonAmount = showComparison
    ? toHiddenMoneyValue(comparisonInput)
    : "";
  const canSubmit =
    title.trim().length > 0 &&
    categoryId.length > 0 &&
    members.length > 0 &&
    categories.length > 0 &&
    !pending &&
    hiddenAmountSpent !== "" &&
    hiddenAmountSpent !== "0.00" &&
    (!showComparison || hiddenComparisonAmount !== "");

  function handleModeChange(nextMode: EntryMode) {
    triggerHaptic("subtle");
    setMode(nextMode);
    setAmountSpentInput((current) => current || comparisonInput);
  }

  function handleIntentChange(nextIntent: EntryIntent) {
    handleModeChange("spent");
    setPaymentMode(nextIntent === "joint" ? "joint_account" : "single_payer");
    setShowComparison(nextIntent === "comparison");

    if (nextIntent === "comparison") {
      setComparisonInput((current) => current || amountSpentInput);
    }

    if (nextIntent === "joint") {
      setPaidByUserId(members[0]?.userId ?? paidByUserId);
      setBeneficiaryUserIds(members.map((member) => member.userId));
    }
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
        <input type="hidden" name="paymentMode" value={effectivePaymentMode} />
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
            {t.common.cancel}
          </Link>
          <Label>{t.entryForm.newTitle}</Label>
          <div className="w-14" aria-hidden="true" />
        </div>

        {state.message && !state.success ? (
          <div
            className="mx-5 mb-3 rounded-[var(--r-control)] border border-destructive/30 px-4 py-3 text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {state.message}
          </div>
        ) : null}

        <div className="px-5 pb-4 pt-3">
          <div className={cn("grid gap-2", canUseJointPayment ? "grid-cols-3" : "grid-cols-2")}>
            <button
              type="button"
              onClick={() => handleIntentChange("spent")}
              className={cn(
                "flex min-h-12 items-center justify-center gap-1.5 border-b-[1.5px] px-2 py-2 text-center text-[12.5px] leading-4 transition-colors sm:text-sm",
                entryIntent === "spent"
                  ? "border-accent text-foreground"
                  : "border-transparent text-ink-3 hover:text-foreground",
              )}
              aria-pressed={entryIntent === "spent"}
            >
              <Receipt className="size-4" aria-hidden="true" />
              {t.entryForm.spentIntent}
            </button>
            <button
              type="button"
              onClick={() => handleIntentChange("comparison")}
              className={cn(
                "flex min-h-12 items-center justify-center gap-1.5 border-b-[1.5px] px-2 py-2 text-center text-[12.5px] leading-4 transition-colors sm:text-sm",
                entryIntent === "comparison"
                  ? "border-accent text-foreground"
                  : "border-transparent text-ink-3 hover:text-foreground",
              )}
              aria-pressed={entryIntent === "comparison"}
              aria-label={t.entryForm.comparisonIntentLabel}
            >
              <span className="font-num text-sm" aria-hidden="true">
                ↘
              </span>
              {t.entryForm.comparisonIntent}
            </button>
            {canUseJointPayment ? (
              <button
                type="button"
                onClick={() => handleIntentChange("joint")}
                className={cn(
                  "flex min-h-12 items-center justify-center gap-1.5 border-b-[1.5px] px-2 py-2 text-center text-[12.5px] leading-4 transition-colors sm:text-sm",
                  entryIntent === "joint"
                    ? "border-accent text-foreground"
                    : "border-transparent text-ink-3 hover:text-foreground",
                )}
                aria-pressed={entryIntent === "joint"}
              >
                <Users2 className="size-4" aria-hidden="true" />
                {t.entryForm.jointIntent}
              </button>
            ) : null}
          </div>
          <p className="mt-3 text-center text-xs leading-5 text-ink-3">
            {entryIntent === "spent"
              ? t.entryForm.spentDesc
              : entryIntent === "comparison"
                ? t.entryForm.comparisonDesc
                : t.entryForm.jointDesc}
          </p>
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
                  {getSummaryAmount(amountSpentInput)}
                </Mono>
                <Mono className="text-[26px] text-muted-foreground">{currencySymbol}</Mono>
              </div>
              <p className="text-[15px] font-semibold">Movimento salvato</p>
            </div>
          ) : (
            <>
              <Serif className="mb-3 text-[16px] text-muted-foreground">
                {entryIntent === "joint"
                  ? t.entryForm.registeredJoint
                  : entryIntent === "comparison"
                    ? t.entryForm.registeredComparison
                    : t.entryForm.registeredExpense}
              </Serif>
              <div className="flex items-baseline justify-center gap-2">
                <Mono className="text-[clamp(3rem,16vw,5rem)] font-semibold leading-[0.9] text-accent">
                  {getSummaryAmount(amountSpentInput)}
                </Mono>
                <Mono className="text-[28px] text-muted-foreground">{currencySymbol}</Mono>
              </div>
              <p className="mt-3 text-[12.5px] text-ink-3">
                {getSummaryText(
                  savingContext,
                  amountSpentInput,
                  comparisonInput,
                  currencySymbol,
                  t.entryForm,
                )}
              </p>
            </>
          )}
        </section>

        <div className="px-5 pb-2">
          <Label className="mb-3 block">{t.entryForm.categoryLabel}</Label>
          <div className="flex gap-5 overflow-x-auto pb-1" role="group" aria-label={t.entryForm.categoryLabel}>
            {categories.map((cat) => {
              const selected = categoryId === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  aria-pressed={selected}
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
          <label htmlFor="entry-title" className="flex items-center justify-between gap-4 border-y border-line py-[var(--sp-field-y)]">
            <input
              id="entry-title"
              type="text"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t.entryForm.whatPlaceholder}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-ink-3/70"
              aria-invalid={Boolean(state.errors?.title)}
              aria-describedby={state.errors?.title ? "entry-title-error" : undefined}
            />
            <Label>{t.entryForm.whatLabel}</Label>
          </label>
          <FormFieldError id="entry-title-error" message={state.errors?.title} />
        </div>

        <div className="space-y-3 px-5 pb-3">
          <div className="border-y border-line py-[var(--sp-field-y)]">
            <label className="flex items-center justify-between gap-4">
              <input
                type="text"
                inputMode="decimal"
                value={amountSpentInput}
                onChange={(event) => {
                  const nextValue = normalizeMoneyInput(event.target.value);
                  setAmountSpentInput(nextValue);
                }}
                placeholder={t.entryForm.amountPlaceholder}
                className="min-w-0 flex-1 bg-transparent font-num text-sm text-foreground outline-none placeholder:text-ink-3/70"
                aria-invalid={Boolean(primaryFieldError)}
              />
              <Label>{t.entryForm.amountLabel}</Label>
            </label>
            <FormFieldError message={primaryFieldError} className="mt-2 text-xs" />
          </div>

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
              {showComparison
                ? t.entryForm.hideComparison
                : t.entryForm.toggleComparison}
            </button>

            {showComparison ? (
              <div className="border-y border-line py-[var(--sp-field-y)]">
                <label className="flex items-center justify-between gap-4">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={comparisonInput}
                    onChange={(event) =>
                      setComparisonInput(normalizeMoneyInput(event.target.value))
                    }
                    placeholder={t.entryForm.comparisonAmountPlaceholder}
                    className="min-w-0 flex-1 bg-transparent font-num text-sm text-foreground outline-none placeholder:text-ink-3/70"
                    aria-invalid={Boolean(comparisonFieldError)}
                  />
                  <Label>{t.entryForm.comparisonAmountLabel}</Label>
                </label>
                <p className="mt-2 text-xs text-ink-3">
                  {t.entryForm.comparisonHelp}
                </p>
                {showLargeComparisonWarning ? (
                  <p className="mt-2 rounded-[var(--r-control)] border border-warm/25 bg-warm/5 px-3 py-2 text-xs font-medium leading-5 text-warm">
                    {t.entryForm.largeComparisonWarning}
                  </p>
                ) : null}
                <FormFieldError
                  message={comparisonFieldError}
                  className="mt-2 text-xs"
                />
              </div>
            ) : null}
          </>
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
            {showAdvanced ? t.entryForm.advancedHide : t.entryForm.advancedToggle}
          </button>

          {showAdvanced ? (
            <div className="mb-5 space-y-4 border-t border-line pt-4">
              <div className="space-y-2 border-b border-line pb-3">
                <label htmlFor="entry-date" className="font-num text-[10px] font-normal uppercase tracking-[0.22em] text-ink-3">{t.entryForm.dateLabel}</label>
                <input
                  id="entry-date"
                  type="date"
                  name="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-full bg-transparent py-[var(--sp-stack-sm)] text-sm text-foreground outline-none"
                  aria-describedby={state.errors?.date ? "entry-date-error" : undefined}
                />
                <FormFieldError id="entry-date-error" message={state.errors?.date} className="text-xs" />
              </div>

              <div className="space-y-2 border-b border-line pb-3">
                <label htmlFor="entry-note" className="font-num text-[10px] font-normal uppercase tracking-[0.22em] text-ink-3">{t.entryForm.noteLabel}</label>
                <textarea
                  id="entry-note"
                  name="note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t.entryForm.notePlaceholder}
                  rows={2}
                  className="w-full resize-none bg-transparent py-[var(--sp-stack-sm)] text-sm text-foreground outline-none placeholder:text-ink-3/70"
                />
              </div>

              {effectivePaymentMode === "joint_account" ? (
                <div className="rounded-[var(--r-control)] border border-line bg-surface-muted/60 px-4 py-3 text-sm leading-6 text-ink-3">
                  {t.entryForm.jointPaymentInfo}
                </div>
              ) : (
                <EntryPeopleFields
                  members={members}
                  paidByUserId={paidByUserId}
                  beneficiaryUserIds={beneficiaryUserIds}
                  errors={state.errors}
                  onPaidByUserIdChange={setPaidByUserId}
                  onBeneficiaryUserIdsChange={setBeneficiaryUserIds}
                />
              )}
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
              "flex h-[54px] w-full items-center justify-center gap-2 rounded-[var(--r-cta)] text-[15.5px] font-bold",
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
                {t.entryForm.savingButton}
              </>
            ) : (
              <>
                {t.entryForm.saveButton}
                <ArrowRight className="size-4" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
}
