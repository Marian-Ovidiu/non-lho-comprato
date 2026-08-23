"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, X } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  createTransferAction,
  deleteTransferAction,
  updateTransferAction,
  type TransferListItem,
} from "@/src/actions/transfers";
import { useCurrencySymbol } from "@/src/components/currency/currency-context";
import { useTranslations } from "@/src/components/language/language-context";
import { useLocaleFormatters } from "@/src/components/language/use-locale-formatters";
import {
  normalizeMoneyInput,
  parseMoneyString,
} from "@/src/components/entries/entry-form-money";
import { FormFieldError } from "@/src/components/shared/form-field-error";
import {
  DateSegmentedRow,
  moneyFieldWidth,
  PANEL_BODY_CLASS,
  PANEL_CTA_CLASS,
  PANEL_MONEY_INPUT_CLASS,
  PANEL_MONEY_SYMBOL_CLASS,
  PANEL_SHEET_CLASS,
  PANEL_SLAB_CLASS,
  PanelRow,
  segmentClassName,
  segmentGroupClassName,
} from "@/src/components/shared/panel-grammar";
import { useKeyboardInset } from "@/src/hooks/use-keyboard-inset";
import { isDateKey } from "@/src/lib/workspace-dates";

/**
 * Il pannello del giroconto: stessa grammatica di quello dell'entrata, tre
 * righe invece di quattro.
 *
 * Manca il campo che tutti si aspettano — *chi* — e non è una dimenticanza: un
 * giroconto parte sempre dal conto di chi lo registra. Se ci fosse quel campo,
 * ci sarebbe anche il modo di far scendere il saldo dell'altra persona senza
 * che lei tocchi niente.
 *
 * Manca anche il titolo. Un giroconto è una cosa sola e la dice la direzione:
 * chiedere di battezzarlo sarebbe chiedere di riscrivere ogni volta la stessa
 * parola. Se c'è qualcosa da dire, c'è la nota.
 */
