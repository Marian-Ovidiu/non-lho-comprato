import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveEntryPaymentAndOwnership } from "@/src/features/entries/payment-ownership";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

const TWO_MEMBERS: WorkspaceMemberOption[] = [
  { userId: "user-1", label: "Marian", name: "Marian", email: "marian@example.com" },
  { userId: "user-2", label: "Martina", name: "Martina", email: "martina@example.com" },
];

function formData(values: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      for (const item of value) data.append(key, item);
    } else {
      data.set(key, value);
    }
  }
  return data;
}

describe("resolveEntryPaymentAndOwnership", () => {
  it("keeps the form payer and beneficiaries for single_payer", () => {
    const result = resolveEntryPaymentAndOwnership(
      formData({
        paymentMode: "single_payer",
        paidByUserId: "user-2",
        beneficiaryUserIds: ["user-1", "user-2"],
      }),
      TWO_MEMBERS,
    );

    assert.equal(result.paymentMode, "single_payer");
    assert.equal(result.ownershipInput.paidByUserId, "user-2");
    assert.deepEqual(result.ownershipInput.beneficiaryUserIds, ["user-1", "user-2"]);
    assert.deepEqual(result.errors, {});
  });

  it("splits across both members for joint_account in a two-member workspace", () => {
    const result = resolveEntryPaymentAndOwnership(
      formData({ paymentMode: "joint_account" }),
      TWO_MEMBERS,
    );

    assert.equal(result.paymentMode, "joint_account");
    assert.deepEqual(result.errors, {});
    // Both members benefit; the payer is the workspace default.
    assert.deepEqual(
      result.ownershipInput.beneficiaryUserIds.sort(),
      ["user-1", "user-2"],
    );
    assert.ok(
      TWO_MEMBERS.some((m) => m.userId === result.ownershipInput.paidByUserId),
    );
  });

  it("rejects joint_account outside a two-member workspace", () => {
    const solo: WorkspaceMemberOption[] = [TWO_MEMBERS[0]];
    const result = resolveEntryPaymentAndOwnership(
      formData({
        paymentMode: "joint_account",
        paidByUserId: "user-1",
        beneficiaryUserIds: "user-1",
      }),
      solo,
    );

    assert.equal(result.paymentMode, "joint_account");
    assert.equal(
      result.errors.paymentMode,
      "Pagata insieme è disponibile solo nei workspace con due membri",
    );
    // Falls back to the submitted values rather than an implicit split.
    assert.equal(result.ownershipInput.paidByUserId, "user-1");
    assert.deepEqual(result.ownershipInput.beneficiaryUserIds, ["user-1"]);
  });

  it("rejects joint_account for a three-member workspace", () => {
    const three = [
      ...TWO_MEMBERS,
      { userId: "user-3", label: "Luca", name: "Luca", email: "luca@example.com" },
    ];
    const result = resolveEntryPaymentAndOwnership(
      formData({ paymentMode: "joint_account" }),
      three,
    );

    assert.ok(result.errors.paymentMode);
  });
});
