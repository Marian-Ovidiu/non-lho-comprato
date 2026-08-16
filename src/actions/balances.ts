"use server";

import { revalidatePath, updateTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import {
  computeBalance,
  type BalanceState,
} from "@/src/features/balances/balance";
import { splitBalanceMovements } from "@/src/features/balances/split";
import { withDatabaseRetry } from "@/src/lib/db-retry";
import { prisma } from "@/src/lib/prisma";
import {
  getCurrentUser,
  getCurrentWorkspaceId,
  getCurrentWorkspaceMembers,
  getCurrentWorkspaceTimezone,
} from "@/src/lib/workspace-context";
import { getDateKey, getTodayDateKey } from "@/src/lib/workspace-dates";

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
 */
export async function getWorkspaceBalances(): Promise<WorkspaceBalances> {
  const [workspaceId, currentUser, members, timezone] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUser(),
    getCurrentWorkspaceMembers(),
    getCurrentWorkspaceTimezone(),
  ]);

  const isShared = members.length > 1;

  const [membership, workspace, entries, incomes] = await withDatabaseRetry(() =>
    Promise.all([
      prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId: currentUser.id },
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
          realCost: true,
          date: true,
          paidByUserId: true,
          paymentMode: true,
        },
      }),
      prisma.income.findMany({
        where: { workspaceId },
        select: { amount: true, date: true, receivedByUserId: true },
      }),
    ]),
  );

  const { personalIn, personalOut, jointIn, jointOut } = splitBalanceMovements(
    entries.map((entry) => ({
      dateKey: getDateKey(entry.date, timezone),
      amount: toNumber(entry.realCost),
      paidByUserId: entry.paidByUserId,
      isJointAccount: entry.paymentMode === "joint_account",
    })),
    incomes.map((income) => ({
      dateKey: getDateKey(income.date, timezone),
      amount: toNumber(income.amount),
      receivedByUserId: income.receivedByUserId,
    })),
    currentUser.id,
  );

  const personalStart =
    membership?.balanceStart != null && membership.balanceStartDate
      ? {
          amount: toNumber(membership.balanceStart),
          dateKey: getDateKey(membership.balanceStartDate, timezone),
        }
      : null;

  const jointStart =
    workspace?.jointBalanceStart != null && workspace.jointBalanceStartDate
      ? {
          amount: toNumber(workspace.jointBalanceStart),
          dateKey: getDateKey(workspace.jointBalanceStartDate, timezone),
        }
      : null;

  return {
    personal: computeBalance(personalStart, personalIn, personalOut),
    joint: isShared ? computeBalance(jointStart, jointIn, jointOut) : null,
    isShared,
  };
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
