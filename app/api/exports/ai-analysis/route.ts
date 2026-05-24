import { prisma } from "@/src/lib/prisma";
import { getCurrentWorkspace } from "@/src/lib/auth/session";
import {
  AI_EXPENSE_EXPORT_COLUMNS,
  buildAiExpenseExportRow,
  buildAiExpenseExportSummaryBlock,
  createAiExpenseExportSummary,
  getAiExpenseExportFilename,
  serializeAiExpenseExportRow,
  updateAiExpenseExportSummary,
  type AiExpenseExportEntry,
} from "@/src/lib/ai-export";

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
  person: true,
  realCost: true,
  alternativeCost: true,
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

async function fetchEntriesBatch(
  workspaceId: string,
  cursor?: string,
): Promise<AiExpenseExportEntry[]> {
  const query = {
    where: { workspaceId },
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
    person: entry.person,
    realCost: entry.realCost,
    alternativeCost: entry.alternativeCost,
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

export async function GET() {
  let workspace: Awaited<ReturnType<typeof getCurrentWorkspace>>;

  try {
    workspace = await getCurrentWorkspace();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  const summary = createAiExpenseExportSummary();
  const filename = getAiExpenseExportFilename();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(`${AI_EXPENSE_EXPORT_COLUMNS.join(",")}\n`),
        );

        let cursor: string | undefined;

        while (true) {
          const entries = await fetchEntriesBatch(workspace.id, cursor);

          if (entries.length === 0) {
            break;
          }

          let chunk = "";

          for (const entry of entries) {
            const row = buildAiExpenseExportRow(entry, workspace.name);
            updateAiExpenseExportSummary(summary, row);
            chunk += serializeAiExpenseExportRow(row);
          }

          controller.enqueue(encoder.encode(chunk));

          if (entries.length < BATCH_SIZE) {
            break;
          }

          cursor = entries[entries.length - 1]?.id;
        }

        controller.enqueue(
          encoder.encode(buildAiExpenseExportSummaryBlock(summary)),
        );
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
