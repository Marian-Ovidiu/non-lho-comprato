"use server";

import { unstable_rethrow } from "next/navigation";

import { getEntriesPage } from "@/src/actions/entries";
import type { IncomeListItem } from "@/src/actions/incomes";
import type { TransferListItem } from "@/src/actions/transfers";
import type { EntriesKindFilter } from "@/src/features/entries/search";
import {
  decodeFeedCursor,
  sliceFeedPage,
  type FeedRowKind,
  type FeedRowRef,
} from "@/src/features/entries/month-feed";
import {
  serializeEntry,
  type SerializableEntry,
} from "@/src/features/entries/serialize";
import { withDatabaseRetry } from "@/src/lib/db-retry";
import { entryListSelectWithBeneficiaries } from "@/src/lib/entry-list-select";
import { decryptOptionalText } from "@/src/lib/field-encryption";
import { Prisma } from "@/src/lib/generated/prisma/client";
import { prisma } from "@/src/lib/prisma";
import {
  getCurrentWorkspaceId,
  getCurrentWorkspaceMembers,
  getCurrentWorkspaceTimezone,
} from "@/src/lib/workspace-context";
import {
  getDateKey,
  getMonthRangeForMonthKey,
  normalizeMonthKey,
} from "@/src/lib/workspace-dates";
import type { TransferDirectionValue } from "@/src/features/balances/transfer-rules";

/**
 * Una riga del feed dei movimenti: una spesa, un'entrata o un giroconto.
 *
 * È un'unione discriminata e non un tipo appiattito di proposito. Le tre cose
 * non hanno gli stessi campi — un'entrata non ha categoria, un giroconto non
 * ha nemmeno un titolo — e appiattirle costringerebbe ogni riga a portarsi
 * dietro campi vuoti che qualcuno, prima o poi, proverebbe a sommare.
 */
export type FeedItem =
  | { kind: "entry"; dateKey: string; entry: SerializableEntry }
  | { kind: "income"; dateKey: string; income: IncomeListItem }
  | { kind: "transfer"; dateKey: string; transfer: TransferListItem };

