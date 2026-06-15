"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Loader2,
  Receipt,
  Users2,
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
import {
  normalizeEntryPaymentMode,
  type EntryPaymentModeValue,
} from "@/src/lib/entry-payment-mode";
import { useCurrencySymbol } from "@/src/components/currency/currency-context";

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
  paymentMode: EntryPaymentModeValue;
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

type EntryIntent = "spent" | "comparison" | "joint";

type FormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
};

const initialState: FormState = { success: false, message: "", errors: {} };

function getDateValue(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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

function getSummaryText(
  savingContext: EntrySavingContext,
  amountSpentInput: string,
  comparisonInput: string,
  currencySymbol: string,
) {
  if (savingContext === "comparison") {
    const delta = getMoneyDelta(amountSpentInput, comparisonInput);

    if (delta > 0) {
      return `${formatMoneyValue(delta)}${currencySymbol} risparmiati scegliendo meglio`;
    }

    if (delta < 0) {
      return `${formatMoneyValue(Math.abs(delta))}${currencySymbol} spesi in più del confronto`;
    }

    return "in linea con il confronto";
  }

  return "spesa registrata";
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
  const currencySymbol = useCurrencySymbol();
  const formRef = useRef<HTMLFormElement>(null);
  const didHandleSuccessRef = useRef(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const [mode, setMode] = useState<EntryMode>("spent");
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
  const [paymentMode, setPaymentMode] = useState<EntryPaymentModeValue>(() =>
    normalizeEntryPaymentMode(entry.paymentMode),
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

  const canUseJointPayment = members.length === 2;
  const effectivePaymentMode = canUseJointPayment ? paymentMode : "single_payer";
  const savingContext: EntrySavingContext = showComparison ? "comparison" : "none";
  const entryIntent = getEntryIntent(showComparison, effectivePaymentMode);
  const hiddenAmountSpent = toHiddenMoneyValue(amountSpentInput);
  const hiddenComparisonAmount = showComparison ? toHiddenMoneyValue(comparisonInput) : "";
  const primaryFieldError = getPrimaryFieldError(state.errors);
  const comparisonFieldError = getComparisonFieldError(state.errors);
  const comparisonDelta = getMoneyDelta(amountSpentInput, comparisonInput);
  const showLargeComparisonWarning =
    showComparison &&
    comparisonInput.trim().length > 0 &&
    Math.abs(comparisonDelta) >= 100;
  const summaryAmount = formatMoneyPreview(amountSpentInput);

  function handleModeChange(nextMode: EntryMode) {
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
        <input type="hidden" name="paymentMode" value={effectivePaymentMode} />
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
            <Mono className="text-xl text-muted-foreground">{currencySymbol}</Mono>
          </div>
          <Serif className="mt-3 block text-sm text-ink-3">
            {getSummaryText(savingContext, amountSpentInput, comparisonInput, currencySymbol)}
          </Serif>
        </section>
        <Rule />

        {state.message ? (
          <div
            className={cn(
              "mx-5 my-4 rounded-[var(--r-control)] border px-4 py-3 text-sm",
              state.success
                ? "border-green/30 text-green"
                : "border-destructive/30 text-destructive",
            )}
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
                Pagata insieme
              </button>
            ) : null}
          </div>
          <p className="mt-3 text-center text-xs leading-5 text-ink-3">
            {entryIntent === "spent"
              ? "Registra solo il denaro uscito davvero."
              : entryIntent === "comparison"
                ? "Usalo quando hai scelto un'opzione più economica."
                : "Entrambi avete pagato la vostra metà."}
          </p>
        </div>

        <div className="px-5 pb-2">
          <Label className="mb-3 block">Categoria</Label>
          <div className="flex gap-5 overflow-x-auto pb-1" role="group" aria-label="Categoria">
            {categories.map((cat) => {
              const selected = categoryId === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  aria-pressed={selected}
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
          <label htmlFor="entry-title" className="flex items-center justify-between gap-4 border-y border-line py-[var(--sp-field-y)]">
            <input
              id="entry-title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Pranzo"
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3/70"
              aria-invalid={Boolean(state.errors?.title)}
              aria-describedby={state.errors?.title ? "entry-title-error" : undefined}
            />
            <Label>Cosa</Label>
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
                placeholder="12,00"
                className="min-w-0 flex-1 bg-transparent font-num text-sm outline-none placeholder:text-ink-3/70"
                aria-invalid={Boolean(primaryFieldError)}
              />
              <Label>Quanto hai speso</Label>
            </label>
            <FormFieldError message={primaryFieldError} />
          </div>

          <>
            <button
              type="button"
              onClick={() => {
                setPaymentMode("single_payer");
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
              <div className="border-y border-line py-[var(--sp-field-y)]">
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
                  <p className="mt-2 rounded-[var(--r-control)] border border-warm/25 bg-warm/5 px-3 py-2 text-xs font-medium leading-5 text-warm">
                    Questo confronto pesa molto sulle statistiche.
                  </p>
                ) : null}
                <FormFieldError message={comparisonFieldError} />
              </div>
            ) : null}
          </>
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
                <label htmlFor="edit-date" className="font-num text-[10px] font-normal uppercase tracking-[0.22em] text-ink-3">Data</label>
                <input
                  id="edit-date"
                  name="date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-full bg-transparent py-[var(--sp-stack-sm)] text-sm outline-none"
                  aria-describedby={state.errors?.date ? "edit-date-error" : undefined}
                />
                <FormFieldError id="edit-date-error" message={state.errors?.date} />
              </div>

              <div className="space-y-2 border-b border-line pb-3">
                <label htmlFor="edit-note" className="font-num text-[10px] font-normal uppercase tracking-[0.22em] text-ink-3">Nota</label>
                <textarea
                  id="edit-note"
                  name="note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={2}
                  className="w-full resize-none bg-transparent py-[var(--sp-stack-sm)] text-sm outline-none placeholder:text-ink-3/70"
                  placeholder="Nota opzionale"
                />
              </div>

              {effectivePaymentMode === "joint_account" ? (
                <div className="rounded-[var(--r-control)] border border-line bg-surface-muted/60 px-4 py-3 text-sm leading-6 text-ink-3">
                  Pagata insieme: l&apos;importo vale per entrambi e il saldo
                  considera metà già pagata da ciascuno.
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
              "flex h-[54px] w-full items-center justify-center gap-2 rounded-[var(--r-cta)] text-[15.5px] font-bold",
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
              className="flex items-center justify-center gap-2 rounded-[var(--r-cta)] border border-destructive/40 px-5 py-2.5 text-sm font-semibold text-destructive transition-opacity hover:opacity-80 disabled:opacity-50"
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