export function TransferDialog({
  open,
  onClose,
  todayDateKey,
  transfer,
}: {
  open: boolean;
  onClose: () => void;
  todayDateKey: string;
  /** Presente solo in modifica: lo stesso pannello, precompilato. */
  transfer?: TransferListItem | null;
}) {
  const t = useTranslations();
  const currencySymbol = useCurrencySymbol();
  const { locale } = useLocaleFormatters();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEdit = Boolean(transfer);
  const [direction, setDirection] = useState<"to_joint" | "to_personal">(
    transfer?.direction ?? "to_joint",
  );
  const [amount, setAmount] = useState(
    transfer ? transfer.amount.toFixed(2).replace(".", ",") : "",
  );
  const [dateKey, setDateKey] = useState(transfer?.dateKey ?? todayDateKey);
  const [note, setNote] = useState(transfer?.note ?? "");
  const keyboardInset = useKeyboardInset(open);

  function close() {
    setDirection("to_joint");
    setAmount("");
    setDateKey(todayDateKey);
    setNote("");
    setErrors({});
    onClose();
  }

  const parsedAmount = parseMoneyString(amount);
  const canSubmit =
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    isDateKey(dateKey) &&
    !pending;

  const directionOptions = [
    { value: "to_joint" as const, label: t.balances.transferToJoint },
    { value: "to_personal" as const, label: t.balances.transferToPersonal },
  ];

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = transfer
        ? await updateTransferAction(transfer.id, formData)
        : await createTransferAction(formData);

      if (!result.success) {
        setErrors(result.errors ?? { amount: result.message });
        return;
      }

      close();
    });
  }

  function remove() {
    if (!transfer) {
      return;
    }

    startTransition(async () => {
      const result = await deleteTransferAction(transfer.id);

      if (!result.success) {
        setErrors({ amount: result.message });
        return;
      }

      close();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        style={{ "--nlc-kb": `${keyboardInset}px` } as React.CSSProperties}
        className={PANEL_SHEET_CLASS}
      >
        <div className={PANEL_BODY_CLASS}>
          <div className="px-4 pt-3.5 pb-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <DialogTitle className="min-w-0 flex-1 text-[17px] font-semibold tracking-tight">
                {isEdit
                  ? t.balances.transferEditTitle
                  : t.balances.transferTitle}
              </DialogTitle>
              <button
                type="button"
                onClick={close}
                className="-mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">{t.balances.close}</span>
              </button>
            </div>
          </div>

          <div className="px-4" aria-hidden="true">
            <span className="block h-px bg-line" />
          </div>

          <form action={submit} className="flex min-w-0 flex-col pt-3.5">
            <input type="hidden" name="date" value={dateKey} />
            <input type="hidden" name="direction" value={direction} />

            <div className="px-4">
              <div className={PANEL_SLAB_CLASS}>
                <PanelRow label={t.balances.transferDirectionLabel}>
                  <div
                    role="group"
                    aria-label={t.balances.transferDirectionLabel}
                    className={segmentGroupClassName(directionOptions.length)}
                  >
                    {directionOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={segmentClassName(direction === option.value)}
                        aria-pressed={direction === option.value}
                        onClick={() => setDirection(option.value)}
                      >
                        <span className="truncate">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </PanelRow>

                <PanelRow
                  label={t.balances.transferAmountLabel}
                  labelFor="transfer-amount"
                >
                  <div className="ml-auto flex min-w-0 items-baseline justify-end gap-1">
                    <span className={PANEL_MONEY_SYMBOL_CLASS} aria-hidden="true">
                      {currencySymbol}
                    </span>
                    <input
                      id="transfer-amount"
                      name="amount"
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(event) =>
                        setAmount(normalizeMoneyInput(event.target.value))
                      }
                      placeholder="0,00"
                      enterKeyHint="done"
                      aria-invalid={Boolean(errors.amount)}
                      style={{ width: moneyFieldWidth(amount) }}
                      className={PANEL_MONEY_INPUT_CLASS}
                    />
                  </div>
                </PanelRow>

                <DateSegmentedRow
                  value={dateKey}
                  onChange={(next) => setDateKey(next)}
                  todayKey={todayDateKey}
                  locale={locale}
                  labels={{
                    row: t.balances.transferDateLabel,
                    group: t.balances.transferDateLabel,
                    today: t.quickAdd.todayButton,
                    yesterday: t.quickAdd.yesterdayButton,
                    other: t.quickAdd.otherDateButton,
                    otherAria: t.quickAdd.otherDateLabel,
                  }}
                />

                <PanelRow
                  label={t.balances.transferNoteLabel}
                  labelFor="transfer-note"
                >
                  <input
                    id="transfer-note"
                    name="note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    autoComplete="off"
                    enterKeyHint="done"
                    className="ml-auto h-9 w-full min-w-0 bg-transparent text-right text-[15px] text-foreground outline-none placeholder:text-ink-3/75"
                  />
                </PanelRow>
              </div>

              <FormFieldError
                message={errors.amount ?? errors.direction ?? errors.date}
                className="mt-2.5 text-[13px]"
              />
            </div>

            <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3.5">
              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  PANEL_CTA_CLASS,
                  canSubmit
                    ? "bg-accent text-accent-foreground active:scale-[0.98] active:opacity-90"
                    : "bg-surface-muted text-muted-foreground",
                )}
              >
                {pending ? (
                  <Loader2
                    className="size-4 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : (
                  <Check className="size-4" aria-hidden="true" />
                )}
                {t.balances.transferSaveButton}
              </button>

              {isEdit ? (
                <button
                  type="button"
                  onClick={remove}
                  disabled={pending}
                  className="mt-2 h-11 w-full rounded-[var(--r-cta)] text-[14px] font-medium text-destructive outline-none transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
                >
                  {t.balances.transferDeleteButton}
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
