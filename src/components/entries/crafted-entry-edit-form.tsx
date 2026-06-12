"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  CircleOff,
  Loader2,
  Receipt,
} from "lucide-react";

import { CraftedIcon, Label, Mono, Rule, Serif } from "@/components/crafted";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteEntry, updateEntry } from "@/src/actions/entries";
import { EntryPeopleFields } from "@/src/components/entries/entry-people-fields";
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
import { cn } from "@/lib/utils";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
};

type EntryToEdit = {
  id: string;
  title: string;
  categoryId: string;
  mode: EntryMode;
  savingContext: EntrySavingContext;
  realCost: number;
  alternativeCost: number;
  savedAmount: number;
  amountSpent: number;
  comparisonAmount: number;
  savingImpact: number;
  date: string;
  note: string | null;
  source: string;
  paidByUserId: string;
  beneficiaryUserIds: string[];
};

type EntryIntent = "spent" | "comparison" | "avoided";

type FormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
};

const ROME_TIME_ZONE = "Europe/Rome";
const initialState: FormState = { success: false, message: "", errors: {} };

function getDateValue(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ROME_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsed);

  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
}

function getPrimaryFieldError(errors?: Record<string, string>) {
  return errors?.amountSpent ?? errors?.realCost;
}

function getComparisonFieldError(errors?: Record<string, string>) {
  return errors?.comparisonAmount ?? errors?.alternativeCost;
}

function formatPrimaryFieldLabel(mode: EntryMode) {
  return mode === "avoided" ? "Avresti speso" : "Quanto hai speso";
}

function getSummaryText(
  mode: EntryMode,
  savingContext: EntrySavingContext,
  amountSpentInput: string,
  comparisonInput: string,
) {
  if (mode === "avoided") {
    return "Non comprato";
  }

  if (savingContext === "comparison") {
    const delta = getMoneyDelta(amountSpentInput, comparisonInput);

    if (delta > 0) {
      return `${formatMoneyValue(delta)}€ risparmiati scegliendo meglio`;
    }

    if (delta < 0) {
      return `${formatMoneyValue(Math.abs(delta))}€ spesi in più del confronto`;
    }

    return "in linea con il confronto";
  }

  return "spesa registrata";
}

function getEntryIntent(
  mode: EntryMode,
  showComparison: boolean,
): EntryIntent {
  if (mode === "avoided") {
    return "avoided";
  }

  return showComparison ? "comparison" : "spent";
}

