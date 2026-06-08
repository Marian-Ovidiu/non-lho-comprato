"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowRight, ChevronDown, Loader2 } from "lucide-react";

import { CraftedIcon, CraftedNumpad, Label, Mono, Serif } from "@/components/crafted";
import { createEntry } from "@/src/actions/entries";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";
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

export type CraftedEntryFormProps = {
  categories: CategoryOption[];
  members: WorkspaceMemberOption[];
  initialPaidByUserId: string;
  initialBeneficiaryUserIds: string[];
  returnTo: string;
  initialValues?: {
    title?: string;
    categoryId?: string;
    realCost?: string;
    alternativeCost?: string;
    paidByUserId?: string;
    beneficiaryUserIds?: string[];
    date?: string;
  };
};

const initialState: FormState = { success: false, message: "", errors: {} };

function getTodayLocal() {
  return format(new Date(), "yyyy-MM-dd");
}

function parseMoneyString(raw: string | undefined): number {
  if (!raw) return Number.NaN;
  const n = parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) ? n : Number.NaN;
}

function moneyStringToInput(raw: string | undefined): string {
  const n = parseMoneyString(raw);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n.toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function rawToCents(raw: string): number {
  if (!raw) return 0;
  const n = parseFloat(raw.replace(",", "."));
  return isNaN(n) ? 0 : Math.round(n * 100);
}

function normalizeMoneyInput(value: string): string {
  return value
    .replace(/[^\d,.]/g, "")
    .replace(".", ",")
    .replace(/(,.*),/g, "$1")
    .replace(/^0+(\d)/, "$1");
}

function formatDisplayValue(raw: string): string {
  if (!raw) return "0,00";
  if (!raw.includes(",")) {
    return parseInt(raw, 10).toLocaleString("it-IT");
  }
  const [intPart, decPart = ""] = raw.split(",");
  return `${parseInt(intPart || "0", 10).toLocaleString("it-IT")},${decPart}`;
}

function formatButtonValue(raw: string): string {
  return (rawToCents(raw) / 100).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

  const resolvedInitialPaidByUserId =
    initialValues?.paidByUserId ?? initialPaidByUserId;
  const resolvedInitialBeneficiaryUserIds =
    initialValues?.beneficiaryUserIds ?? initialBeneficiaryUserIds;

  const initialReal = parseMoneyString(initialValues?.realCost);
  const initialAlt = parseMoneyString(
    initialValues?.alternativeCost ?? initialValues?.realCost,
  );
  const initialSavingsMode =
    Number.isFinite(initialReal) &&
    Number.isFinite(initialAlt) &&
    initialAlt !== initialReal;

  const [successStage, setSuccessStage] = useState<"idle" | "confirming" | "closing">("idle");
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [categoryId, setCategoryId] = useState(initialValues?.categoryId ?? "");
  const [paidByUserId, setPaidByUserId] = useState(resolvedInitialPaidByUserId);
  const [beneficiaryUserIds, setBeneficiaryUserIds] = useState(
    resolvedInitialBeneficiaryUserIds,
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSavingsField, setShowSavingsField] = useState(initialSavingsMode);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(initialValues?.date ?? getTodayLocal());
  const [amountInput, setAmountInput] = useState(() =>
    moneyStringToInput(initialValues?.realCost),
  );
  const [alternativeInput, setAlternativeInput] = useState(() =>
    initialSavingsMode
      ? moneyStringToInput(initialValues?.alternativeCost)
      : moneyStringToInput(initialValues?.realCost),
  );

  const redirect = useCallback(() => router.replace(returnTo), [router, returnTo]);
  const { tryTrigger, overlay } = useStreakCelebrationTrigger({ onComplete: redirect });

  const [state, formAction, pending] = useActionState(
    async (_prev: FormState, formData: FormData) => createEntry(formData),
    initialState,
  );

  function handleNumpadKey(key: string) {
    triggerHaptic("subtle");
    setAmountInput((prev) => {
      if (key === "⌫") return prev.slice(0, -1);
      if (key === ",") {
        if (prev.includes(",")) return prev;
        return (prev || "0") + ",";
      }
      if (prev.includes(",")) {
        const decPart = prev.split(",")[1] ?? "";
        if (decPart.length >= 2) return prev;
      } else {
        if (prev.length >= 7) return prev;
        if (prev === "0") return key === "0" ? prev : key;
      }
      return prev + key;
    });
  }

  useEffect(() => {
    if (!state.success) {
      didHandleSuccessRef.current = false;
      return;
    }
    if (didHandleSuccessRef.current) return;
    didHandleSuccessRef.current = true;
    trackPostHogEvent("entry_created");
    if (state.isFirstEntryCreated) trackPostHogEvent("first_entry_created");
    setSuccessStage("confirming");
    if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
    if (redirectTimerRef.current) window.clearTimeout(redirectTimerRef.current);
    const showedCelebration = tryTrigger(state);
    if (!showedCelebration) triggerHaptic("light");
    successTimerRef.current = window.setTimeout(() => setSuccessStage("closing"), 1400);
    if (!showedCelebration) {
      redirectTimerRef.current = window.setTimeout(redirect, 1800);
    }
  }, [redirect, state, tryTrigger]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
      if (redirectTimerRef.current) window.clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const realCents = rawToCents(amountInput);
  const alternativeCents = showSavingsField
    ? rawToCents(alternativeInput)
    : realCents;
  const hasAmount =
    realCents > 0 || (showSavingsField && alternativeCents > realCents);
  const canSubmit =
    hasAmount &&
    title.trim().length > 0 &&
    categories.length > 0 &&
    members.length > 0 &&
    !pending;
  const realCostValue = (realCents / 100).toFixed(2);
  const alternativeCostValue = (alternativeCents / 100).toFixed(2);

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
        <input type="hidden" name="realCost" value={realCostValue} />
        <input type="hidden" name="alternativeCost" value={alternativeCostValue} />
        <input type="hidden" name="title" value={title} />
        <input type="hidden" name="categoryId" value={categoryId} />
        <input type="hidden" name="paidByUserId" value={paidByUserId} />
        {beneficiaryUserIds.map((id) => (
          <input key={id} type="hidden" name="beneficiaryUserIds" value={id} />
        ))}
        <input type="hidden" name="date" value={date} />
        {note.trim() ? <input type="hidden" name="note" value={note} /> : null}

        <div className="flex items-center justify-between px-5 pb-1.5 pt-3">
          <Link
            href={returnTo}
            className="text-sm text-muted-foreground transition-opacity hover:opacity-80"
          >
            Annulla
          </Link>
          <Label>Nuovo segnale</Label>
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

        <div className="flex flex-1 flex-col items-center justify-center px-5 py-6 text-center">
          {successStage !== "idle" ? (
            <div className="flex flex-col items-center gap-4">
              <CraftedIcon name="check" size={28} className="text-green" strokeWidth={2} />
              <div className="flex items-baseline gap-2">
                <Mono className="text-[clamp(3rem,16vw,4.5rem)] font-semibold leading-none tracking-[-0.055em] text-accent">
                  {formatButtonValue(amountInput)}
                </Mono>
                <Mono className="text-[26px] text-muted-foreground">€</Mono>
              </div>
              <p className="text-[15px] font-semibold">Aggiunto al portafoglio</p>
            </div>
          ) : (
            <>
              <Serif className="mb-4 text-[17px] text-muted-foreground">
                non ho comprato per
              </Serif>
              <div className="flex items-baseline gap-2">
                <Mono className="text-[clamp(3rem,16vw,5.25rem)] font-semibold leading-[0.9] tracking-[-0.055em] text-accent">
                  {formatDisplayValue(amountInput)}
                </Mono>
                <Mono className="text-[30px] font-medium text-muted-foreground">€</Mono>
              </div>
              <p className="mt-3 text-[12.5px] text-ink-3">tenuti nel portafoglio</p>
            </>
          )}
        </div>

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
        </div>

        <div className="px-5 pb-3">
          <div className="flex items-center justify-between gap-4 border-y border-line py-3">
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Caffè in stazione"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-ink-3/70"
              aria-invalid={Boolean(state.errors?.title)}
            />
            <Label>Cosa</Label>
          </div>
          {state.errors?.title ? (
            <p className="mt-2 text-sm text-destructive">{state.errors.title}</p>
          ) : null}
        </div>

        {state.errors?.categoryId ? (
          <div className="px-5 pb-2">
            <p className="text-sm text-destructive">{state.errors.categoryId}</p>
          </div>
        ) : null}

        {state.errors?.realCost ? (
          <div className="px-5 pb-2">
            <p className="text-sm text-destructive">{state.errors.realCost}</p>
          </div>
        ) : null}

        <div className="px-5 pb-3">
          <button
            type="button"
            onClick={() => {
              setShowSavingsField((current) => {
                if (current) {
                  return false;
                }

                setAlternativeInput((prev) => prev || amountInput);
                return true;
              });
            }}
            className="flex w-full items-center justify-center gap-1.5 text-[13px] text-ink-3 transition-colors hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform duration-200",
                showSavingsField && "rotate-180",
              )}
              aria-hidden="true"
            />
            {showSavingsField ? "Nascondi risparmio" : "Ho risparmiato qualcosa?"}
          </button>

          {showSavingsField ? (
            <div className="mt-3 border-y border-line py-3">
              <label className="flex items-center justify-between gap-4">
                <input
                  type="text"
                  inputMode="decimal"
                  value={alternativeInput}
                  onChange={(event) =>
                    setAlternativeInput(normalizeMoneyInput(event.target.value))
                  }
                  placeholder="18,00"
                  className="min-w-0 flex-1 bg-transparent font-num text-sm text-foreground outline-none placeholder:text-ink-3/70"
                  aria-invalid={Boolean(state.errors?.alternativeCost)}
                />
                <Label>Avresti speso</Label>
              </label>
              {state.errors?.alternativeCost ? (
                <p className="mt-2 text-xs text-destructive">
                  {state.errors.alternativeCost}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="px-4 pb-2">
          <CraftedNumpad onKey={handleNumpadKey} />
        </div>

        <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] pt-1.5">
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
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Salvataggio…
              </>
            ) : (
              <>
                {hasAmount
                  ? `Aggiungi ${formatButtonValue(amountInput)}€`
                  : "Inserisci un importo"}
                {hasAmount ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowAdvanced((value) => !value)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 text-[13px] text-ink-3 transition-colors hover:text-foreground"
          >
            <ChevronDown
              className={cn("size-3.5 transition-transform duration-200", showAdvanced && "rotate-180")}
              aria-hidden="true"
            />
            Altre opzioni
          </button>

          {showAdvanced ? (
            <div className="mt-4 space-y-4 border-t border-line pt-4">
              <div className="space-y-2 border-b border-line pb-3">
                <Label>Data</Label>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-full bg-transparent py-2 text-sm text-foreground outline-none"
                />
              </div>

              <div className="space-y-2 border-b border-line pb-3">
                <Label>Nota</Label>
                <textarea
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
          ) : null}
        </div>
      </form>
    </>
  );
}
