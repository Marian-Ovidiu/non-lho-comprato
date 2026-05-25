"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowRight, ChevronDown, Loader2 } from "lucide-react";

import { createEntry } from "@/src/actions/entries";
import { cn } from "@/lib/utils";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";
import { useStreakCelebrationTrigger } from "@/src/hooks/use-streak-celebration-trigger";
import { triggerHaptic } from "@/src/lib/haptics";
import { trackPostHogEvent } from "@/src/lib/posthog";
import { getCategoryEmoji } from "@/src/lib/visual-cues";

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

type EntryFormProps = {
  categories: CategoryOption[];
  members: WorkspaceMemberOption[];
  initialPaidByUserId: string;
  initialBeneficiaryUserIds: string[];
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

const NUMPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "⌫"] as const;

function getTodayLocal() {
  return format(new Date(), "yyyy-MM-dd");
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

function Numpad({ onKey }: { onKey: (key: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {NUMPAD_KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onKey(k)}
          className={cn(
            "flex h-14 items-center justify-center rounded-2xl border border-border bg-surface-muted",
            "font-num text-[22px] font-medium transition-[background-color,transform] duration-100",
            "active:scale-[0.97] active:bg-surface",
            k === "⌫" ? "text-muted-foreground" : "text-foreground",
          )}
          aria-label={k === "⌫" ? "Cancella" : k}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

export function EntryForm({
  categories,
  members,
  initialPaidByUserId,
  initialBeneficiaryUserIds,
  initialValues,
}: EntryFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const didHandleSuccessRef = useRef(false);
  const redirectTimerRef = useRef<number | null>(null);
  const successTimerRef = useRef<number | null>(null);

  const resolvedInitialPaidByUserId =
    initialValues?.paidByUserId ?? initialPaidByUserId;
  const resolvedInitialBeneficiaryUserIds =
    initialValues?.beneficiaryUserIds ?? initialBeneficiaryUserIds;

  const [successStage, setSuccessStage] = useState<"idle" | "confirming" | "closing">("idle");
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [categoryId, setCategoryId] = useState(initialValues?.categoryId ?? "");
  const [paidByUserId, setPaidByUserId] = useState(resolvedInitialPaidByUserId);
  const [beneficiaryUserIds, setBeneficiaryUserIds] = useState(
    resolvedInitialBeneficiaryUserIds,
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(initialValues?.date ?? getTodayLocal());
  const [realCostInput, setRealCostInput] = useState<string>(() => {
    const raw = initialValues?.realCost;
    if (!raw) return "0";
    const n = parseFloat(raw.replace(",", "."));
    if (isNaN(n) || n <= 0) return "0";
    return n.toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  });

  const [rawInput, setRawInput] = useState<string>(() => {
    const raw = initialValues?.alternativeCost ?? initialValues?.realCost;
    if (!raw) return "";
    const n = parseFloat(raw.replace(",", "."));
    if (isNaN(n) || n <= 0) return "";
    return n.toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  });

  const redirect = useCallback((path: string) => router.replace(path), [router]);
  const { tryTrigger, overlay } = useStreakCelebrationTrigger({ onComplete: () => redirect("/") });

  const [state, formAction, pending] = useActionState(
    async (_prev: FormState, formData: FormData) => createEntry(formData),
    initialState,
  );

  function handleNumpadKey(key: string) {
    triggerHaptic("subtle");
    setRawInput((prev) => {
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
      redirectTimerRef.current = window.setTimeout(() => redirect("/"), 1800);
    }
  }, [redirect, state, tryTrigger]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
      if (redirectTimerRef.current) window.clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const hasAmount = rawToCents(rawInput) > 0;
  const canSubmit = hasAmount && title.trim().length > 0 && categories.length > 0 && members.length > 0 && !pending;
  const realCostValue = (rawToCents(realCostInput) / 100).toFixed(2);
  const alternativeCostValue = (rawToCents(rawInput) / 100).toFixed(2);

  return (
    <>
      {overlay}
      <form
        ref={formRef}
        action={formAction}
        className={cn(
          "flex min-h-[100dvh] flex-col bg-background",
          "transition-[opacity,transform,filter] duration-200 ease-out",
          successStage === "closing" && "translate-y-1 opacity-0 blur-[1px]",
        )}
      >
        {/* Hidden form fields */}
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

        {/* Sheet header */}
        <div className="flex items-center justify-between px-5 pb-4 pt-5">
          <Link
            href="/entries"
            className="text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Annulla
          </Link>
          <span className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Nuovo segnale
          </span>
          <div className="w-[60px]" />
        </div>

        {/* Error banner */}
        {state.message && !state.success ? (
          <div className="mx-5 mb-3 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {state.message}
          </div>
        ) : null}

        {/* Amount display */}
        <div className="px-5 pb-7 pt-1 text-center">
          {successStage !== "idle" ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div
                className="flex items-center justify-center rounded-full bg-accent text-accent-foreground"
                style={{ width: 56, height: 56, fontSize: 26 }}
                aria-hidden="true"
              >
                ✓
              </div>
              <div>
                <div className="flex items-baseline justify-center gap-2">
                  <span
                    className="font-num font-semibold leading-none text-accent"
                    style={{ fontSize: 72, letterSpacing: "-0.06em" }}
                  >
                    {formatButtonValue(rawInput)}
                  </span>
                  <span className="font-num text-[26px] font-medium text-muted-foreground">€</span>
                </div>
                <p className="mt-2 text-[15px] font-semibold text-foreground">
                  Aggiunto al portafoglio
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="font-serif italic text-sm text-muted-foreground">
                quanto avrei speso
              </p>
              <div className="mt-3 flex items-baseline justify-center gap-2">
                <span
                  className="font-num font-semibold leading-none text-accent"
                  style={{ fontSize: 88, letterSpacing: "-0.06em" }}
                >
                  {formatDisplayValue(rawInput)}
                </span>
                <span className="font-num text-[30px] font-medium text-muted-foreground">€</span>
              </div>
              <p className="mt-2.5 text-[13px] text-muted-foreground">
                usa il tastierino o correggi il campo sotto
              </p>
            </>
          )}
        </div>

        {/* Category picker */}
        <div className="pb-4">
          <p className="mb-2.5 px-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Categoria
          </p>
          <div className="flex gap-2 overflow-x-auto px-5 pb-1">
            {categories.map((cat) => {
              const selected = categoryId === cat.id;
              const emoji = getCategoryEmoji(cat);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-semibold",
                    "transition-colors duration-150",
                    selected
                      ? "border-transparent bg-accent text-accent-foreground"
                      : "border-border bg-surface-muted text-foreground",
                  )}
                >
                  <span className="text-base leading-none">{emoji}</span>
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Title input */}
        <div className="px-5 pb-4">
          <div className="rounded-2xl border border-border bg-surface-muted px-4 py-3.5">
            <p className="mb-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Cosa
            </p>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Caffè in stazione"
              autoComplete="off"
              className="w-full bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted-foreground/40"
            />
          </div>
        </div>

        <div className="px-5 pb-4">
          <div className="grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Speso davvero
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={realCostInput}
                onChange={(event) => setRealCostInput(normalizeMoneyInput(event.target.value))}
                placeholder="0,00"
                className="h-11 w-full rounded-xl border border-border bg-surface-muted px-3 font-num text-sm text-foreground outline-none placeholder:text-muted-foreground/40"
                aria-invalid={Boolean(state.errors?.realCost)}
              />
              {state.errors?.realCost ? (
                <span className="block text-xs text-destructive">{state.errors.realCost}</span>
              ) : null}
            </label>

            <label className="space-y-1.5">
              <span className="block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Quanto avresti speso
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={rawInput}
                onChange={(event) => setRawInput(normalizeMoneyInput(event.target.value))}
                placeholder="18,00"
                className="h-11 w-full rounded-xl border border-border bg-surface-muted px-3 font-num text-sm text-foreground outline-none placeholder:text-muted-foreground/40"
                aria-invalid={Boolean(state.errors?.alternativeCost)}
              />
              {state.errors?.alternativeCost ? (
                <span className="block text-xs text-destructive">
                  {state.errors.alternativeCost}
                </span>
              ) : null}
            </label>
          </div>
        </div>

        <div className="flex-1" />

        {/* Numpad */}
        <div className="px-3 pb-3">
          <Numpad onKey={handleNumpadKey} />
        </div>

        {/* CTA + advanced */}
        <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+7.5rem)]">
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "flex h-14 w-full items-center justify-center gap-2 rounded-[18px]",
              "text-[16px] font-bold tracking-[-0.01em]",
              "transition-[opacity,transform,background-color] duration-200",
              canSubmit
                ? "bg-accent text-accent-foreground active:scale-[0.98] active:opacity-90"
                : "bg-surface-muted text-muted-foreground",
            )}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Salvataggio…
              </>
            ) : (
              <>
                {hasAmount ? `Aggiungi ${formatButtonValue(rawInput)}€ ai segnali` : "Inserisci un importo"}
                {hasAmount ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
              </>
            )}
          </button>

          {/* Advanced options */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown
              className={cn("size-3.5 transition-transform duration-200", showAdvanced && "rotate-180")}
              aria-hidden="true"
            />
            Altre opzioni
          </button>

          {showAdvanced ? (
            <div className="mt-4 space-y-4 rounded-2xl border border-border bg-surface p-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Data
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm text-foreground outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Nota
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Pasta al tonno invece di delivery"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-border bg-surface-muted px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/40"
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