export type MovementsFeedResult = {
  items: FeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

/**
 * La classifica del mese, senza i dati: solo tipo, id e chiave d'ordinamento.
 *
 * Le tre tabelle si uniscono qui e non in memoria perché la pagina va decisa
 * prima di leggere le righe: unire venti spese con tutte le entrate del mese e
 * poi tagliare significherebbe mostrare pagine di lunghezza casuale, o caricare
 * il mese intero per mostrarne un ventesimo.
 */
async function findFeedPage(
  workspaceId: string,
  range: { start: Date; end: Date },
  cursor: ReturnType<typeof decodeFeedCursor>,
  limit: number,
): Promise<FeedRowRef[]> {
  const rows = await withDatabaseRetry(() =>
    prisma.$queryRaw<
      Array<{ kind: FeedRowKind; id: string; date: Date; createdAt: Date }>
    >(Prisma.sql`
      WITH movimenti AS (
        SELECT 'entry'::text AS kind, "id", "date", "createdAt"
        FROM "Entry"
        WHERE "workspaceId" = ${workspaceId}
          AND "date" >= ${range.start} AND "date" < ${range.end}
        UNION ALL
        SELECT 'income'::text AS kind, "id", "date", "createdAt"
        FROM "Income"
        WHERE "workspaceId" = ${workspaceId}
          AND "date" >= ${range.start} AND "date" < ${range.end}
        UNION ALL
        SELECT 'transfer'::text AS kind, "id", "date", "createdAt"
        FROM "Transfer"
        WHERE "workspaceId" = ${workspaceId}
          AND "date" >= ${range.start} AND "date" < ${range.end}
      )
      SELECT kind, "id", "date", "createdAt"
      FROM movimenti
      WHERE ${
        cursor
          ? Prisma.sql`("date", "createdAt", "id") < (${cursor.date}, ${cursor.createdAt}, ${cursor.id})`
          : Prisma.sql`TRUE`
      }
      ORDER BY "date" DESC, "createdAt" DESC, "id" DESC
      LIMIT ${limit + 1}
    `),
  );

  return rows.map((row) => ({
    kind: row.kind,
    id: row.id,
    date: row.date,
    createdAt: row.createdAt,
  }));
}

/**
 * Il feed di un mese: spese, entrate e giroconti in un ordine solo.
 *
 * Chi filtra per categoria o per tipo non passa di qui — quei filtri parlano
 * di spese, e un'entrata senza categoria non ha modo di soddisfarli. In quel
 * caso l'elenco resta quello di prima, `getEntriesPage`.
 */
export async function getMovementsFeed(options?: {
  monthKey?: string;
  cursor?: string | null;
  limit?: number;
}): Promise<MovementsFeedResult> {
  const limit = options?.limit ?? 20;

  try {
    const [workspaceId, members, timezone] = await Promise.all([
      getCurrentWorkspaceId(),
      getCurrentWorkspaceMembers(),
      getCurrentWorkspaceTimezone(),
    ]);

    const monthKey = normalizeMonthKey(timezone, options?.monthKey);
    const range = getMonthRangeForMonthKey(monthKey, timezone);
    const cursor = decodeFeedCursor(options?.cursor);

    const page = sliceFeedPage(
      await findFeedPage(workspaceId, range, cursor, limit),
      limit,
    );

    const idsPerTipo = (kind: FeedRowKind) =>
      page.rows.filter((row) => row.kind === kind).map((row) => row.id);

    const [entries, incomes, transfers] = await withDatabaseRetry(() =>
      Promise.all([
        prisma.entry.findMany({
          where: { id: { in: idsPerTipo("entry") } },
          select: entryListSelectWithBeneficiaries,
        }),
        prisma.income.findMany({
          where: { id: { in: idsPerTipo("income") } },
          select: {
            id: true,
            title: true,
            amount: true,
            date: true,
            receivedByUserId: true,
            note: true,
          },
        }),
        prisma.transfer.findMany({
          where: { id: { in: idsPerTipo("transfer") } },
          select: {
            id: true,
            amount: true,
            date: true,
            direction: true,
            userId: true,
            note: true,
          },
        }),
      ]),
    );

    const etichette = new Map(
      members.map((member) => [member.userId, member.label] as const),
    );

    const perId = {
      entry: new Map(entries.map((row) => [row.id, row] as const)),
      income: new Map(incomes.map((row) => [row.id, row] as const)),
      transfer: new Map(transfers.map((row) => [row.id, row] as const)),
    };

    /* L'ordine è quello della classifica, non quello in cui il database ha
       restituito le righe: le tre letture sono indipendenti e nessuna delle
       tre sa dove va a finire. */
    const items = page.rows.flatMap((row): FeedItem[] => {
      /* Il giorno nel fuso dello spazio, non quello del server: la colonna e'
         un timestamp senza fuso e letta cruda sposterebbe la mezzanotte di
         un'ora o due, spedendo un movimento nel giorno prima. */
      const dateKey = getDateKey(row.date, timezone);

      if (row.kind === "entry") {
        const entry = perId.entry.get(row.id);
        return entry
          ? [{ kind: "entry", dateKey, entry: serializeEntry(entry, members) }]
          : [];
      }

      if (row.kind === "income") {
        const income = perId.income.get(row.id);
        return income
          ? [
              {
                kind: "income",
                dateKey,
                income: {
                  id: income.id,
                  title: income.title,
                  amount: toNumber(income.amount),
                  dateKey: getDateKey(income.date, timezone),
                  receivedByUserId: income.receivedByUserId,
                  receivedByLabel: income.receivedByUserId
                    ? (etichette.get(income.receivedByUserId) ?? null)
                    : null,
                  note: decryptOptionalText(income.note),
                },
              },
            ]
          : [];
      }

      const transfer = perId.transfer.get(row.id);
      return transfer
        ? [
            {
              kind: "transfer",
              dateKey,
              transfer: {
                id: transfer.id,
                amount: toNumber(transfer.amount),
                dateKey: getDateKey(transfer.date, timezone),
                direction: transfer.direction as TransferDirectionValue,
                userId: transfer.userId,
                userLabel: transfer.userId
                  ? (etichette.get(transfer.userId) ?? null)
                  : null,
                note: decryptOptionalText(transfer.note),
              },
            },
          ]
        : [];
    });

    return { items, nextCursor: page.nextCursor, hasMore: page.hasMore };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[movements] getMovementsFeed failed", error);
    throw error;
  }
}

/**
 * L'unico ingresso dell'elenco: decide da solo se il mese va letto come feed
 * unificato o come sole spese.
 *
 * Il ramo esiste perché i filtri parlano di spese. Cercare "pizza", chiedere
 * solo le evitate o restringere a due categorie sono domande che un'entrata
 * non può soddisfare — non ha categoria, non ha un tipo, e il suo titolo non
 * vive nello stesso indice. Invece di inventare risposte finte, quando un
 * filtro è attivo l'elenco torna a essere quello di prima.
 */
export async function getMovementsPage(options?: {
  monthKey?: string;
  cursor?: string | null;
  limit?: number;
  q?: string;
  kind?: EntriesKindFilter;
  categoryIds?: string[];
}): Promise<MovementsFeedResult> {
  const hasFilters =
    Boolean(options?.q?.trim()) ||
    (options?.kind !== undefined && options.kind !== "all") ||
    (options?.categoryIds?.length ?? 0) > 0;

  if (!hasFilters) {
    return getMovementsFeed({
      monthKey: options?.monthKey,
      cursor: options?.cursor,
      limit: options?.limit,
    });
  }

  const timezone = await getCurrentWorkspaceTimezone();
  const page = await getEntriesPage({
    monthKey: options?.monthKey,
    cursor: options?.cursor ?? undefined,
    limit: options?.limit,
    q: options?.q,
    kind: options?.kind,
    categoryIds: options?.categoryIds,
  });

  return {
    items: page.entries.map((entry) => ({
      kind: "entry" as const,
      dateKey: getDateKey(new Date(entry.date), timezone),
      entry,
    })),
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  };
}
