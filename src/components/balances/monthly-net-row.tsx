"use client";

import { Amount, Eyebrow, Serif } from "@/components/crafted";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/src/components/language/language-context";
import type { MonthlyNet } from "@/src/features/balances/monthly-net";

/**
 * La riga che risponde alla domanda da cui è nato tutto: questo mese sono
 * entrati più soldi di quanti ne sono usciti?
 *
 * Sta sotto i saldi e non sopra perché è una cosa diversa e più piccola. Il
 * saldo dichiara quanto hai e pretende che ogni euro passi dall'app; questo
 * confronta due somme che hai registrato, e vale anche se ne registri metà.
 *
 * Il netto non è colorato di rosso quando è negativo. Un mese in cui esce più
 * di quanto entra non è un errore da segnalare — succede a chi compra una
 * lavatrice — e tingerlo lo trasformerebbe in un rimprovero. È il segno a dire
 * il verso, e la riga sotto a dirlo a parole.
 */
export function MonthlyNetRow({ net }: { net: MonthlyNet }) {
  const t = useTranslations();
  const isEmpty = net.incoming === 0 && net.outgoing === 0;

  if (isEmpty) {
    return null;
  }

  return (
    <div className="mt-3 border-t border-line-soft pt-3">
      <div className="flex items-baseline justify-between gap-3">
        <Eyebrow>{t.balances.netThisMonth}</Eyebrow>
        <div className="flex shrink-0 items-baseline gap-3 text-[12px] text-muted-foreground">
          <span className="flex items-baseline gap-1">
            {t.balances.incomingLabel}
            <Amount value={net.incoming} sign="plus" className="text-[12px]" />
          </span>
          <span className="flex items-baseline gap-1">
            {t.balances.outgoingLabel}
            <Amount value={net.outgoing} className="text-[12px]" />
          </span>
        </div>
      </div>

      <div className="mt-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium">{t.balances.netLabel}</span>
        <Amount
          value={net.net}
          sign="delta"
          className={cn("shrink-0 text-[17px] font-semibold")}
        />
      </div>

      <Serif className="mt-1 block text-[13px] text-muted-foreground">
        {net.net >= 0
          ? t.balances.netPositiveNote
          : t.balances.netNegativeNote}
      </Serif>
    </div>
  );
}
