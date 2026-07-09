import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AI_EXPENSE_EXPORT_COLUMNS,
  buildAiExpenseExportRows,
  buildAiExpenseExportRow,
  serializeAiExpenseExportEntries,
  type AiExpenseExportEntry,
} from "@/src/lib/ai-export";

function createEntry(
  overrides: Partial<AiExpenseExportEntry>,
): AiExpenseExportEntry {
  return {
    id: "entry-1",
    createdAt: new Date("2026-06-10T08:00:00.000Z"),
    updatedAt: new Date("2026-06-10T09:00:00.000Z"),
    date: new Date("2026-06-10T00:00:00.000Z"),
    title: "Test entry",
    note: null,
    source: "manual",
    realCost: 0,
    alternativeCost: 0,
    savedAmount: 0,
    paidByUserId: null,
    paidByUserName: null,
    paidByUserEmail: null,
    beneficiaries: [],
    category: {
      name: "Food",
    },
    habitOccurrence: null,
    ...overrides,
  };
}

describe("buildAiExpenseExportRow", () => {
  it("exports a normal spent entry without savings", () => {
    const row = buildAiExpenseExportRow(
      createEntry({
        realCost: 12,
        alternativeCost: 12,
        savedAmount: 0,
      }),
      "Workspace",
      "Europe/Rome",
    );

    // Legacy columns
    assert.equal(row.mode, "spent");
    assert.equal(row.savingContext, "none");
    assert.equal(row.savingImpact, "0.00");
    // Unified metric columns
    assert.equal(row.spentReal, "12.00");
    assert.equal(row.wouldHaveSpentMetric, "12.00");
    assert.equal(row.avoidedAmount, "0.00");
    assert.equal(row.comparisonSaved, "0.00");
    assert.equal(row.comparisonOverspent, "0.00");
    assert.equal(row.grossPositiveImpact, "0.00");
    assert.equal(row.netImpact, "0.00");
    assert.equal(row.isLargeComparison, false);
    assert.equal(row.ordinaryImpact, "0.00");
    assert.equal(row.largeComparisonImpact, "0.00");
    // Sharing columns
    assert.equal(row.paidByUserId, "");
    assert.equal(row.beneficiaryCount, 0);
    assert.equal(row.isShared, false);
    assert.equal(row.sharePerBeneficiary, "0.00");
  });

  it("exports a legacy avoided entry using savedAmount", () => {
    const row = buildAiExpenseExportRow(
      createEntry({
        realCost: 0,
        alternativeCost: 18,
        savedAmount: 18,
      }),
      "Workspace",
      "Europe/Rome",
    );

    // Legacy columns
    assert.equal(row.mode, "avoided");
    assert.equal(row.savingContext, "comparison");
    assert.equal(row.savingImpact, "18.00");
    // Unified metric columns
    assert.equal(row.spentReal, "0.00");
    assert.equal(row.wouldHaveSpentMetric, "18.00");
    assert.equal(row.avoidedAmount, "18.00");
    assert.equal(row.comparisonSaved, "0.00");
    assert.equal(row.comparisonOverspent, "0.00");
    assert.equal(row.grossPositiveImpact, "18.00");
    assert.equal(row.netImpact, "18.00");
    assert.equal(row.isLargeComparison, false);
    assert.equal(row.ordinaryImpact, "18.00");
    assert.equal(row.largeComparisonImpact, "0.00");
  });

  it("exports a negative comparison impact for spent entries", () => {
    const row = buildAiExpenseExportRow(
      createEntry({
        realCost: 50,
        alternativeCost: 40,
        savedAmount: -10,
      }),
      "Workspace",
      "Europe/Rome",
    );

    // Legacy columns
    assert.equal(row.mode, "spent");
    assert.equal(row.savingContext, "comparison");
    assert.equal(row.savingImpact, "-10.00");
    // Unified metric columns
    assert.equal(row.spentReal, "50.00");
    assert.equal(row.wouldHaveSpentMetric, "40.00");
    assert.equal(row.avoidedAmount, "0.00");
    assert.equal(row.comparisonSaved, "0.00");
    assert.equal(row.comparisonOverspent, "10.00");
    assert.equal(row.grossPositiveImpact, "0.00");
    assert.equal(row.netImpact, "-10.00");
    assert.equal(row.isLargeComparison, false);
    assert.equal(row.ordinaryImpact, "-10.00");
    assert.equal(row.largeComparisonImpact, "0.00");
  });

  it("flags large comparison entries (Shein golden case)", () => {
    const row = buildAiExpenseExportRow(
      createEntry({
        realCost: 19.8,
        alternativeCost: 600,
        savedAmount: 580.2,
        mode: "spent",
        savingContext: "comparison",
      }),
      "Workspace",
      "Europe/Rome",
    );

    assert.equal(row.isLargeComparison, true);
    assert.equal(row.netImpact, "580.20");
    assert.equal(row.largeComparisonImpact, "580.20");
    assert.equal(row.ordinaryImpact, "0.00");
    assert.equal(row.grossPositiveImpact, "580.20");
    assert.equal(row.comparisonSaved, "580.20");
    assert.equal(row.comparisonOverspent, "0.00");
  });

  it("exports sharing columns for a shared entry with two beneficiaries", () => {
    const row = buildAiExpenseExportRow(
      createEntry({
        realCost: 40,
        alternativeCost: 40,
        savedAmount: 0,
        paidByUserId: "user-1",
        paidByUserName: "Marian",
        paidByUserEmail: "marian@example.com",
        beneficiaries: [
          { userId: "user-1", userName: "Marian", userEmail: "marian@example.com" },
          { userId: "user-2", userName: "Martina", userEmail: "martina@example.com" },
        ],
      }),
      "Workspace",
      "Europe/Rome",
    );

    assert.equal(row.paidByUserId, "user-1");
    assert.equal(row.paidByName, "Marian");
    assert.equal(row.beneficiaryCount, 2);
    assert.equal(row.isShared, true);
    assert.equal(row.sharePerBeneficiary, "20.00");
    assert.equal(row.beneficiaryShares, "20.00|20.00");
    assert.equal(row.beneficiaryUserIds, "user-1|user-2");
    assert.equal(row.beneficiaryNames, "Marian|Martina");
  });

  it("emits exact per-beneficiary shares that reconcile to spentReal (10 / 3)", () => {
    const row = buildAiExpenseExportRow(
      createEntry({
        realCost: 10,
        alternativeCost: 10,
        savedAmount: 0,
        paidByUserId: "user-1",
        beneficiaries: [
          { userId: "user-1" },
          { userId: "user-2" },
          { userId: "user-3" },
        ],
      }),
      "Workspace",
      "Europe/Rome",
    );

    assert.equal(row.beneficiaryCount, 3);
    assert.equal(row.beneficiaryShares, "3.34|3.33|3.33");
    const sharesTotal = row.beneficiaryShares
      .split("|")
      .reduce((total, share) => total + Number(share), 0);
    assert.equal(Math.round(sharesTotal * 100) / 100, Number(row.spentReal));
  });

  it("exports a personal entry with a single beneficiary", () => {
    const row = buildAiExpenseExportRow(
      createEntry({
        realCost: 25,
        alternativeCost: 25,
        savedAmount: 0,
        paidByUserId: "user-1",
        paidByUserName: "Marian",
        beneficiaries: [
          { userId: "user-1", userName: "Marian" },
        ],
      }),
      "Workspace",
      "Europe/Rome",
    );

    assert.equal(row.beneficiaryCount, 1);
    assert.equal(row.isShared, false);
    assert.equal(row.sharePerBeneficiary, "25.00");
    assert.equal(row.paidByName, "Marian");
  });

  it("exports safe empty sharing values for legacy entries without paidBy data", () => {
    const row = buildAiExpenseExportRow(
      createEntry({
        realCost: 15,
        alternativeCost: 15,
        savedAmount: 0,
        // no paidByUserId, no beneficiaries (legacy entry)
      }),
      "Workspace",
      "Europe/Rome",
    );

    assert.equal(row.paidByUserId, "");
    assert.equal(row.paidByName, "");
    assert.equal(row.beneficiaryCount, 0);
    assert.equal(row.isShared, false);
    assert.equal(row.sharePerBeneficiary, "0.00");
    assert.equal(row.beneficiaryUserIds, "");
    assert.equal(row.beneficiaryNames, "");
  });
});

