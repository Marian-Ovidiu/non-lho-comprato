/**
 * Il saldo: quanti soldi ci sono, non quanti se ne dovrebbero spendere.
 *
 * Non si memorizza. Un saldo salvato andrebbe riscritto a ogni movimento
 * creato, modificato, cancellato o importato, e prima o poi divergerebbe in
 * silenzio da quello che i movimenti raccontano. Calcolarlo ogni volta dal
 * punto di partenza costa tre somme ed e' sempre d'accordo con i dati.
 *
 * La regola di chi paga e' una sola: **il saldo segue i soldi**. Se paghi tu
 * una spesa che vale per entrambi, dal tuo saldo escono i soldi interi, perche'
 * interi sono usciti dal tuo conto. Che meta' competa all'altra persona non e'
 * un fatto del saldo, e' un debito: lo racconta il dare/avere, che nell'app
 * esiste gia' (getWorkspaceBalance).
 *
 * Farlo all'inverso — meta' dal tuo saldo e meta' dal suo — renderebbe
 * entrambi i saldi ottimisti: sui dati reali di questo spazio, dopo quattro
 * mesi, di 770 e 1022 euro rispettivamente.
 */

import { round2 } from "@/src/lib/money-number";

export type BalanceStart = {
  amount: number;
  /** Chiave del giorno, YYYY-MM-DD: prima di questo il passato non conta. */
  dateKey: string;
};

export type BalanceMovement = {
  dateKey: string;
  amount: number;
};

export type BalanceState =
  | { configured: false }
  | {
      configured: true;
      start: BalanceStart;
      incoming: number;
      outgoing: number;
      current: number;
    };

/**
 * Un movimento conta solo se e' successo dal giorno di partenza in poi. E'
 * quello che rende l'aggiunta dei saldi indolore su chi usa l'app da mesi:
 * imposti il saldo oggi e i movimenti di ieri non lo toccano.
 */
export function countsTowardBalance(
  movementDateKey: string,
  startDateKey: string,
): boolean {
  return movementDateKey >= startDateKey;
}

export function computeBalance(
  start: BalanceStart | null,
  incoming: BalanceMovement[],
  outgoing: BalanceMovement[],
): BalanceState {
  if (!start) {
    return { configured: false };
  }

  const sum = (movements: BalanceMovement[]) =>
    movements.reduce(
      (total, movement) =>
        countsTowardBalance(movement.dateKey, start.dateKey)
          ? total + movement.amount
          : total,
      0,
    );

  const incomingTotal = round2(sum(incoming));
  const outgoingTotal = round2(sum(outgoing));

  return {
    configured: true,
    start,
    incoming: incomingTotal,
    outgoing: outgoingTotal,
    // Puo' andare sotto zero, ed e' giusto cosi': un conto in rosso e' un
    // fatto, non un errore da nascondere.
    current: round2(start.amount + incomingTotal - outgoingTotal),
  };
}
