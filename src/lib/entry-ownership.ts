import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

export type EntryExpenseKind = "personal" | "shared";

export type EntryOwnershipFields = {
  paidByUserId: string | null | undefined;
  beneficiaryUserIds: string[] | null | undefined;
};

export type EntryOwnershipValidationErrors = {
  paidByUserId?: string;
  beneficiaryUserIds?: string;
};

export type EntryOwnershipValidationResult =
  | {
      ok: true;
      paidByUserId: string;
      beneficiaryUserIds: string[];
      expenseKind: EntryExpenseKind;
    }
  | {
      ok: false;
      errors: EntryOwnershipValidationErrors;
    };

const PAID_BY_REQUIRED_MESSAGE = "Seleziona chi ha pagato";
const PAID_BY_REQUIRED_FOR_SHARED_MESSAGE =
  "Chi ha pagato è obbligatorio per le spese condivise";
const BENEFICIARIES_REQUIRED_MESSAGE = "Seleziona almeno un beneficiario";
const BENEFICIARIES_INVALID_MESSAGE = "Seleziona beneficiari validi";
const NO_MEMBERS_MESSAGE = "Nessun membro disponibile nel workspace";

function getMemberIdSet(members: WorkspaceMemberOption[]): Set<string> {
  return new Set(members.map((member) => member.userId));
}

function normalizeBeneficiaryUserIds(
  beneficiaryUserIds: string[] | null | undefined,
): string[] {
  return Array.from(
    new Set(
      (beneficiaryUserIds ?? [])
        .filter((userId): userId is string => typeof userId === "string")
        .map((userId) => userId.trim())
        .filter(Boolean),
    ),
  );
}

/** One beneficiary → personal; more than one → shared. */
export function getEntryExpenseKind(
  beneficiaryUserIds: readonly string[],
): EntryExpenseKind | null {
  if (beneficiaryUserIds.length === 0) {
    return null;
  }

  if (beneficiaryUserIds.length === 1) {
    return "personal";
  }

  return "shared";
}

export function parsePaidByUserIdFromForm(formData: FormData): string {
  const value = formData.get("paidByUserId");
  return typeof value === "string" ? value.trim() : "";
}

export function parseBeneficiaryUserIdsFromForm(formData: FormData): string[] {
  const rawValues = formData.getAll("beneficiaryUserIds");

  return normalizeBeneficiaryUserIds(
    rawValues
      .filter((value): value is string => typeof value === "string")
      .flatMap((value) => value.split(",")),
  );
}

export function validateEntryOwnership(
  input: EntryOwnershipFields,
  members: WorkspaceMemberOption[],
): EntryOwnershipValidationResult {
  const errors: EntryOwnershipValidationErrors = {};
  const memberIds = getMemberIdSet(members);
  const paidByUserId = input.paidByUserId?.trim() ?? "";
  const beneficiaryUserIds = normalizeBeneficiaryUserIds(
    input.beneficiaryUserIds,
  );

  if (members.length === 0) {
    errors.paidByUserId = NO_MEMBERS_MESSAGE;
    errors.beneficiaryUserIds = NO_MEMBERS_MESSAGE;
    return { ok: false, errors };
  }

  if (!paidByUserId) {
    errors.paidByUserId = PAID_BY_REQUIRED_MESSAGE;
  } else if (!memberIds.has(paidByUserId)) {
    errors.paidByUserId = PAID_BY_REQUIRED_MESSAGE;
  }

  if (beneficiaryUserIds.length === 0) {
    errors.beneficiaryUserIds = BENEFICIARIES_REQUIRED_MESSAGE;
  } else {
    const invalidBeneficiary = beneficiaryUserIds.find(
      (userId) => !memberIds.has(userId),
    );

    if (invalidBeneficiary) {
      errors.beneficiaryUserIds = BENEFICIARIES_INVALID_MESSAGE;
    }
  }

  // Cross-field invariant: shared entries (multiple beneficiaries) must always
  // have a payer. Catches the case where beneficiaryUserIds are set but
  // paidByUserId is absent — which would break balance antisymmetry.
  if (beneficiaryUserIds.length > 1 && !errors.paidByUserId && !paidByUserId) {
    errors.paidByUserId = PAID_BY_REQUIRED_FOR_SHARED_MESSAGE;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const expenseKind = getEntryExpenseKind(beneficiaryUserIds);

  if (!expenseKind) {
    return {
      ok: false,
      errors: {
        beneficiaryUserIds: BENEFICIARIES_REQUIRED_MESSAGE,
      },
    };
  }

  return {
    ok: true,
    paidByUserId,
    beneficiaryUserIds,
    expenseKind,
  };
}