describe("serializeAiExpenseExportEntries", () => {
  it("does not emit CSV rows for entries without a real id or valid date", () => {
    const validEntry = createEntry({
      id: "valid-entry",
      title: "Valid movement",
      date: new Date("2026-06-11T00:00:00.000Z"),
      realCost: 12,
      alternativeCost: 12,
    });
    const emptyIdEntry = createEntry({
      id: "",
      title: "",
      date: new Date("2026-06-11T00:00:00.000Z"),
    });
    const invalidDateEntry = {
      ...createEntry({
        id: "invalid-date-entry",
        title: "",
      }),
      date: new Date("invalid"),
    };
    const csv = `${AI_EXPENSE_EXPORT_COLUMNS.join(",")}\n${serializeAiExpenseExportEntries(
      [emptyIdEntry, invalidDateEntry, validEntry],
      "Workspace",
      "Europe/Rome",
    )}`;
    const dataLines = csv.trimEnd().split("\n").slice(1);

    assert.equal(dataLines.length, 1);
    assert.ok(dataLines[0]?.startsWith("valid-entry,"));
    assert.doesNotMatch(csv, /invalid-date-entry/);
    assert.doesNotMatch(csv, /\n,/);
  });

  it("neutralizes formula triggers in user-controlled text cells", () => {
    const csv = serializeAiExpenseExportEntries(
      [
        createEntry({
          title: "=1+2",
          note: "@cmd",
          category: { name: "+SUM(A1:A9)" },
          paidByUserId: "user-1",
          paidByUserName: "-2+3+cmd|' /C calc'!A0",
          beneficiaries: [
            { userId: "user-1", userName: "-2+3+cmd|' /C calc'!A0" },
          ],
        }),
      ],
      "=cmd-workspace",
      "Europe/Rome",
    );

    assert.match(csv, /,'=1\+2,/);
    assert.match(csv, /,'@cmd,/);
    assert.match(csv, /,'\+SUM\(A1:A9\),/);
    assert.match(csv, /,'-2\+3\+cmd/);
    assert.match(csv, /,'=cmd-workspace,/);
    assert.doesNotMatch(csv, /,=1\+2,/);
    assert.doesNotMatch(csv, /,@cmd,/);
  });

  it("quotes neutralized cells that also contain CSV metacharacters", () => {
    const csv = serializeAiExpenseExportEntries(
      [
        createEntry({
          title: '=HYPERLINK("http://evil.example","click")',
        }),
      ],
      "Workspace",
      "Europe/Rome",
    );

    assert.match(
      csv,
      /,"'=HYPERLINK\(""http:\/\/evil\.example"",""click""\)",/,
    );
  });

  it("keeps negative money cells intact", () => {
    const csv = serializeAiExpenseExportEntries(
      [
        createEntry({
          realCost: 50,
          alternativeCost: 40,
          savedAmount: -10,
        }),
      ],
      "Workspace",
      "Europe/Rome",
    );

    assert.match(csv, /,-10\.00,/);
    assert.doesNotMatch(csv, /'-10\.00/);
  });

  it("keeps valid legacy entries even when sharing fields are missing", () => {
    const legacyEntry = createEntry({
      id: "legacy-entry",
      realCost: 15,
      alternativeCost: 15,
      savedAmount: 0,
    });

    delete legacyEntry.paidByUserId;
    delete legacyEntry.paidByUserName;
    delete legacyEntry.paidByUserEmail;
    delete legacyEntry.beneficiaries;

    const rows = buildAiExpenseExportRows([legacyEntry], "Workspace", "Europe/Rome");
    const csv = serializeAiExpenseExportEntries([legacyEntry], "Workspace", "Europe/Rome");

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.id, "legacy-entry");
    assert.equal(rows[0]?.date, "2026-06-10");
    assert.equal(rows[0]?.paidByUserId, "");
    assert.equal(rows[0]?.paidByName, "");
    assert.equal(rows[0]?.beneficiaryUserIds, "");
    assert.equal(rows[0]?.beneficiaryNames, "");
    assert.equal(rows[0]?.beneficiaryCount, 0);
    assert.equal(rows[0]?.sharePerBeneficiary, "0.00");
    assert.equal(rows[0]?.isShared, false);
    assert.match(csv, /^legacy-entry,/);
  });
});
