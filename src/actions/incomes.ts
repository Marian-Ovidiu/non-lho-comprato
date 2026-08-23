"use server";

import { revalidatePath, updateTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { withDatabaseRetry } from "@/src/lib/db-retry";
import {
  decryptOptionalText,
  encryptOptionalText,
} from "@/src/lib/field-encryption";
import { prisma } from "@/src/lib/prisma";
import {
  getCurrentUser,
  getCurrentWorkspaceId,
  getCurrentWorkspaceMembers,
  getCurrentWorkspaceTimezone,
} from "@/src/lib/workspace-context";
import { getDateKey, getTodayDateKey } from "@/src/lib/workspace-dates";

export type IncomeListItem = {
  id: string;
  title: string;
  amount: number;
  dateKey: string;
  receivedByUserId: string | null;
  receivedByLabel: string | null;
  note: string | null;
};

export type IncomeActionResult = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
};

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

/**
 * Le entrate sono poche — lo stipendio, un rimborso, un regalo — e non hanno
 * bisogno di paginazione: si leggono tutte quelle del mese.
 */
export async function getIncomesForMonth(
  monthKey: string,
): Promise<IncomeListItem[]> {
  const [workspaceId, members, timezone] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentWorkspaceMembers(),
    getCurrentWorkspaceTimezone(),
  ]);

  const [year, month] = monthKey.split("-").map(Number);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return [];
  }

  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));

  const rows = await withDatabaseRetry(() =>
    prisma.income.findMany({
      where: { workspaceId, date: { gte: from, lt: to } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        amount: true,
        date: true,
        receivedByUserId: true,
        note: true,
      },
    }),
  );

  const labels = new Map(
    members.map((member) => [member.userId, member.label] as const),
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    amount: toNumber(row.amount),
    dateKey: getDateKey(row.date, timezone),
    receivedByUserId: row.receivedByUserId,
    receivedByLabel: row.receivedByUserId
      ? (labels.get(row.receivedByUserId) ?? null)
      : null,
    note: decryptOptionalText(row.note),
  }));
}

