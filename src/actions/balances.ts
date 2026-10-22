"use server";

import { revalidatePath, updateTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import {
  computeBalance,
  type BalanceState,
} from "@/src/features/balances/balance";
import {
  computeMonthlyNet,
  type MonthlyNet,
} from "@/src/features/balances/monthly-net";
import { loadBalanceSources } from "@/src/features/balances/load";
import { splitBalanceMovements } from "@/src/features/balances/split";
import { withDatabaseRetry } from "@/src/lib/db-retry";
import { prisma } from "@/src/lib/prisma";
import {
  getCurrentUser,
  getCurrentWorkspaceId,
  getCurrentWorkspaceMembers,
  getCurrentWorkspaceTimezone,
} from "@/src/lib/workspace-context";
import {
  getMonthRangeForMonthKey,
  getTodayDateKey,
  normalizeMonthKey,
} from "@/src/lib/workspace-dates";

export type WorkspaceBalances = {
  /** Il saldo di chi sta guardando. Il saldo dell'altra persona non esce da qui. */
  personal: BalanceState;
  /** Il conto comune. Assente negli spazi privati, dove non esiste. */
  joint: BalanceState | null;
  isShared: boolean;
};

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

/**
 * Il saldo segue i soldi: escono dal conto di chi ha materialmente pagato,
 * per intero, anche quando la spesa vale per due. Le cointestate escono dal
 * comune. Nessuna spesa tocca due saldi.
 *
 * Le entrate arrivano sempre su un conto personale. Sul comune i soldi ci
 * arrivano solo versati da qualcuno, ed e' l'unico movimento che ne tocca due:
 * il giroconto. I regolamenti pareggiano un debito fra due persone e muovono
 * i due conti personali, mai il comune.
 */
export async function getWorkspaceBalances(): Promise<WorkspaceBalances> {
  const [workspaceId, currentUser, members, timezone] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUser(),
    getCurrentWorkspaceMembers(),
    getCurrentWorkspaceTimezone(),
  ]);

  const isShared = members.length > 1;

  const sources = await loadBalanceSources(
    workspaceId,
    currentUser.id,
    timezone,
  );

  const { personalIn, personalOut, jointIn, jointOut } = splitBalanceMovements(
    sources.entries,
    sources.incomes,
    sources.transfers,
    sources.settlements,
    currentUser.id,
  );

  return {
    personal: computeBalance(sources.personalStart, personalIn, personalOut),
    joint: isShared
      ? computeBalance(sources.jointStart, jointIn, jointOut)
      : null,
    isShared,
  };
}

/**
 * Entrate e uscite di un mese, e la loro differenza.
 *
 * I giroconti non compaiono nemmeno nella query: `computeMonthlyNet` non ha un
 * parametro dove metterli, e la lettura non ne ha uno da riempire. Vedi
 * src/features/balances/monthly-net.ts per il perche'.
 */
export async function getMonthlyNet(
  monthKeyInput?: string,
): Promise<MonthlyNet> {
  const [workspaceId, timezone] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentWorkspaceTimezone(),
  ]);

  const monthKey = normalizeMonthKey(timezone, monthKeyInput);
  const { start, end } = getMonthRangeForMonthKey(monthKey, timezone);

  const [incomes, entries] = await withDatabaseRetry(() =>
    Promise.all([
      prisma.income.findMany({
        where: { workspaceId, date: { gte: start, lt: end } },
        select: { amount: true },
      }),
      /* Le evitate restano fuori: sono soldi che non sono usciti, e sommarle
         alle uscite direbbe il contrario di quello che sono. E' lo stesso
         filtro che usa il saldo. */
      prisma.entry.findMany({
        where: {
          workspaceId,
          date: { gte: start, lt: end },
          mode: { not: "avoided" },
        },
        select: { realCost: true },
      }),
    ]),
  );

  return computeMonthlyNet(
    incomes.map((income) => toNumber(income.amount)),
    entries.map((entry) => toNumber(entry.realCost)),
  );
}

export type SetBalanceResult = {
  success: boolean;
  message: string;
};

/**
 * Il saldo personale lo imposta solo il diretto interessato: nessuno sa quanti
 * soldi ha l'altro. Il comune invece puo' dichiararlo chiunque dei due, perche'
 * quel conto e' di entrambi.
 */
export async function setBalanceStartAction(
  target: "personal" | "joint",
  amount: number,
  dateKey?: string,
): Promise<SetBalanceResult> {
  try {
    if (!Number.isFinite(amount)) {
      return { success: false, message: "Importo non valido." };
    }

    const [workspaceId, currentUser, timezone] = await Promise.all([
      getCurrentWorkspaceId(),
      getCurrentUser(),
      getCurrentWorkspaceTimezone(),
    ]);

    const startDateKey = dateKey ?? getTodayDateKey(timezone);
    const startDate = new Date(`${startDateKey}T00:00:00.000Z`);

    if (Number.isNaN(startDate.getTime())) {
      return { success: false, message: "Data non valida." };
    }

    if (target === "joint") {
      const members = await getCurrentWorkspaceMembers();

      if (members.length < 2) {
        return {
          success: false,
          message: "Il conto comune esiste solo negli spazi condivisi.",
        };
      }

      await withDatabaseRetry(() =>
        prisma.workspace.update({
          where: { id: workspaceId },
          data: {
            jointBalanceStart: amount.toFixed(2),
            jointBalanceStartDate: startDate,
          },
        }),
      );
    } else {
      await withDatabaseRetry(() =>
        prisma.workspaceMember.update({
          where: {
            workspaceId_userId: { workspaceId, userId: currentUser.id },
          },
          data: {
            balanceStart: amount.toFixed(2),
            balanceStartDate: startDate,
          },
        }),
      );
    }

    revalidatePath("/");
    updateTag(`entries:${workspaceId}`);

    return { success: true, message: "Saldo impostato." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to set balance start:", error);
    return { success: false, message: "Non sono riuscito a salvare il saldo." };
  }
}
