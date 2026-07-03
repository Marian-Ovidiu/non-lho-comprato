import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildEntryDataForOccurrence,
  type OccurrenceWithHabit,
} from "@/src/features/habits/occurrence-entry";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

const MEMBERS: WorkspaceMemberOption[] = [
  { userId: "user-1", label: "Marian", name: "Marian", email: "marian@example.com" },
  { userId: "user-2", label: "Martina", name: "Martina", email: "martina@example.com" },
];

function occurrence(
  habit: Partial<OccurrenceWithHabit["habit"]> = {},
): OccurrenceWithHabit {
  return {
    id: "occ-1",
    date: new Date("2026-06-15T10:00:00.000Z"),
    habit: {
      name: "Caffè al bar",
      categoryId: "cat-caffe",
      amount: "3.50",
      targetScope: "self",
      targetUserId: null,
      ...habit,
    },
  };
}

const CONTEXT = {
  workspaceId: "ws-1",
  currentUserId: "user-1",
  members: MEMBERS,
};

describe("buildEntryDataForOccurrence", () => {
  it("records a spent occurrence at the habit amount", () => {
    const data = buildEntryDataForOccurrence(occurrence(), "spent", CONTEXT);

    assert.equal(data.mode, "spent");
    assert.equal(data.savingContext, "none");
    assert.equal(data.realCost, "3.50");
    assert.equal(data.alternativeCost, "3.50");
    assert.equal(data.savedAmount, "0.00");
    assert.equal(data.source, "habit");
    assert.equal(data.habitOccurrenceId, "occ-1");
    assert.equal(data.title, "Caffè al bar");
    assert.equal(data.categoryId, "cat-caffe");
    assert.equal(data.date.toISOString(), "2026-06-15T10:00:00.000Z");
    assert.equal(data.note, null);
  });

  it("records an avoided occurrence as the amount that would have been spent", () => {
    const data = buildEntryDataForOccurrence(occurrence(), "avoided", CONTEXT);

    assert.equal(data.mode, "avoided");
    assert.equal(data.realCost, "0.00");
    assert.equal(data.alternativeCost, "3.50");
    assert.equal(data.savedAmount, "3.50");
  });

  it("records a skipped occurrence at zero cost", () => {
    const data = buildEntryDataForOccurrence(occurrence(), "skipped", CONTEXT);

    assert.equal(data.realCost, "0.00");
    assert.equal(data.alternativeCost, "0.00");
    assert.equal(data.savedAmount, "0.00");
  });

  it("attributes a self-scoped habit to the current user only", () => {
    const data = buildEntryDataForOccurrence(
      occurrence({ targetScope: "self" }),
      "spent",
      CONTEXT,
    );

    assert.equal(data.paidByUserId, "user-1");
    assert.equal(data.createdByUserId, "user-1");
    assert.deepEqual(data.beneficiaries.create, [{ userId: "user-1" }]);
  });

  it("spreads a shared habit across all members", () => {
    const data = buildEntryDataForOccurrence(
      occurrence({ targetScope: "shared" }),
      "spent",
      CONTEXT,
    );

    assert.equal(data.paidByUserId, "user-1");
    assert.deepEqual(
      data.beneficiaries.create.map((b) => b.userId).sort(),
      ["user-1", "user-2"],
    );
  });

  it("targets the named user for a self habit with an explicit target", () => {
    const data = buildEntryDataForOccurrence(
      occurrence({ targetScope: "self", targetUserId: "user-2" }),
      "spent",
      CONTEXT,
    );

    assert.deepEqual(data.beneficiaries.create, [{ userId: "user-2" }]);
  });
});
