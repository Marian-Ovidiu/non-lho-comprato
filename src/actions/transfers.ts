"use server";

import { revalidatePath, updateTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import {
  validateTransfer,
  type TransferDirectionValue,
} from "@/src/features/balances/transfer-rules";
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

export type TransferListItem = {
  id: string;
  amount: number;
  dateKey: string;
  direction: TransferDirectionValue;
  userId: string | null;
  /** Etichetta di chi ha mosso i soldi, o nullo se non e' piu' nello spazio. */
  userLabel: string | null;
  note: string | null;
};

export type TransferActionResult = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
};

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

/**
 * Le date di partenza dei due saldi coinvolti: quello della persona che muove
 * i soldi e quello del conto comune. Servono solo alla regola sulle date, che
 * vive in `transfer-rules`.
 */
async function getBalanceStartDateKeys(
  workspaceId: string,
  userId: string,
  timezone: string,
) {
  const [membership, workspace] = await withDatabaseRetry(() =>
    Promise.all([
      prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
        select: { balanceStartDate: true },
      }),
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { jointBalanceStartDate: true },
      }),
    ]),
  );

  return {
    personalStartDateKey: membership?.balanceStartDate
      ? getDateKey(membership.balanceStartDate, timezone)
      : null,
    jointStartDateKey: workspace?.jointBalanceStartDate
      ? getDateKey(workspace.jointBalanceStartDate, timezone)
      : null,
  };
}

/**
 * I giroconti sono pochi quanto le entrate — si versa sul comune una volta al
 * mese, non dieci volte al giorno — quindi si leggono tutti quelli del mese
 * senza paginazione.
 */
export async function getTransfersForMonth(
  monthKey: string,
): Promise<TransferListItem[]> {
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
    prisma.transfer.findMany({
      where: { workspaceId, date: { gte: from, lt: to } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        amount: true,
        date: true,
        direction: true,
        userId: true,
        note: true,
      },
    }),
  );

  const labels = new Map(
    members.map((member) => [member.userId, member.label] as const),
  );

  return rows.map((row) => ({
    id: row.id,
    amount: toNumber(row.amount),
    dateKey: getDateKey(row.date, timezone),
    direction: row.direction as TransferDirectionValue,
    userId: row.userId,
    userLabel: row.userId ? (labels.get(row.userId) ?? null) : null,
    note: decryptOptionalText(row.note),
  }));
}

type ParsedTransferForm = {
  amount: number;
  dateKey: string;
  direction: unknown;
  note: string | null;
};

/*
 * Il modulo non dice chi muove i soldi, e non e' una dimenticanza: un
 * giroconto parte sempre dal conto di chi lo registra. Se il campo esistesse,
 * esisterebbe anche il modo di far scendere il saldo personale dell'altra
 * persona senza che lei tocchi niente.
 */
function parseTransferForm(
  formData: FormData,
  todayDateKey: string,
): ParsedTransferForm {
  return {
    amount: Number(String(formData.get("amount") ?? "").replace(",", ".")),
    dateKey: String(formData.get("date") ?? "").trim() || todayDateKey,
    direction: String(formData.get("direction") ?? "").trim(),
    note: String(formData.get("note") ?? "").trim() || null,
  };
}

async function validateFromForm(
  parsed: ParsedTransferForm,
  currentUserId: string,
) {
  const [workspaceId, members, timezone] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentWorkspaceMembers(),
    getCurrentWorkspaceTimezone(),
  ]);

  const starts = await getBalanceStartDateKeys(
    workspaceId,
    currentUserId,
    timezone,
  );

  return {
    workspaceId,
    timezone,
    result: validateTransfer({
      amount: parsed.amount,
      dateKey: parsed.dateKey,
      direction: parsed.direction,
      isShared: members.length > 1,
      ...starts,
    }),
  };
}

export async function createTransferAction(
  formData: FormData,
): Promise<TransferActionResult> {
  try {
    const [currentUser, timezone] = await Promise.all([
      getCurrentUser(),
      getCurrentWorkspaceTimezone(),
    ]);

    const parsed = parseTransferForm(formData, getTodayDateKey(timezone));
    const { workspaceId, result } = await validateFromForm(
      parsed,
      currentUser.id,
    );

    if (!result.ok) {
      return {
        success: false,
        message: "Controlla i campi.",
        errors: result.errors,
      };
    }

    await withDatabaseRetry(() =>
      prisma.transfer.create({
        data: {
          workspaceId,
          userId: currentUser.id,
          direction: parsed.direction as TransferDirectionValue,
          amount: parsed.amount.toFixed(2),
          date: new Date(`${parsed.dateKey}T00:00:00.000Z`),
          note: encryptOptionalText(parsed.note),
          createdByUserId: currentUser.id,
        },
      }),
    );

    revalidateTransferViews(workspaceId);

    return { success: true, message: "Giroconto registrato." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to create transfer:", error);
    return {
      success: false,
      message: "Non sono riuscito a registrare il giroconto.",
    };
  }
}

export async function updateTransferAction(
  transferId: string,
  formData: FormData,
): Promise<TransferActionResult> {
  try {
    const [currentUser, timezone] = await Promise.all([
      getCurrentUser(),
      getCurrentWorkspaceTimezone(),
    ]);

    const parsed = parseTransferForm(formData, getTodayDateKey(timezone));
    const { workspaceId, result } = await validateFromForm(
      parsed,
      currentUser.id,
    );

    if (!result.ok) {
      return {
        success: false,
        message: "Controlla i campi.",
        errors: result.errors,
      };
    }

    /* Il filtro su workspace e persona non e' ridondante: senza il primo un id
       indovinato riscriverebbe il giroconto di un altro spazio, senza il
       secondo riscriverebbe quello dell'altra persona -- e i suoi giroconti li
       vede, quindi gli id li ha. */
    const updated = await withDatabaseRetry(() =>
      prisma.transfer.updateMany({
        where: { id: transferId, workspaceId, userId: currentUser.id },
        data: {
          direction: parsed.direction as TransferDirectionValue,
          amount: parsed.amount.toFixed(2),
          date: new Date(`${parsed.dateKey}T00:00:00.000Z`),
          note: encryptOptionalText(parsed.note),
        },
      }),
    );

    if (updated.count === 0) {
      return {
        success: false,
        message: "Giroconto non trovato, o non e' tuo.",
      };
    }

    revalidateTransferViews(workspaceId);

    return { success: true, message: "Giroconto aggiornato." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to update transfer:", error);
    return {
      success: false,
      message: "Non sono riuscito ad aggiornare il giroconto.",
    };
  }
}

export async function deleteTransferAction(
  transferId: string,
): Promise<TransferActionResult> {
  try {
    const [workspaceId, currentUser] = await Promise.all([
      getCurrentWorkspaceId(),
      getCurrentUser(),
    ]);

    const deleted = await withDatabaseRetry(() =>
      prisma.transfer.deleteMany({
        where: { id: transferId, workspaceId, userId: currentUser.id },
      }),
    );

    if (deleted.count === 0) {
      return {
        success: false,
        message: "Giroconto non trovato, o non e' tuo.",
      };
    }

    revalidateTransferViews(workspaceId);

    return { success: true, message: "Giroconto eliminato." };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to delete transfer:", error);
    return {
      success: false,
      message: "Non sono riuscito a eliminare il giroconto.",
    };
  }
}

function revalidateTransferViews(workspaceId: string) {
  revalidatePath("/");
  revalidatePath("/entries");
  updateTag(`entries:${workspaceId}`);
}