export async function createIncomeAction(
  formData: FormData,
): Promise<IncomeActionResult> {
  try {
    const [workspaceId, currentUser, members, timezone] = await Promise.all([
      getCurrentWorkspaceId(),
      getCurrentUser(),
      getCurrentWorkspaceMembers(),
      getCurrentWorkspaceTimezone(),
    ]);

    const errors: Record<string, string> = {};

    const title = String(formData.get("title") ?? "").trim();
    if (title.length < 2) {
      errors.title = "Serve un titolo di almeno due caratteri.";
    }

    const amount = Number(
      String(formData.get("amount") ?? "").replace(",", "."),
    );
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.amount = "L'importo deve essere maggiore di zero.";
    }

    const dateKey =
      String(formData.get("date") ?? "").trim() || getTodayDateKey(timezone);
    const date = new Date(`${dateKey}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      errors.date = "Data non valida.";
    }

    /* Un'entrata arriva sempre su un conto personale. Sul conto comune i soldi
       ci arrivano solo versati da qualcuno, e quello e' un giroconto: vedi
       src/actions/transfers.ts. Il campo vuoto qui significava "comune" fino
       alla migrazione dei trasferimenti, per questo lo rifiutiamo invece di
       interpretarlo -- indovinare avrebbe attribuito a una persona un'entrata
       che chi scrive voleva mettere altrove. */
    const receivedByUserId = String(
      formData.get("receivedByUserId") ?? "",
    ).trim();

    if (!receivedByUserId) {
      errors.receivedByUserId = "Scegli chi ha incassato l'entrata.";
    } else if (!members.some((member) => member.userId === receivedByUserId)) {
      errors.receivedByUserId = "Persona non valida per questo spazio.";
    }

    if (Object.keys(errors).length > 0) {
      return { success: false, message: "Controlla i campi.", errors };
    }

    await withDatabaseRetry(() =>
      prisma.income.create({
        data: {
          workspaceId,
          title,
          amount: amount.toFixed(2),
          date,
          receivedByUserId,
          createdByUserId: currentUser.id,
          note: encryptOptionalText(
            String(formData.get("note") ?? "").trim() || null,
          ),
        },
      }),
    );

    revalidatePath("/");
    revalidatePath("/entries");
    updateTag(`entries:${workspaceId}`);

    return { success: true, message: "Entrata registrata." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to create income:", error);
    return {
      success: false,
      message: "Non sono riuscito a registrare l'entrata.",
    };
  }
}

export async function getIncomeById(
  incomeId: string,
): Promise<IncomeListItem | null> {
  const [workspaceId, members, timezone] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentWorkspaceMembers(),
    getCurrentWorkspaceTimezone(),
  ]);

  const row = await withDatabaseRetry(() =>
    prisma.income.findFirst({
      where: { id: incomeId, workspaceId },
      select: {
        id: true,
        title: true,
        amount: true,
        date: true,
        receivedByUserId: true,
        note: true,
      },
    }),
  );

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    amount: toNumber(row.amount),
    dateKey: getDateKey(row.date, timezone),
    receivedByUserId: row.receivedByUserId,
    receivedByLabel: row.receivedByUserId
      ? (members.find((member) => member.userId === row.receivedByUserId)
          ?.label ?? null)
      : null,
    note: decryptOptionalText(row.note),
  };
}

/**
 * Fino a ieri un'entrata sbagliata restava sbagliata: si poteva solo creare.
 * Un numero che non si puo' correggere e in cui il saldo crede e' peggio di
 * un numero che non c'e'.
 */
export async function updateIncomeAction(
  incomeId: string,
  formData: FormData,
): Promise<IncomeActionResult> {
  try {
    const [workspaceId, members, timezone] = await Promise.all([
      getCurrentWorkspaceId(),
      getCurrentWorkspaceMembers(),
      getCurrentWorkspaceTimezone(),
    ]);

    const errors: Record<string, string> = {};

    const title = String(formData.get("title") ?? "").trim();
    if (title.length < 2) {
      errors.title = "Serve un titolo di almeno due caratteri.";
    }

    const amount = Number(
      String(formData.get("amount") ?? "").replace(",", "."),
    );
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.amount = "L'importo deve essere maggiore di zero.";
    }

    const dateKey =
      String(formData.get("date") ?? "").trim() || getTodayDateKey(timezone);
    const date = new Date(`${dateKey}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      errors.date = "Data non valida.";
    }

    const receivedByUserId = String(
      formData.get("receivedByUserId") ?? "",
    ).trim();

    if (!receivedByUserId) {
      errors.receivedByUserId = "Scegli chi ha incassato l'entrata.";
    } else if (!members.some((member) => member.userId === receivedByUserId)) {
      errors.receivedByUserId = "Persona non valida per questo spazio.";
    }

    if (Object.keys(errors).length > 0) {
      return { success: false, message: "Controlla i campi.", errors };
    }

    /* Come per la cancellazione: senza il filtro sullo spazio un id indovinato
       riscriverebbe l'entrata di qualcun altro. */
    const updated = await withDatabaseRetry(() =>
      prisma.income.updateMany({
        where: { id: incomeId, workspaceId },
        data: {
          title,
          amount: amount.toFixed(2),
          date,
          receivedByUserId,
          note: encryptOptionalText(
            String(formData.get("note") ?? "").trim() || null,
          ),
        },
      }),
    );

    if (updated.count === 0) {
      return { success: false, message: "Entrata non trovata." };
    }

    revalidatePath("/");
    revalidatePath("/entries");
    updateTag(`entries:${workspaceId}`);

    return { success: true, message: "Entrata aggiornata." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to update income:", error);
    return {
      success: false,
      message: "Non sono riuscito ad aggiornare l'entrata.",
    };
  }
}

export async function deleteIncomeAction(
  incomeId: string,
): Promise<IncomeActionResult> {
  try {
    const workspaceId = await getCurrentWorkspaceId();

    /* Il filtro sullo spazio non e' ridondante: senza, un id indovinato
       cancellerebbe l'entrata di qualcun altro. */
    const deleted = await withDatabaseRetry(() =>
      prisma.income.deleteMany({ where: { id: incomeId, workspaceId } }),
    );

    if (deleted.count === 0) {
      return { success: false, message: "Entrata non trovata." };
    }

    revalidatePath("/");
    revalidatePath("/entries");
    updateTag(`entries:${workspaceId}`);

    return { success: true, message: "Entrata eliminata." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to delete income:", error);
    return { success: false, message: "Non sono riuscito a eliminare." };
  }
}
