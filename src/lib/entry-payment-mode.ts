export type EntryPaymentModeValue = "single_payer" | "joint_account";

export const DEFAULT_ENTRY_PAYMENT_MODE: EntryPaymentModeValue = "single_payer";

export function isEntryPaymentMode(value: unknown): value is EntryPaymentModeValue {
  return value === "single_payer" || value === "joint_account";
}

export function normalizeEntryPaymentMode(
  value: unknown,
): EntryPaymentModeValue {
  return isEntryPaymentMode(value) ? value : DEFAULT_ENTRY_PAYMENT_MODE;
}

export function parseEntryPaymentModeFromForm(
  formData: FormData,
): EntryPaymentModeValue {
  return normalizeEntryPaymentMode(formData.get("paymentMode"));
}
