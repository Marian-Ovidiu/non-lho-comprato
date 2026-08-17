"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { setBalanceStartAction } from "@/src/actions/balances";
import { useTranslations } from "@/src/components/language/language-context";
import { useCurrencySymbol } from "@/src/components/currency/currency-context";
import { useLocaleFormatters } from "@/src/components/language/use-locale-formatters";
import {
  normalizeSignedMoneyInput,
  parseMoneyString,
} from "@/src/components/entries/entry-form-money";
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
} from "@/src/components/shared/panel-grammar";
import { useKeyboardInset } from "@/src/hooks/use-keyboard-inset";
import { isDateKey } from "@/src/lib/workspace-dates";

export type BalanceSetupTarget = "personal" | "joint";

/**
 * Il pannello del saldo di partenza: due domande, due righe.
 *
 * Non inventa una grammatica sua — è quella dell'aggiunta rapida, presa dal
 * modulo condiviso: foglio in basso, una lastra piatta sola, etichetta a
 * sinistra e sostanza a destra su ogni riga. Non c'è indicatore di passo,
 * perché il passo è uno: un indicatore su un pannello a un passo è un ornamento
 * che dice una cosa falsa.
 */
export function BalanceSetupDialog({
  target,
  todayDateKey,
  initial,
  onClose,
  onSaved,
}: {
  target: BalanceSetupTarget | null;
  todayDateKey: string;
  /* Valorizzato quando si sta correggendo un saldo gia' dichiarato: il
     pannello si apre sui numeri di adesso invece che vuoto, perche' chi
     corregge un errore di battitura non vuole riscrivere anche cio' che era
     giusto. Il componente si rimonta quando cambia il bersaglio, quindi questi
     valori entrano dagli inizializzatori e non da un effetto. */
  initial?: { amount: number; dateKey: string } | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const t = useTranslations();
  const currencySymbol = useCurrencySymbol();
  const { locale } = useLocaleFormatters();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(() =>
    initial ? String(initial.amount).replace(".", ",") : "",
  );
  const [dateKey, setDateKey] = useState(initial?.dateKey ?? todayDateKey);
  const [error, setError] = useState<string | null>(null);
  const open = target !== null;
  const keyboardInset = useKeyboardInset(open);

  /* Il pannello si svuota quando si chiude, non quando si apre: chiudere è un
     evento, e un importo lasciato lì da un ripensamento precedente è il modo
     più silenzioso di dichiarare il falso. È la stessa strada dell'aggiunta
     rapida, che azzera la bozza in `onOpenChange`. */
  const isCorrection = Boolean(initial);

  function close() {
    setAmount(initial ? String(initial.amount).replace(".", ",") : "");
    setDateKey(initial?.dateKey ?? todayDateKey);
    setError(null);
    onClose();
  }

  const parsed = parseMoneyString(amount);
  /* Un saldo può essere zero e può essere negativo: l'unica cosa che non può
     essere è vuoto o non un numero. */
  const isAmountReady = amount.trim() !== "" && Number.isFinite(parsed);
  const canSubmit = isAmountReady && isDateKey(dateKey) && !pending;

  function save() {
    if (!isAmountReady) {
      setError(t.balances.invalidAmount);
      return;
    }

    startTransition(async () => {
      const result = await setBalanceStartAction(
        target === "joint" ? "joint" : "personal",
        parsed,
        dateKey,
      );

      if (!result.success) {
        setError(result.message);
        return;
      }

      onSaved?.();
      close();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent
        showCloseButton={false}
        /* Senza DialogDescription, Radix cercherebbe un aria-describedby che
           non esiste: dichiararlo assente evita di puntare al vuoto. */
        aria-describedby={undefined}
        style={{ "--nlc-kb": `${keyboardInset}px` } as React.CSSProperties}
        className={PANEL_SHEET_CLASS}
      >
        <div className={PANEL_BODY_CLASS}>
          <div className="px-4 pt-3.5">
            <div className="flex min-w-0 items-center gap-2">
              <DialogTitle className="min-w-0 flex-1 text-[17px] font-semibold tracking-tight">
                {isCorrection
                  ? t.balances.correctTitle
                  : target === "joint"
                    ? t.balances.setUpTitleJoint
                    : t.balances.setUpTitle}
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

            <p className="mt-1 pb-2.5 text-[12.5px] leading-4 text-muted-foreground">
              {isCorrection ? t.balances.correctDesc : t.balances.setUpDesc}
            </p>
          </div>

          {/* Un passo solo: resta il filetto che chiude l'intestazione. */}
          <div className="px-4" aria-hidden="true">
            <span className="block h-px bg-line" />
          </div>

          <div className="px-4 pt-3.5">
            <div className={PANEL_SLAB_CLASS}>
              <PanelRow label={t.balances.amountLabel} labelFor="balance-amount">
                <div className="ml-auto flex min-w-0 items-baseline justify-end gap-1">
                  <span className={PANEL_MONEY_SYMBOL_CLASS} aria-hidden="true">
                    {currencySymbol}
                  </span>
                  <input
                    id="balance-amount"
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => {
                      setAmount(normalizeSignedMoneyInput(event.target.value));
                      setError(null);
                    }}
                    placeholder="0,00"
                    enterKeyHint="done"
                    aria-invalid={Boolean(error)}
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
                  row: t.balances.fromDateLabel,
                  group: t.balances.fromDateLabel,
                  today: t.quickAdd.todayButton,
                  yesterday: t.quickAdd.yesterdayButton,
                  other: t.quickAdd.otherDateButton,
                  otherAria: t.quickAdd.otherDateLabel,
                }}
              />
            </div>

            {error ? (
              <p
                role="alert"
                className="mt-2.5 text-[13px] leading-5 text-destructive"
              >
                {error}
              </p>
            ) : null}
          </div>

          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3.5">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={save}
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
              {t.balances.saveButton}
            </button>

            {/* Saltare non è un'azione pari al salvataggio, ma dev'essere a un
                tocco: riga di servizio, non secondo pulsante. */}
            <button
              type="button"
              onClick={close}
              className="mt-3 block w-full rounded-[var(--r-control)] py-2 text-center text-[13px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {t.balances.skipButton}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
