/**
 * L'estratto dei saldi: riga per riga, che cosa ha mosso ogni conto.
 *
 * Esiste per il giorno in cui il saldo dell'app e quello della banca non
 * coincidono. Un numero solo non dice dove sta l'errore; un elenco con il
 * saldo progressivo si confronta con l'estratto conto vero, e la prima riga
 * dove i due si separano e' quella da guardare.
 *
 * Non decide niente da se': quale conto tocca ogni movimento lo ha gia' deciso
 * splitBalanceMovements, e qui arriva gia' smistato. Rifare quelle regole in un
 * secondo posto vorrebbe dire, prima o poi, un estratto che spiega un saldo
 * diverso da quello mostrato.
 */

import {
  countsTowardBalance,
  type BalanceMovement,
  type BalanceMovementRef,
  type BalanceStart,
} from "@/src/features/balances/balance";
import { round2 } from "@/src/lib/money-number";

export const BALANCE_LEDGER_COLUMNS = [
  "account",
  "date",
  "kind",
  "title",
  "direction",
  "amount",
  "countsTowardBalance",
  "runningBalance",
  "id",
  "createdAt",
] as const;

export type BalanceLedgerAccount = {
  label: string;
  /**
   * Nullo quando il saldo non e' impostato, o quando il conto e' dell'altra
   * persona: il suo saldo non esce da qui, i suoi movimenti si' — sono gli
   * stessi che l'elenco mostra gia' a entrambi.
   */
  start: BalanceStart | null;
  incoming: BalanceMovement[];
  outgoing: BalanceMovement[];
};

export type BalanceLedgerDetail = {
  title: string;
  createdAt: Date;
};

export type BalanceLedgerRow = {
  account: string;
  date: string;
  kind: "saldo_partenza" | "spesa" | "entrata" | "giroconto" | "regolamento";
  title: string;
  direction: "in" | "out" | "";
  /** Con il segno: positivo entra nel conto, negativo esce. */
  amount: string;
  /** Vuoto dove non c'e' una data di partenza con cui confrontare. */
  countsTowardBalance: "true" | "false" | "";
  runningBalance: string;
  id: string;
  createdAt: string;
};

const KIND_BY_REF: Record<BalanceMovementRef["kind"], BalanceLedgerRow["kind"]> = {
  entry: "spesa",
  income: "entrata",
  transfer: "giroconto",
  settlement: "regolamento",
};

type Pending = {
  movement: BalanceMovement;
  direction: "in" | "out";
  detail: BalanceLedgerDetail | null;
};

function money(value: number): string {
  return round2(value).toFixed(2);
}

export function buildBalanceLedger(
  accounts: BalanceLedgerAccount[],
  describe: (ref: BalanceMovementRef) => BalanceLedgerDetail | null,
): BalanceLedgerRow[] {
  const rows: BalanceLedgerRow[] = [];

  for (const account of accounts) {
    const pending: Pending[] = [
      ...account.incoming.map((movement) => ({
        movement,
        direction: "in" as const,
        detail: movement.ref ? describe(movement.ref) : null,
      })),
      ...account.outgoing.map((movement) => ({
        movement,
        direction: "out" as const,
        detail: movement.ref ? describe(movement.ref) : null,
      })),
    ].sort(
      (left, right) =>
        left.movement.dateKey.localeCompare(right.movement.dateKey) ||
        (left.detail?.createdAt.getTime() ?? 0) -
          (right.detail?.createdAt.getTime() ?? 0) ||
        (left.movement.ref?.id ?? "").localeCompare(right.movement.ref?.id ?? ""),
    );

    const { start } = account;
    let running = start?.amount ?? 0;
    let startWritten = false;

    const writeStart = () => {
      if (!start || startWritten) return;
      startWritten = true;
      rows.push({
        account: account.label,
        date: start.dateKey,
        kind: "saldo_partenza",
        title: "",
        direction: "",
        amount: money(start.amount),
        countsTowardBalance: "true",
        runningBalance: money(start.amount),
        id: "",
        createdAt: "",
      });
    };

    for (const { movement, direction, detail } of pending) {
      /* Il saldo di partenza va prima dei movimenti del suo stesso giorno,
         perche' quei movimenti li conta. */
      if (start && movement.dateKey >= start.dateKey) {
        writeStart();
      }

      const counts = start
        ? countsTowardBalance(movement.dateKey, start.dateKey)
        : null;
      const signed = direction === "in" ? movement.amount : -movement.amount;

      if (counts) {
        running = round2(running + signed);
      }

      rows.push({
        account: account.label,
        date: movement.dateKey,
        kind: movement.ref ? KIND_BY_REF[movement.ref.kind] : "spesa",
        title: detail?.title ?? "",
        direction,
        amount: money(signed),
        countsTowardBalance: counts === null ? "" : counts ? "true" : "false",
        /* Prima della partenza il saldo progressivo non esiste: quei movimenti
           l'app li ignora, e un numero qui farebbe credere il contrario. */
        runningBalance: counts ? money(running) : "",
        id: movement.ref?.id ?? "",
        createdAt: detail?.createdAt.toISOString() ?? "",
      });
    }

    writeStart();
  }

  return rows;
}
