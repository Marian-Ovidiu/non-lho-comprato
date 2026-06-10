/** Fields required for entry list/detail serialization. */
export const entryListSelect = {
  id: true,
  title: true,
  categoryId: true,
  realCost: true,
  alternativeCost: true,
  savedAmount: true,
  mode: true,
  savingContext: true,
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

export const entryEditSelect = {
  id: true,
  title: true,
  categoryId: true,
  realCost: true,
  alternativeCost: true,
  savedAmount: true,
  mode: true,
  savingContext: true,
  date: true,
  note: true,
  source: true,
  paidByUserId: true,
  workspaceId: true,
} as const;

export const entryEditSelectWithBeneficiaries = {
  ...entryEditSelect,
  beneficiaries: {
    select: {
      userId: true,
    },
  },
} as const;
