/**
 * Il netto del mese: sono entrati più soldi di quanti ne sono usciti?
 *
 * È la domanda da cui è partita tutta questa funzione, ed è più modesta del
 * saldo. Il saldo dichiara *quanto hai* e per essere vero pretende che ogni
 * euro passi dall'app. Il netto confronta due cose che hai registrato, e resta
 * vero anche se registri metà della tua vita.
 *
 * **I giroconti non entrano, e non è un dettaglio: è il motivo per cui esistono
 * come movimento separato.** Versare 400 sul conto comune non è un'entrata —
 * quei soldi erano già in casa. Se contassero, uno stipendio da 1000 più un
 * versamento da 400 farebbero un mese da 1400 di entrate, e il numero
 * mentirebbe proprio nel mese in cui lo guardi con più attenzione. Per questo
 * questa funzione non riceve nemmeno i giroconti: non deve poterli sommare
 * neanche per sbaglio.
 *
 * Il netto è dello spazio, non della persona. Le spese cointestate escono dal
 * conto comune e non dal tuo, le entrate di entrambi sono già visibili a
 * entrambi: dividerlo per persona darebbe due numeri che non rispondono alla
 * domanda che è stata fatta.
 */

import { round2 } from "@/src/lib/money-number";

export type MonthlyNet = {
  incoming: number;
  outgoing: number;
  /** Positivo se il mese chiude in attivo. Può essere negativo, ed è un fatto. */
  net: number;
};

export function computeMonthlyNet(
  incomeAmounts: number[],
  spentAmounts: number[],
): MonthlyNet {
  const somma = (valori: number[]) =>
    round2(valori.reduce((totale, valore) => totale + valore, 0));

  const incoming = somma(incomeAmounts);
  const outgoing = somma(spentAmounts);

  return { incoming, outgoing, net: round2(incoming - outgoing) };
}