export function CraftedEntryEditForm({
  entry,
  categories,
  members,
}: {
  entry: EntryToEdit;
  categories: CategoryOption[];
  members: WorkspaceMemberOption[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const didHandleSuccessRef = useRef(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const [mode, setMode] = useState<EntryMode>(entry.mode);
  const [categoryId, setCategoryId] = useState(entry.categoryId);
  const [title, setTitle] = useState(entry.title);
  const [date, setDate] = useState(getDateValue(entry.date));
  const [note, setNote] = useState(entry.note ?? "");
  const [showAdvanced, setShowAdvanced] = useState(Boolean(entry.note));
  const [showComparison, setShowComparison] = useState(
    entry.mode === "spent" && entry.savingContext === "comparison",
  );
  const [amountSpentInput, setAmountSpentInput] = useState(() =>
    moneyStringToInput(entry.amountSpent),
  );
  const [comparisonInput, setComparisonInput] = useState(() =>
    moneyStringToInput(entry.comparisonAmount),
  );
  const [paidByUserId, setPaidByUserId] = useState(entry.paidByUserId);
  const [beneficiaryUserIds, setBeneficiaryUserIds] = useState(
    entry.beneficiaryUserIds,
  );

  const [state, formAction, pending] = useActionState(
    async (_previousState: FormState, formData: FormData) =>
      updateEntry(entry.id, formData),
    initialState,
  );

  useEffect(() => {
    if (!state.success || didHandleSuccessRef.current) {
      return;
    }

    didHandleSuccessRef.current = true;
    const timeout = window.setTimeout(() => router.replace("/entries"), 800);
    return () => window.clearTimeout(timeout);
  }, [router, state.success]);

  const savingContext: EntrySavingContext =
    mode === "avoided" ? "comparison" : showComparison ? "comparison" : "none";
  const entryIntent = getEntryIntent(mode, showComparison);
  const hiddenAmountSpent = mode === "spent" ? toHiddenMoneyValue(amountSpentInput) : "";
  const hiddenComparisonAmount =
    mode === "avoided" || showComparison ? toHiddenMoneyValue(comparisonInput) : "";
  const primaryFieldError = getPrimaryFieldError(state.errors);
  const comparisonFieldError = getComparisonFieldError(state.errors);
  const comparisonDelta = getMoneyDelta(amountSpentInput, comparisonInput);
  const showLargeComparisonWarning =
    mode === "spent" &&
    showComparison &&
    comparisonInput.trim().length > 0 &&
    Math.abs(comparisonDelta) >= 100;
  const summaryAmount =
    mode === "avoided"
      ? formatMoneyPreview(comparisonInput)
      : formatMoneyPreview(amountSpentInput);

  function handleModeChange(nextMode: EntryMode) {
    setMode(nextMode);

    if (nextMode === "avoided") {
      setComparisonInput((current) => current || amountSpentInput);
      setShowComparison(false);
      return;
    }

    setAmountSpentInput((current) => current || comparisonInput);
  }

  function handleIntentChange(nextIntent: EntryIntent) {
    if (nextIntent === "avoided") {
      handleModeChange("avoided");
      return;
    }

    handleModeChange("spent");
    setShowComparison(nextIntent === "comparison");

    if (nextIntent === "comparison") {
      setComparisonInput((current) => current || amountSpentInput);
    }
  }

  function handleDelete() {
    setDeleteMessage(null);

    startDeleteTransition(async () => {
      const result = await deleteEntry(entry.id);

      if (!result.success) {
        setDeleteMessage(result.message);
        return;
      }

      setDeleteOpen(false);
      router.replace("/entries");
      router.refresh();
    });
  }

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <form ref={formRef} action={formAction}>
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="savingContext" value={savingContext} />
        <input type="hidden" name="categoryId" value={categoryId} />
        <input type="hidden" name="paidByUserId" value={paidByUserId} />
        {beneficiaryUserIds.map((userId) => (
          <input
            key={userId}
            type="hidden"
            name="beneficiaryUserIds"
            value={userId}
          />
        ))}
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

        <div className="flex items-center justify-between px-5 pb-1.5 pt-3">
          <Link href="/entries" className="text-sm text-muted-foreground hover:opacity-80">
            Annulla
          </Link>
          <Label>Modifica movimento</Label>
          <div className="w-14" aria-hidden="true" />
        </div>

        <section className="px-5 py-5 text-center">
          <Serif className="mb-3 text-sm text-muted-foreground">
            {entry.source === "habit"
              ? "movimento collegato a una ricorrente"
              : "stai aggiornando il movimento"}
          </Serif>
          <div className="flex items-baseline justify-center gap-1.5">
            <Mono className="text-[clamp(2.5rem,12vw,3.75rem)] font-semibold leading-[0.9] text-accent">
              {summaryAmount}
            </Mono>
            <Mono className="text-xl text-muted-foreground">€</Mono>
          </div>
          <Serif className="mt-3 block text-sm text-ink-3">
            {getSummaryText(mode, savingContext, amountSpentInput, comparisonInput)}
          </Serif>
        </section>
        <Rule />

        {state.message ? (
          <div
            className={cn(
              "mx-5 my-4 border px-4 py-3 text-sm",
              state.success
                ? "border-green/30 text-green"
                : "border-destructive/30 text-destructive",
            )}
          >
            {state.message}
          </div>
        ) : null}

        <div className="px-5 pb-4 pt-3">
          <div className="grid grid-cols-3 gap-2">
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
              Ho speso
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
                "flex min-h-12 items-center justify-center gap-1.5 border-b-[1.5px] px-2 py-2 text-center text-[12.5px] leading-4 transition-colors sm:text-sm",
                entryIntent === "avoided"
                  ? "border-accent text-foreground"
                  : "border-transparent text-ink-3 hover:text-foreground",
              )}
              aria-pressed={entryIntent === "avoided"}
            >
              <CircleOff className="size-4" aria-hidden="true" />
              Non l&apos;ho comprato
            </button>
          </div>
          <p className="mt-3 text-center text-xs leading-5 text-ink-3">
            {entryIntent === "spent"
              ? "Registra solo il denaro uscito davvero."
              : entryIntent === "comparison"
                ? "Usalo quando hai scelto un'opzione più economica."
                : "Segna quanto avresti speso se l'avessi comprato."}
          </p>
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
                    "flex shrink-0 flex-col items-center gap-2 border-b-[1.5px] pb-2",
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
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={mode === "avoided" ? "Delivery" : "Pranzo"}
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3/70"
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
                placeholder={mode === "avoided" ? "18,00" : "12,00"}
                className="min-w-0 flex-1 bg-transparent font-num text-sm outline-none placeholder:text-ink-3/70"
                aria-invalid={Boolean(primaryFieldError)}
              />
              <Label>{formatPrimaryFieldLabel(mode)}</Label>
            </label>
            <FormFieldError message={primaryFieldError} />
          </div>

          {mode === "spent" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setShowComparison((current) => {
                    if (current) {
                      return false;
                    }

                    setComparisonInput((prev) => prev || amountSpentInput);
                    return true;
                  });
                }}
                className="flex w-full items-center justify-center gap-1.5 text-[13px] text-ink-3 hover:text-foreground"
              >
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform duration-200",
                    showComparison && "rotate-180",
                  )}
                  aria-hidden="true"
                />
                {showComparison
                  ? "Nascondi confronto"
                  : "Ho speso e voglio confrontarlo"}
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
                      className="min-w-0 flex-1 bg-transparent font-num text-sm outline-none placeholder:text-ink-3/70"
                      aria-invalid={Boolean(comparisonFieldError)}
                    />
                    <Label>Quanto avresti speso di solito?</Label>
                  </label>
                  <p className="mt-2 text-xs text-ink-3">
                    Usalo quando hai scelto un&apos;opzione più economica.
                  </p>
                  {showLargeComparisonWarning ? (
                    <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                      Questo confronto pesa molto sulle statistiche.
                    </p>
                  ) : null}
                  <FormFieldError message={comparisonFieldError} />
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-[13px] text-ink-3">
              Segna quanto avresti speso se l&apos;avessi comprato. Non verrà contato nulla come speso davvero.
            </p>
          )}
        </div>

        <div className="space-y-3 px-5 pb-3">
          <button
            type="button"
            onClick={() => setShowAdvanced((value) => !value)}
            className="flex w-full items-center justify-center gap-1.5 text-[13px] text-ink-3 transition-colors hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform duration-200",
                showAdvanced && "rotate-180",
              )}
              aria-hidden="true"
            />
            {showAdvanced ? "Nascondi dettagli" : "Data, nota, chi paga e vale per"}
          </button>

          {showAdvanced ? (
            <div className="space-y-4 border-t border-line pt-4">
              <div className="space-y-2 border-b border-line pb-3">
                <Label>Data</Label>
                <input
                  name="date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-full bg-transparent py-2 text-sm outline-none"
                />
                <FormFieldError message={state.errors?.date} />
              </div>

              <div className="space-y-2 border-b border-line pb-3">
                <Label>Nota</Label>
                <textarea
                  name="note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={2}
                  className="w-full resize-none bg-transparent py-2 text-sm outline-none placeholder:text-ink-3/70"
                  placeholder="Nota opzionale"
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
        </div>

        <div className="space-y-3 px-5 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] pt-2">
          <button
            type="submit"
            disabled={
              pending ||
              isDeleting ||
              categories.length === 0 ||
              members.length === 0
            }
            className={cn(
              "flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl text-[15.5px] font-bold",
              "bg-accent text-accent-foreground transition-opacity disabled:opacity-50",
            )}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Salvataggio…
              </>
            ) : (
              "Salva movimento"
            )}
          </button>
          <button
            type="button"
            disabled={pending || isDeleting}
            onClick={() => {
              setDeleteMessage(null);
              setDeleteOpen(true);
            }}
            className="flex h-11 w-full items-center justify-center text-[13px] text-destructive/80 transition-colors hover:text-destructive disabled:opacity-50"
          >
            Elimina movimento
          </button>
        </div>
      </form>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-line sm:max-w-md">
          <DialogTitle>Elimina movimento</DialogTitle>
          <DialogDescription>
            {entry.source === "habit"
              ? "Il movimento verrà rimosso e l'occorrenza della ricorrente tornerà in sospeso."
              : "Il movimento verrà rimosso dal registro. L'operazione non si può annullare."}
          </DialogDescription>

          {deleteMessage ? (
            <p className="text-sm text-destructive">{deleteMessage}</p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeleteOpen(false)}
              className="px-4 py-2.5 text-sm text-ink-3 transition-colors hover:text-foreground disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="flex items-center justify-center gap-2 rounded-2xl border border-destructive/40 px-5 py-2.5 text-sm font-semibold text-destructive transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  Eliminazione…
                </>
              ) : (
                "Elimina"
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
