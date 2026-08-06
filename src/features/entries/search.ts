import { Prisma } from "@/src/lib/generated/prisma/client";

import { shouldQueryEncryptedTextFields } from "@/src/lib/field-encryption";
import { normalizeMoneyInputString } from "@/src/lib/money-number";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

export type EntriesKindFilter = "all" | "spesa" | "evitata" | "confronto";

export function normalizeSearchQuery(query?: string): string {
  return query?.trim().toLowerCase() ?? "";
}

export function isLikelyImportedNoise(
  title: string,
  note?: string | null,
): boolean {
  const text = `${title} ${note ?? ""}`.toLowerCase();

  return [
    "csv",
    "import",
    "statement",
    "transaction",
    "paypal",
    "stripe",
    "revolut",
    "nexi",
    "bank",
    "addebito",
    "bonifico",
  ].some((pattern) => text.includes(pattern));
}

export function parseSimpleAmountQuery(query: string): Prisma.Decimal | null {
  const normalized = normalizeMoneyInputString(query);

  if (normalized === null) {
    return null;
  }

  try {
    return new Prisma.Decimal(normalized);
  } catch {
    return null;
  }
}

export function buildEntriesSearchWhere(
  query: string,
  members: WorkspaceMemberOption[],
): Prisma.EntryWhereInput {
  const normalizedQuery = normalizeSearchQuery(query);

  if (!normalizedQuery) {
    return {};
  }

  const matchingMemberIds = members
    .filter((member) => {
      const haystacks = [member.label, member.name, member.email, member.userId];
      return haystacks.some((value) =>
        value?.toLowerCase().includes(normalizedQuery),
      );
    })
    .map((member) => member.userId);

  const amount = parseSimpleAmountQuery(normalizedQuery);
  const textWhere: Prisma.EntryWhereInput[] = [
    {
      title: {
        contains: normalizedQuery,
        mode: "insensitive",
      },
    },
    {
      category: {
        is: {
          OR: [
            {
              name: {
                contains: normalizedQuery,
                mode: "insensitive",
              },
            },
            {
              slug: {
                contains: normalizedQuery,
                mode: "insensitive",
              },
            },
          ],
        },
      },
    },
  ];

  if (shouldQueryEncryptedTextFields()) {
    textWhere.push({
      note: {
        contains: normalizedQuery,
        mode: "insensitive",
      },
    });
  }

  if (amount) {
    textWhere.push({
      OR: [
        { realCost: amount },
        { alternativeCost: amount },
        { savedAmount: amount },
      ],
    });
  }

  if (matchingMemberIds.length > 0) {
    textWhere.push({
      OR: [
        {
          paidByUserId: {
            in: matchingMemberIds,
          },
        },
        {
          beneficiaries: {
            some: {
              userId: {
                in: matchingMemberIds,
              },
            },
          },
        },
      ],
    });
  }

  return {
    OR: textWhere,
  };
}

export function normalizeCategoryIds(categoryIds?: string[]): string[] {
  if (!categoryIds || categoryIds.length === 0) {
    return [];
  }

  return [
    ...new Set(categoryIds.map((id) => id.trim()).filter((id) => id.length > 0)),
  ];
}

/// Più categorie selezionate si sommano (OR): l'elenco mostra i movimenti che
/// appartengono a una qualsiasi di quelle scelte.
export function buildEntriesCategoryWhere(
  categoryIds?: string[],
): Prisma.EntryWhereInput {
  const ids = normalizeCategoryIds(categoryIds);

  if (ids.length === 0) {
    return {};
  }

  return { categoryId: { in: ids } };
}

export function buildEntriesKindWhere(
  kind?: EntriesKindFilter,
): Prisma.EntryWhereInput {
  if (!kind || kind === "all") {
    return {};
  }

  if (kind === "evitata") {
    return { mode: "avoided" };
  }

  if (kind === "confronto") {
    return { mode: "spent", savingContext: "comparison" };
  }

  return { mode: "spent", savingContext: "none" };
}
