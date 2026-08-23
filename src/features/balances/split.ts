/**
 * Quale saldo tocca ogni movimento.
 *
 * È la regola centrale della funzione, ed è una sola: **il saldo segue i
 * soldi**. Non le competenze, non chi ne ha beneficiato — chi ha materialmente
 * pagato o incassato. Un movimento tocca un saldo solo, mai due, con l'unica
 * eccezione dichiarata del giroconto, che di mestiere ne tocca due.
 *
 *   - spesa cointestata    → esce dal conto comune, chiunque l'abbia inserita
 *   - spesa pagata da me   → esce dal mio, per intero, anche se vale per due
 *   - spesa pagata dall'altro → non tocca il mio saldo (e il suo non lo vedo)
 *   - entrata              → entra sul conto personale di chi l'ha incassata,
 *                            mai sul comune: sul comune i soldi ci arrivano
 *                            solo versati da qualcuno, ed è un giroconto
 *   - giroconto            → esce da un conto ed entra nell'altro, stesso
 *                            importo, stessa data
 *   - regolamento          → esce dal conto di chi paga ed entra in quello di
 *                            chi incassa: due persone, mai il comune
 *
 * La metà che compete all'altra persona non sparisce: diventa un debito, e lo
 * racconta il dare/avere che l'app calcola già altrove. Quando quel debito
 * viene pareggiato, il regolamento sposta soldi veri: per mesi i saldi non
 * l'hanno visto, ed erano due numeri sbagliati in silenzio. Il giroconto invece
 * non è né una spesa né un'entrata: la ricchezza di casa non cambia di un
 * euro, si sposta soltanto, ed è per questo che il netto del mese lo ignora.
 *
 * Il conto comune conta sempre, il personale solo quando è il tuo: il comune è
 * di entrambi, mentre il saldo dell'altra persona non esce da qui.
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
  /** Nullo significa persona non più nello spazio, non conto comune. */
  receivedByUserId: string | null;
};

export type BalanceTransferInput = {
  dateKey: string;
  /** Sempre positivo: il verso lo dice `direction`. */
  amount: number;
  /** Chi versa o preleva. L'altro capo è sempre il conto comune. */
  userId: string | null;
  direction: "to_joint" | "to_personal";
};

export type BalanceSettlementInput = {
  dateKey: string;
  amount: number;
  /** Chi paga. */
  fromUserId: string;
  /** Chi incassa. */
  toUserId: string;
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
  transfers: BalanceTransferInput[],
  settlements: BalanceSettlementInput[],
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
    /* Un'entrata orfana — chi l'aveva incassata non è più nello spazio — non
       entra in nessun saldo. Metterla sul comune sarebbe la vecchia regola,
       ed è quella che confondeva "di nessuno" con "di tutti e due". */
    if (income.receivedByUserId === currentUserId) {
      result.personalIn.push({
        dateKey: income.dateKey,
        amount: income.amount,
      });
    }
  }

  for (const transfer of transfers) {
    const movement = { dateKey: transfer.dateKey, amount: transfer.amount };
    const isMine = transfer.userId === currentUserId;

    if (transfer.direction === "to_joint") {
      result.jointIn.push(movement);
      if (isMine) {
        result.personalOut.push(movement);
      }
      continue;
    }

    result.jointOut.push(movement);
    if (isMine) {
      result.personalIn.push(movement);
    }
  }

  /* Un regolamento non tocca mai il conto comune: e' un pareggio fra due
     persone. Per questo non ha bisogno della guardia sulle date che serve al
     giroconto — li' due saldi visibili sulla stessa schermata potevano
     contarlo in modo diverso, qui i due saldi coinvolti sono privati e non si
     vedono mai insieme. */
  for (const settlement of settlements) {
    const movement = { dateKey: settlement.dateKey, amount: settlement.amount };

    if (settlement.fromUserId === currentUserId) {
      result.personalOut.push(movement);
      continue;
    }

    if (settlement.toUserId === currentUserId) {
      result.personalIn.push(movement);
    }
  }

  return result;
}
