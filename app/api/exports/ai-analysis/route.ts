import type { NextRequest } from "next/server";
import type { Prisma } from "@/src/lib/generated/prisma/client";

import { prisma } from "@/src/lib/prisma";
import { getCurrentWorkspace } from "@/src/lib/auth/session";
import {
  AI_EXPENSE_EXPORT_COLUMNS,
  getAiExpenseExportFilename,
  serializeAiExpenseExportEntries,
  type AiExpenseExportEntry,
  type AiExpenseExportRange,
} from "@/src/lib/ai-export";
import { getMonthKey, getMonthRangeForMonthKey } from "@/src/lib/workspace-dates";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 1000;

const exportSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  date: true,
  title: true,
  note: true,
  source: true,
  realCost: true,
  alternativeCost: true,
  savedAmount: true,
  mode: true,
  savingContext: true,
  paidByUserId: true,
  paidByUser: {
    select: {
      name: true,
      email: true,
    },
  },
  beneficiaries: {
    select: {
      userId: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  },
  category: {
    select: {
      name: true,
    },
  },
  habitOccurrence: {
    select: {
      habitId: true,
      habit: {
        select: {
          name: true,
        },
      },
    },
  },
} as const;

const orderBy = [
  { date: "asc" as const },
  { createdAt: "asc" as const },
  { id: "asc" as const },
] as const;

function getExportRange(request: NextRequest): AiExpenseExportRange {
  return request.nextUrl.searchParams.get("range") === "current-month"
    ? "current-month"
    : "all";
}

function buildExportWhere(
  workspaceId: string,
  timeZone: string,
  range: AiExpenseExportRange,
): Prisma.EntryWhereInput {
  if (range !== "current-month") {
    return { workspaceId };
  }

  const monthKey = getMonthKey(new Date(), timeZone);
  const { start, end } = getMonthRangeForMonthKey(monthKey, timeZone);

  return {
    workspaceId,
    date: {
      gte: start,
      lt: end,
    },
  };
}

async function fetchEntriesBatch(
  where: Prisma.EntryWhereInput,
  cursor?: string,
): Promise<AiExpenseExportEntry[]> {
  const query = {
    where,
    take: BATCH_SIZE,
    orderBy: [...orderBy],
    select: exportSelect,
  };

  const entries = cursor
    ? await prisma.entry.findMany({
        ...query,
        cursor: { id: cursor },
        skip: 1,
      })
    : await prisma.entry.findMany(query);

  return entries.map((entry) => ({
    id: entry.id,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    date: entry.date,
    title: entry.title,
    note: entry.note,
    source: entry.source,
    realCost: entry.realCost,
    alternativeCost: entry.alternativeCost,
    savedAmount: entry.savedAmount,
    mode: entry.mode,
    savingContext: entry.savingContext,
    paidByUserId: entry.paidByUserId,
    paidByUserName: entry.paidByUser?.name ?? null,
    paidByUserEmail: entry.paidByUser?.email ?? null,
    beneficiaries: entry.beneficiaries.map((b) => ({
      userId: b.userId,
      userName: b.user?.name ?? null,
      userEmail: b.user?.email ?? null,
    })),
    category: {
      name: entry.category.name,
    },
    habitOccurrence: entry.habitOccurrence
      ? {
          habitId: entry.habitOccurrence.habitId,
          habit: entry.habitOccurrence.habit
            ? {
                name: entry.habitOccurrence.habit.name,
              }
            : null,
        }
      : null,
  }));
}

export async function GET(request: NextRequest) {
  let workspace: Awaited<ReturnType<typeof getCurrentWorkspace>>;

  try {
    workspace = await getCurrentWorkspace();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const timeZone = workspace.timezone ?? "Europe/Rome";
  const encoder = new TextEncoder();
  const range = getExportRange(request);
  const where = buildExportWhere(workspace.id, timeZone, range);
  const filename = getAiExpenseExportFilename(timeZone, new Date(), range);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(`${AI_EXPENSE_EXPORT_COLUMNS.join(",")}\n`),
        );

        let cursor: string | undefined;

        while (true) {
          const entries = await fetchEntriesBatch(where, cursor);

          if (entries.length === 0) {
            break;
          }

          let chunk = "";

          chunk += serializeAiExpenseExportEntries(entries, workspace.name, timeZone);

          controller.enqueue(encoder.encode(chunk));

          if (entries.length < BATCH_SIZE) {
            break;
          }

          cursor = entries[entries.length - 1]?.id;
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
