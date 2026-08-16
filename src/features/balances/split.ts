/**
 * Quale saldo tocca ogni movimento.
 *
 * È la regola centrale della funzione, ed è una sola: **il saldo segue i
 * soldi**. Non le competenze, non chi ne ha beneficiato — chi ha materialmente
 * pagato. Una spesa tocca un saldo solo, mai due.
 *
 *   - segnata cointestata  → esce dal conto comune, chiunque l'abbia inserita
 *   - pagata da me         → esce dal mio, per intero, anche se vale per due
 *   - pagata dall'altro    → non tocca il mio saldo (e il suo non lo vedo)
 *
 * La metà che compete all'altra persona non sparisce: diventa un debito, e lo
 * racconta il dare/avere che l'app calcola già altrove.
 */

import type { BalanceMovement } from "@/src/features/balances/balance";

export type BalanceEntryInput = {
  dateKey: string;
  amount: number;
  paidByUserId: string | null;
  isJointAccount: boolean;
};

export type BalanceIncomeInput = {
  dateKey: string;
  amount: number;
  /** Nullo significa incassata sul conto comune. */
  receivedByUserId: string | null;
};

export type BalanceMovements = {
  personalIn: BalanceMovement[];
  personalOut: BalanceMovement[];
  jointIn: BalanceMovement[];
  jointOut: BalanceMovement[];
};

export function splitBalanceMovements(
  entries: BalanceEntryInput[],
  incomes: BalanceIncomeInput[],
  currentUserId: string,
): BalanceMovements {
  const result: BalanceMovements = {
    personalIn: [],
    personalOut: [],
    jointIn: [],
    jointOut: [],
  };

  for (const entry of entries) {
    const movement = { dateKey: entry.dateKey, amount: entry.amount };

    if (entry.isJointAccount) {
      result.jointOut.push(movement);
      continue;
    }

    if (entry.paidByUserId === currentUserId) {
      result.personalOut.push(movement);
    }
  }

  for (const income of incomes) {
    const movement = { dateKey: income.dateKey, amount: income.amount };

    if (!income.receivedByUserId) {
      result.jointIn.push(movement);
      continue;
    }

    if (income.receivedByUserId === currentUserId) {
      result.personalIn.push(movement);
    }
  }

  return result;
}
