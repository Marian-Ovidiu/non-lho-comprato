import { it } from "@/src/lib/i18n/it";
import type { Translations } from "@/src/lib/i18n";
import {
  parseBeneficiaryUserIdsFromForm,
  parsePaidByUserIdFromForm,
} from "@/src/lib/entry-ownership";
import {
  parseEntryPaymentModeFromForm,
  type EntryPaymentModeValue,
} from "@/src/lib/entry-payment-mode";
import {
  getDefaultPaidByUserId,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";

export type ResolvedEntryPaymentAndOwnership = {
  paymentMode: EntryPaymentModeValue;
  ownershipInput: {
    paidByUserId: string;
    beneficiaryUserIds: string[];
  };
  errors: Record<string, string>;
};

/**
 * Resolves who paid and who benefits from the form. For "joint_account"
 * (pagata insieme) the split is implicit — both members benefit and one is the
 * default payer — but it is only valid in two-member workspaces; otherwise the
 * form values are kept and an error is surfaced.
 */
export function resolveEntryPaymentAndOwnership(
  formData: FormData,
  members: WorkspaceMemberOption[],
  tr: Translations = it,
): ResolvedEntryPaymentAndOwnership {
  const paymentMode = parseEntryPaymentModeFromForm(formData);

  if (paymentMode !== "joint_account") {
    return {
      paymentMode,
      ownershipInput: {
        paidByUserId: parsePaidByUserIdFromForm(formData),
        beneficiaryUserIds: parseBeneficiaryUserIdsFromForm(formData),
      },
      errors: {},
    };
  }

  if (members.length !== 2) {
    return {
      paymentMode,
      ownershipInput: {
        paidByUserId: parsePaidByUserIdFromForm(formData),
        beneficiaryUserIds: parseBeneficiaryUserIdsFromForm(formData),
      },
      errors: {
        paymentMode: tr.entryActions.jointNeedsTwoMembers,
      },
    };
  }

  return {
    paymentMode,
    ownershipInput: {
      paidByUserId: getDefaultPaidByUserId(members),
      beneficiaryUserIds: members.map((member) => member.userId),
    },
    errors: {},
  };
}
