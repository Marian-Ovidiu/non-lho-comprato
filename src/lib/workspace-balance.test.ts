import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeCoupleWorkspaceBalance,
  type WorkspaceBalanceEntry,
} from "@/src/lib/workspace-balance";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

// ─── fixtures ─────────────────────────────────────────────────────────────────

const MARIAN_ID = "user-marian";
const MARTINA_ID = "user-martina";

// "Marian" sorts before "Martina" → Marian is the primary slot (index 0).
const MEMBERS: WorkspaceMemberOption[] = [
  { userId: MARIAN_ID, label: "Marian", name: "Marian", email: null },
  { userId: MARTINA_ID, label: "Martina", name: "Martina", email: null },
];

function sharedEntry(
  realCost: number,
  payerUserId: string | null,
): WorkspaceBalanceEntry {
  return {
    realCost,
    paidByUserId: payerUserId,
    beneficiaryUserIds: [MARIAN_ID, MARTINA_ID],
  };
}

// ─── single-payer scenarios ───────────────────────────────────────────────────

describe("computeCoupleWorkspaceBalance", () => {
  describe("1. Marian pays 20 shared (Marian + Martina)", () => {
    // Marian paid 20 and is owed back 10 by Martina.
    // share = 20/2 = 10; paidTotals[marian]=20; owedTotals[marian,martina]=10 each
    // net(marian) = 20-10 = +10  → they-owe
    // net(martina) = 0-10 = -10  → you-owe
    const entries: WorkspaceBalanceEntry[] = [sharedEntry(20, MARIAN_ID)];

    it("Marian perspective: Martina owes her 10", () => {
      const result = computeCoupleWorkspaceBalance(MEMBERS, MARIAN_ID, entries);
      assert.equal(result.supported, true);
      assert.equal(result.status, "they-owe");
      assert.equal(result.amount, 10);
      assert.equal(result.counterpartUserId, MARTINA_ID);
    });

    it("Martina perspective: she owes Marian 10", () => {
      const result = computeCoupleWorkspaceBalance(MEMBERS, MARTINA_ID, entries);
      assert.equal(result.supported, true);
      assert.equal(result.status, "you-owe");
      assert.equal(result.amount, 10);
      assert.equal(result.counterpartUserId, MARIAN_ID);
    });

    it("balance is antisymmetric: amounts match", () => {
      const marian = computeCoupleWorkspaceBalance(MEMBERS, MARIAN_ID, entries);
      const martina = computeCoupleWorkspaceBalance(MEMBERS, MARTINA_ID, entries);
      assert.equal(marian.amount, martina.amount);
      assert.notEqual(marian.status, martina.status);
    });
  });

  describe("2. Martina pays 50 shared (Marian + Martina)", () => {
    // share = 50/2 = 25; paidTotals[martina]=50; owedTotals[marian,martina]=25 each
    // net(marian) = 0-25 = -25  → you-owe (Marian owes Martina 25)
    // net(martina) = 50-25 = +25 → they-owe
    const entries: WorkspaceBalanceEntry[] = [sharedEntry(50, MARTINA_ID)];

    it("Marian perspective: she owes Martina 25", () => {
      const result = computeCoupleWorkspaceBalance(MEMBERS, MARIAN_ID, entries);
      assert.equal(result.status, "you-owe");
      assert.equal(result.amount, 25);
    });

    it("Martina perspective: Marian owes her 25", () => {
      const result = computeCoupleWorkspaceBalance(MEMBERS, MARTINA_ID, entries);
      assert.equal(result.status, "they-owe");
      assert.equal(result.amount, 25);
    });

    it("balance is antisymmetric: amounts match", () => {
      const marian = computeCoupleWorkspaceBalance(MEMBERS, MARIAN_ID, entries);
      const martina = computeCoupleWorkspaceBalance(MEMBERS, MARTINA_ID, entries);
      assert.equal(marian.amount, martina.amount);
    });
  });

  describe("3. Combined: Marian pays 20 shared + Martina pays 50 shared", () => {
    // owedTotals[marian] = 10+25 = 35; owedTotals[martina] = 10+25 = 35
    // paidTotals[marian]=20; paidTotals[martina]=50
    // net(marian) = 20-35 = -15  → you-owe 15 (Marian owes Martina 15)
    // net(martina) = 50-35 = +15 → they-owe 15
    const entries: WorkspaceBalanceEntry[] = [
      sharedEntry(20, MARIAN_ID),
      sharedEntry(50, MARTINA_ID),
    ];

    it("Marian perspective: she owes Martina 15", () => {
      const result = computeCoupleWorkspaceBalance(MEMBERS, MARIAN_ID, entries);
      assert.equal(result.status, "you-owe");
      assert.equal(result.amount, 15);
    });

    it("Martina perspective: Marian owes her 15", () => {
      const result = computeCoupleWorkspaceBalance(MEMBERS, MARTINA_ID, entries);
      assert.equal(result.status, "they-owe");
      assert.equal(result.amount, 15);
    });

    it("balance is antisymmetric: amounts match", () => {
      const marian = computeCoupleWorkspaceBalance(MEMBERS, MARIAN_ID, entries);
      const martina = computeCoupleWorkspaceBalance(MEMBERS, MARTINA_ID, entries);
      assert.equal(marian.amount, martina.amount);
    });
  });

  describe("4. Entry with beneficiaries but missing paidByUserId (legacy bug)", () => {
    // Reproduces the production balance asymmetry.
    // Entry A: Marian pays 20 shared (correct — payer credited)
    // Entry B: 10 realCost, 2 beneficiaries, paidByUserId=null (buggy)
    //
    // For entry B:
    //   owedTotals[marian] += 5, owedTotals[martina] += 5
    //   paidTotals untouched (null payer not in memberIds)
    //
    // True balance from entry A alone: net(marian)=+10, net(martina)=-10
    // With buggy entry B: net(marian)=+10-5=+5, net(martina)=-10-5=-15
    //   → marian: they-owe 5; martina: you-owe 15 — AMOUNTS DIFFER → asymmetric

    const entries: WorkspaceBalanceEntry[] = [
      sharedEntry(20, MARIAN_ID),
      sharedEntry(10, null), // paidByUserId=null
    ];

    it("Marian perspective (they-owe 5)", () => {
      const result = computeCoupleWorkspaceBalance(MEMBERS, MARIAN_ID, entries);
      assert.equal(result.status, "they-owe");
      assert.equal(result.amount, 5);
    });

    it("Martina perspective (you-owe 15)", () => {
      const result = computeCoupleWorkspaceBalance(MEMBERS, MARTINA_ID, entries);
      assert.equal(result.status, "you-owe");
      assert.equal(result.amount, 15);
    });

    it("balance is ASYMMETRIC: amounts differ by exactly the orphan entry's realCost", () => {
      const marian = computeCoupleWorkspaceBalance(MEMBERS, MARIAN_ID, entries);
      const martina = computeCoupleWorkspaceBalance(MEMBERS, MARTINA_ID, entries);
      // Amounts are NOT equal — this is the bug
      assert.notEqual(marian.amount, martina.amount);
      // The discrepancy equals the orphan entry's realCost (10)
      assert.equal(Math.abs(martina.amount - marian.amount), 10);
    });

    it("after backfill: assigning paidByUserId=MARIAN restores antisymmetry", () => {
      const fixedEntries: WorkspaceBalanceEntry[] = [
        sharedEntry(20, MARIAN_ID),
        sharedEntry(10, MARIAN_ID), // backfilled: paidByUserId now set
      ];
      const marian = computeCoupleWorkspaceBalance(MEMBERS, MARIAN_ID, fixedEntries);
      const martina = computeCoupleWorkspaceBalance(MEMBERS, MARTINA_ID, fixedEntries);
      // Both entries paid by Marian: net(marian)=30-15=+15, net(martina)=0-15=-15
      assert.equal(marian.amount, martina.amount);
      assert.equal(marian.status, "they-owe");
      assert.equal(martina.status, "you-owe");
    });
  });

  describe("edge cases", () => {
    it("empty entries returns balanced", () => {
      const result = computeCoupleWorkspaceBalance(MEMBERS, MARIAN_ID, []);
      assert.equal(result.supported, true);
      assert.equal(result.status, "balanced");
      assert.equal(result.amount, 0);
    });

    it("personal entries (1 beneficiary) do not affect the balance", () => {
      const personal: WorkspaceBalanceEntry = {
        realCost: 100,
        paidByUserId: MARIAN_ID,
        beneficiaryUserIds: [MARIAN_ID],
      };
      const result = computeCoupleWorkspaceBalance(MEMBERS, MARIAN_ID, [personal]);
      assert.equal(result.status, "balanced");
      assert.equal(result.amount, 0);
    });

    it("unsupported when workspace has ≠ 2 members", () => {
      const single = [MEMBERS[0]!];
      const result = computeCoupleWorkspaceBalance(single, MARIAN_ID, []);
      assert.equal(result.supported, false);
      assert.equal(result.status, "unsupported");
    });

    it("unsupported when currentUserId is not a workspace member", () => {
      const result = computeCoupleWorkspaceBalance(
        MEMBERS,
        "user-unknown",
        [],
      );
      assert.equal(result.supported, false);
    });

    it("balanced when amounts round to zero", () => {
      // Marian and Martina each pay 20 for shared — perfect split
      const entries: WorkspaceBalanceEntry[] = [
        sharedEntry(20, MARIAN_ID),
        sharedEntry(20, MARTINA_ID),
      ];
      const result = computeCoupleWorkspaceBalance(MEMBERS, MARIAN_ID, entries);
      assert.equal(result.status, "balanced");
      assert.equal(result.amount, 0);
    });
  });
});
