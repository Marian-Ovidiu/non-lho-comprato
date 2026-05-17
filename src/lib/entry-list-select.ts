/** Fields required for entry list/detail serialization (excludes isFirstEntryOfDay for DBs pending migration). */
export const entryListSelect = {
  id: true,
  title: true,
  categoryId: true,
  realCost: true,
  alternativeCost: true,
  savedAmount: true,
  date: true,
  note: true,
  source: true,
  person: true,
  paidBy: true,
  paidByUserId: true,
  habitOccurrenceId: true,
  createdAt: true,
  updatedAt: true,
  category: true,
} as const;

export const entryListSelectWithBeneficiaries = {
  ...entryListSelect,
  beneficiaries: {
    select: {
      userId: true,
    },
  },
} as const;
