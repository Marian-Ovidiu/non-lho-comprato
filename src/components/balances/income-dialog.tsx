"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, X } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createIncomeAction } from "@/src/actions/incomes";
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

export type IncomeMemberOption = {
  userId: string;
  label: string;
};

/** Il conto comune non è una persona: nel modulo viaggia come stringa vuota. */
const JOINT_ACCOUNT = "";

/**
 * Il pannello dell'entrata: quattro righe, stessa grammatica dell'aggiunta
 * rapida. Le entrate restano volutamente marginali — ci si arriva da una riga
 * quieta in cima alla scheda del saldo, non da un gesto dell'app — ma una volta
 * aperto il pannello deve avere la stessa cura di quello delle spese, perché è
 * lo stesso lavoro: dire un numero e da dove viene.
 */
export function IncomeDialog({
  open,
  onClose,
  members,
  currentUserId,
  isShared,
  todayDateKey,
}: {
  open: boolean;
  onClose: () => void;
  members: IncomeMemberOption[];
  currentUserId: string;
  isShared: boolean;
  todayDateKey: string;
}) {
  const t = useTranslations();
  const currencySymbol = useCurrencySymbol();
  const { locale } = useLocaleFormatters();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dateKey, setDateKey] = useState(todayDateKey);
  const [account, setAccount] = useState(currentUserId);
  const keyboardInset = useKeyboardInset(open);

  /* Si svuota chiudendo, non aprendo: chiudere è un evento. Stessa strada
     dell'aggiunta rapida. */
  function close() {
    setTitle("");
    setAmount("");
    setDateKey(todayDateKey);
    setAccount(currentUserId);
    setErrors({});
    onClose();
  }

  /* Le stesse tre condizioni che il server verifica. Il pulsante non inventa
     una regola: mostra prima quella che esiste già. */
  const parsedAmount = parseMoneyString(amount);
  const canSubmit =
    title.trim().length >= 2 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    isDateKey(dateKey) &&
    !pending;

  const accountOptions = [
    ...members.map((member) => ({
      value: member.userId,
      label: member.label,
    })),
    { value: JOINT_ACCOUNT, label: t.balances.incomeJointShort },
  ];

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await createIncomeAction(formData);

      if (!result.success) {
        setErrors(result.errors ?? {});
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
                {t.balances.incomeTitle}
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
            <input
              type="hidden"
              name="receivedByUserId"
              value={isShared ? account : currentUserId}
            />

            <div className="px-4">
              <div className={PANEL_SLAB_CLASS}>
                {/* Il titolo prende la riga intera e non ha etichetta: è
                    l'unico campo a testo libero, di lunghezza imprevedibile, e
                    il segnaposto dice cosa scrivere meglio di quanto lo direbbe
                    la parola «Cos'è» sospesa sopra il vuoto. */}
                <div className="px-3.5 py-2.5">
                  <label htmlFor="income-title" className="sr-only">
                    {t.balances.incomeTitleLabel}
                  </label>
                  <input
                    id="income-title"
                    name="title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={t.balances.incomeTitlePlaceholder}
                    autoComplete="off"
                    enterKeyHint="next"
                    aria-invalid={Boolean(errors.title)}
                    className={cn(
                      "h-9 w-full min-w-0 bg-transparent text-[16px] font-medium text-foreground outline-none",
                      "placeholder:font-normal placeholder:text-ink-3/75",
                    )}
                  />
                  <FormFieldError message={errors.title} className="text-xs" />
                </div>

                <PanelRow
                  label={t.balances.incomeAmountLabel}
                  labelFor="income-amount"
                >
                  <div className="ml-auto flex min-w-0 items-baseline justify-end gap-1">
                    <span
                      className={PANEL_MONEY_SYMBOL_CLASS}
                      aria-hidden="true"
                    >
                      {currencySymbol}
                    </span>
                    <input
                      id="income-amount"
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
                    row: t.balances.incomeDateLabel,
                    group: t.balances.incomeDateLabel,
                    today: t.quickAdd.todayButton,
                    yesterday: t.quickAdd.yesterdayButton,
                    other: t.quickAdd.otherDateButton,
                    otherAria: t.quickAdd.otherDateLabel,
                  }}
                />

                {/* Su quale conto è arrivata: una scelta sola fra tre, quindi un
                    segmentato. Negli spazi privati la domanda non esiste — il
                    conto è uno — e la riga non c'è. */}
                {isShared ? (
                  <PanelRow label={t.balances.incomeWhoLabel}>
                    <div
                      role="group"
                      aria-label={t.balances.incomeAccountGroupLabel}
                      className={segmentGroupClassName(3)}
                    >
                      {accountOptions.map((option) => (
                        <button
                          key={option.value || "joint"}
                          type="button"
                          className={segmentClassName(account === option.value)}
                          aria-pressed={account === option.value}
                          onClick={() => setAccount(option.value)}
                        >
                          <span className="truncate">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </PanelRow>
                ) : null}
              </div>

              <FormFieldError
                message={errors.amount ?? errors.receivedByUserId ?? errors.date}
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
                {t.balances.incomeSaveButton}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
