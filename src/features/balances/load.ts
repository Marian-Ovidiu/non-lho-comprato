import "server-only";

import type {
  BalanceMovementRef,
  BalanceStart,
} from "@/src/features/balances/balance";
import type {
  BalanceEntryInput,
  BalanceIncomeInput,
  BalanceSettlementInput,
  BalanceTransferInput,
} from "@/src/features/balances/split";
import { withDatabaseRetry } from "@/src/lib/db-retry";
import { decryptOptionalText } from "@/src/lib/field-encryption";
import { prisma } from "@/src/lib/prisma";
import { getDateKey } from "@/src/lib/workspace-dates";

/** Cosa raccontare di un movimento quando lo si mostra, non quando lo si somma. */
export type BalanceMovementDetail = {
  title: string;
  createdAt: Date;
};

export type BalanceSources = {
  /** Il saldo di partenza di chi chiede. Quello dell'altra persona non si legge nemmeno. */
  personalStart: BalanceStart | null;
  jointStart: BalanceStart | null;
  entries: BalanceEntryInput[];
  incomes: BalanceIncomeInput[];
  transfers: BalanceTransferInput[];
  settlements: BalanceSettlementInput[];
  /** Vuota se non richiesta: la dashboard somma e basta, non deve decifrare note. */
  details: Map<string, BalanceMovementDetail>;
};

export function balanceMovementDetailKey(ref: BalanceMovementRef): string {
  return `${ref.kind}:${ref.id}`;
}

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

/**
 * Tutto quello che entra in un saldo, letto una volta sola. Ci passano sia il
 * saldo della dashboard sia l'estratto: se leggessero ognuno per conto suo,
 * basterebbe un filtro diverso perche' l'estratto spiegasse un numero che la
 * dashboard non mostra.
 */
export async function loadBalanceSources(
  workspaceId: string,
  currentUserId: string,
  timezone: string,
  options: { withDetails?: boolean } = {},
): Promise<BalanceSources> {
  const [membership, workspace, entries, incomes, transfers, settlements] =
    await withDatabaseRetry(() =>
      Promise.all([
        prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: { workspaceId, userId: currentUserId },
          },
          select: { balanceStart: true, balanceStartDate: true },
        }),
        prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: { jointBalanceStart: true, jointBalanceStartDate: true },
        }),
        prisma.entry.findMany({
          where: { workspaceId, mode: { not: "avoided" } },
          select: {
            id: true,
            title: true,
            createdAt: true,
            realCost: true,
            date: true,
            paidByUserId: true,
            paymentMode: true,
          },
        }),
        prisma.income.findMany({
          where: { workspaceId },
          select: {
            id: true,
            title: true,
            createdAt: true,
            amount: true,
            date: true,
            receivedByUserId: true,
          },
        }),
        /* Nessun giroconto puo' esistere in uno spazio privato: il conto comune
         non c'e'. La query resta incondizionata perche' costa meno di un ramo,
         e su uno spazio privato torna vuota. */
        prisma.transfer.findMany({
          where: { workspaceId },
          select: {
            id: true,
            note: true,
            createdAt: true,
            amount: true,
            date: true,
            userId: true,
            direction: true,
          },
        }),
        /* I regolamenti spostano soldi veri fra due persone. Per mesi il saldo
         non li ha visti: pareggiavi un debito, il denaro usciva dal conto, e
         il numero restava fermo. */
        prisma.workspaceSettlement.findMany({
          where: { workspaceId },
          select: {
            id: true,
            note: true,
            createdAt: true,
            amount: true,
            date: true,
            fromUserId: true,
            toUserId: true,
          },
        }),
      ]),
    );

  const details = new Map<string, BalanceMovementDetail>();
  const describe = (
    ref: BalanceMovementRef,
    readTitle: () => string,
    createdAt: Date,
  ): BalanceMovementRef => {
    if (options.withDetails) {
      details.set(balanceMovementDetailKey(ref), {
        title: readTitle(),
        createdAt,
      });
    }
    return ref;
  };

  return {
    personalStart:
      membership?.balanceStart != null && membership.balanceStartDate
        ? {
            amount: toNumber(membership.balanceStart),
            dateKey: getDateKey(membership.balanceStartDate, timezone),
          }
        : null,
    jointStart:
      workspace?.jointBalanceStart != null && workspace.jointBalanceStartDate
        ? {
            amount: toNumber(workspace.jointBalanceStart),
            dateKey: getDateKey(workspace.jointBalanceStartDate, timezone),
          }
        : null,
    entries: entries.map((entry) => ({
      dateKey: getDateKey(entry.date, timezone),
      amount: toNumber(entry.realCost),
      paidByUserId: entry.paidByUserId,
      isJointAccount: entry.paymentMode === "joint_account",
      ref: describe(
        { kind: "entry", id: entry.id },
        () => entry.title,
        entry.createdAt,
      ),
    })),
    incomes: incomes.map((income) => ({
      dateKey: getDateKey(income.date, timezone),
      amount: toNumber(income.amount),
      receivedByUserId: income.receivedByUserId,
      ref: describe(
        { kind: "income", id: income.id },
        () => income.title,
        income.createdAt,
      ),
    })),
    transfers: transfers.map((transfer) => ({
      dateKey: getDateKey(transfer.date, timezone),
      amount: toNumber(transfer.amount),
      userId: transfer.userId,
      direction: transfer.direction,
      ref: describe(
        { kind: "transfer", id: transfer.id },
        () => decryptOptionalText(transfer.note) ?? "",
        transfer.createdAt,
      ),
    })),
    settlements: settlements.map((settlement) => ({
      dateKey: getDateKey(settlement.date, timezone),
      amount: toNumber(settlement.amount),
      fromUserId: settlement.fromUserId,
      toUserId: settlement.toUserId,
      ref: describe(
        { kind: "settlement", id: settlement.id },
        () => decryptOptionalText(settlement.note) ?? "",
        settlement.createdAt,
      ),
    })),
    details,
  };
}
