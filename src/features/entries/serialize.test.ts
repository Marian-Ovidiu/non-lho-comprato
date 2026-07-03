import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.DATABASE_URL ??=
  "postgresql://user:pass@localhost:5432/non_lho_comprato_test";

import {
  serializeEntry,
  serializeEntryEdit,
  type EntryEditRecord,
  type EntryWithCategory,
} from "@/src/features/entries/serialize";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

const MEMBERS: WorkspaceMemberOption[] = [
  { userId: "user-1", label: "Marian", name: "Marian", email: "marian@example.com" },
  { userId: "user-2", label: "Martina", name: "Martina", email: "martina@example.com" },
];

function listEntry(overrides: Partial<EntryWithCategory> = {}): EntryWithCategory {
  return {
    id: "entry-1",
    title: "Cena fuori",
    categoryId: "cat-1",
    realCost: 40,
    alternativeCost: 40,
    savedAmount: 0,
    mode: "spent",
    savingContext: "none",
    paymentMode: "single_payer",
    date: new Date("2026-06-15T10:00:00.000Z"),
    note: null,
    source: "manual",
    beneficiaries: [{ userId: "user-1" }],
    paidByUserId: "user-1",
    habitOccurrenceId: null,
    createdAt: new Date("2026-06-15T10:00:00.000Z"),
    updatedAt: new Date("2026-06-15T11:00:00.000Z"),
    category: {
      id: "cat-1",
      name: "Cibo",
      slug: "cibo",
      color: "#f97316",
      icon: "utensils",
    },
    ...overrides,
  };
}

describe("serializeEntry", () => {
  it("maps a normal spent entry to its DTO", () => {
    const dto = serializeEntry(listEntry(), MEMBERS);

    assert.equal(dto.id, "entry-1");
    assert.equal(dto.mode, "spent");
    assert.equal(dto.savingContext, "none");
    assert.equal(dto.realCost, 40);
    assert.equal(dto.paidByUserId, "user-1");
    assert.equal(dto.paidByLabel, "Marian");
    assert.deepEqual(dto.beneficiaryUserIds, ["user-1"]);
    assert.equal(dto.date, "2026-06-15T10:00:00.000Z");
    assert.equal(dto.createdAt, "2026-06-15T10:00:00.000Z");
    assert.equal(dto.category.slug, "cibo");
  });

  it("derives money view for an avoided entry", () => {
    const dto = serializeEntry(
      listEntry({ realCost: 0, alternativeCost: 6, savedAmount: 6, mode: "avoided" }),
      MEMBERS,
    );

    assert.equal(dto.mode, "avoided");
    assert.equal(dto.savedAmount, 6);
    assert.equal(dto.comparisonAmount, 6);
  });

  it("passes through plaintext notes and null notes", () => {
    assert.equal(serializeEntry(listEntry({ note: "contanti" }), MEMBERS).note, "contanti");
    assert.equal(serializeEntry(listEntry({ note: null }), MEMBERS).note, null);
  });

  it("returns a null label for an unknown payer", () => {
    const dto = serializeEntry(listEntry({ paidByUserId: "ghost" }), MEMBERS);
    assert.equal(dto.paidByLabel, null);
  });

  it("dedupes beneficiaries and falls back when none are present", () => {
    const both = serializeEntry(
      listEntry({ beneficiaries: [{ userId: "user-1" }, { userId: "user-2" }, { userId: "user-1" }] }),
      MEMBERS,
    );
    assert.deepEqual(both.beneficiaryUserIds.sort(), ["user-1", "user-2"]);

    const none = serializeEntry(
      listEntry({ beneficiaries: [], paidByUserId: "user-2" }),
      MEMBERS,
    );
    assert.deepEqual(none.beneficiaryUserIds, ["user-2"]);
  });
});

describe("serializeEntryEdit", () => {
  it("produces the edit DTO without list-only fields", () => {
    const record: EntryEditRecord = {
      id: "entry-9",
      title: "Spesa",
      categoryId: "cat-2",
      realCost: 20,
      alternativeCost: 28,
      savedAmount: 8,
      mode: "spent",
      savingContext: "comparison",
      paymentMode: "single_payer",
      date: new Date("2026-06-11T18:30:00.000Z"),
      note: "consegna",
      source: "manual",
      paidByUserId: "user-1",
      beneficiaries: [{ userId: "user-1" }],
    };

    const dto = serializeEntryEdit(record, MEMBERS);

    assert.equal(dto.id, "entry-9");
    assert.equal(dto.savingContext, "comparison");
    assert.equal(dto.savedAmount, 8);
    assert.equal(dto.note, "consegna");
    assert.equal(dto.paidByUserId, "user-1");
    assert.ok(!("paidByLabel" in dto));
    assert.ok(!("category" in dto));
  });
});
