import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  detectFixedExpenseGroups,
  detectFixedExpenses,
  isFixedExpense,
  isFixedExpenseTitle,
  normalizeRecurringTitle,
  toFixedExpenseKeySet,
  type RecurringSample,
} from "@/src/features/entries/fixed-expenses";

function sample(title: string, amount: number, monthKey: string): RecurringSample {
  return { title, amount, monthKey };
}

describe("normalizeRecurringTitle", () => {
  it("collapses month names and years into the same key", () => {
    const key = normalizeRecurringTitle("Affitto");
    assert.equal(normalizeRecurringTitle("Affitto maggio"), key);
    assert.equal(normalizeRecurringTitle("Affitto giugno 2026"), key);
    assert.equal(normalizeRecurringTitle("  affitto  "), key);
  });

  it("ignores accents, punctuation and single letters", () => {
    assert.equal(normalizeRecurringTitle("Caffè, al bar!"), "caffe al bar");
    assert.equal(normalizeRecurringTitle("TARI 2024"), "tari");
  });

  it("returns an empty key when nothing usable is left", () => {
    assert.equal(normalizeRecurringTitle("2026"), "");
    assert.equal(normalizeRecurringTitle("   "), "");
  });
});

describe("detectFixedExpenseGroups", () => {
  const rent = [
    sample("Affitto maggio", 500, "2026-05"),
    sample("Affitto giugno 2026", 500, "2026-06"),
    sample("Affitto", 500, "2026-07"),
  ];

  it("detects a stable monthly commitment across renamed titles", () => {
    const [group] = detectFixedExpenseGroups(rent, { currentMonthKey: "2026-07" });

    assert.equal(group?.key, "affitto");
    assert.equal(group?.medianAmount, 500);
    assert.equal(group?.monthsSeen, 3);
    assert.equal(group?.occurrences, 3);
  });

  it("keeps a small but regular subscription", () => {
    const groups = detectFixedExpenseGroups(
      [
        sample("chatgpt", 23, "2026-05"),
        sample("chatgpt", 23, "2026-06"),
        sample("chatgpt", 23, "2026-07"),
      ],
      { currentMonthKey: "2026-07" },
    );

    assert.equal(groups.length, 1);
    assert.equal(groups[0]?.key, "chatgpt");
  });

  it("ignores a daily habit even when the amount never changes", () => {
    // Un caffè da 1,20€ è stabile quanto un affitto: a distinguerli è la
    // cadenza, non la costanza dell'importo.
    const coffee = Array.from({ length: 60 }, (_, index) =>
      sample("caffè prima di lavoro", 1.2, `2026-0${(index % 3) + 5}`),
    );

    assert.deepEqual(detectFixedExpenseGroups(coffee, { currentMonthKey: "2026-07" }), []);
  });

  it("ignores an expense that skips months", () => {
    const groups = detectFixedExpenseGroups(
      [sample("farmacia", 22, "2026-05"), sample("farmacia", 22.5, "2026-07")],
      { currentMonthKey: "2026-07" },
    );

    assert.deepEqual(groups, []);
  });

  it("ignores a commitment that has stopped", () => {
    const groups = detectFixedExpenseGroups(
      [sample("barbiere", 20, "2026-05"), sample("barbiere", 20, "2026-06")],
      { currentMonthKey: "2026-08" },
    );

    assert.deepEqual(groups, []);
  });

  it("keeps a commitment seen last month but not yet this month", () => {
    const groups = detectFixedExpenseGroups(
      [sample("affitto", 500, "2026-06"), sample("affitto", 500, "2026-07")],
      { currentMonthKey: "2026-08" },
    );

    assert.equal(groups.length, 1);
  });

  it("ignores amounts that move too much to be a commitment", () => {
    const groups = detectFixedExpenseGroups(
      [
        sample("spesa lidl", 40, "2026-05"),
        sample("spesa lidl", 95, "2026-06"),
        sample("spesa lidl", 60, "2026-07"),
      ],
      { currentMonthKey: "2026-07" },
    );

    assert.deepEqual(groups, []);
  });

  it("ignores single occurrences and tiny amounts", () => {
    assert.deepEqual(
      detectFixedExpenseGroups([sample("airpods", 200, "2026-05")], {
        currentMonthKey: "2026-05",
      }),
      [],
    );
    assert.deepEqual(
      detectFixedExpenseGroups(
        [
          sample("cartine", 4, "2026-05"),
          sample("cartine", 4, "2026-06"),
          sample("cartine", 4, "2026-07"),
        ],
        { currentMonthKey: "2026-07" },
      ),
      [],
    );
  });

  it("picks the most frequent original title as the label", () => {
    const [group] = detectFixedExpenseGroups(
      [
        sample("Affitto", 500, "2026-05"),
        sample("Affitto", 500, "2026-06"),
        sample("Affitto giugno", 500, "2026-07"),
      ],
      { currentMonthKey: "2026-07" },
    );

    assert.equal(group?.label, "Affitto");
  });
});

describe("detectFixedExpenses", () => {
  // Una quota d'affitto scritta ogni mese in modo diverso: a tenerla insieme
  // non è il titolo ma la firma pagante + categoria + importo al centesimo.
  const quota = [
    { title: "ponte marti", amount: 90, monthKey: "2026-06", categoryId: "casa", payerId: "marta" },
    { title: "Affitto Ponte", amount: 90, monthKey: "2026-07", categoryId: "casa", payerId: "marta" },
  ];

  it("catches a commitment renamed every month", () => {
    const detection = detectFixedExpenses(quota, { currentMonthKey: "2026-07" });

    assert.equal(detection.groups.length, 1);
    assert.equal(detection.groups[0]?.matchedBy, "signature");
    assert.equal(isFixedExpense(quota[0]!, detection), true);
    assert.equal(isFixedExpense(quota[1]!, detection), true);
  });

  it("does not match a different payer or category on the same amount", () => {
    const detection = detectFixedExpenses(quota, { currentMonthKey: "2026-07" });

    assert.equal(
      isFixedExpense(
        { title: "regalo", amount: 90, monthKey: "2026-07", categoryId: "casa", payerId: "marian" },
        detection,
      ),
      false,
    );
    assert.equal(
      isFixedExpense(
        { title: "regalo", amount: 90, monthKey: "2026-07", categoryId: "regali", payerId: "marta" },
        detection,
      ),
      false,
    );
  });

  it("does not match a different amount, not even by one cent", () => {
    const detection = detectFixedExpenses(quota, { currentMonthKey: "2026-07" });

    assert.equal(
      isFixedExpense(
        { title: "ponte", amount: 90.01, monthKey: "2026-07", categoryId: "casa", payerId: "marta" },
        detection,
      ),
      false,
    );
  });

  it("skips the signature pass for entries already matched by title", () => {
    const detection = detectFixedExpenses(
      [
        { title: "Affitto", amount: 500, monthKey: "2026-06", categoryId: "casa", payerId: "marian" },
        { title: "Affitto luglio", amount: 500, monthKey: "2026-07", categoryId: "casa", payerId: "marian" },
      ],
      { currentMonthKey: "2026-07" },
    );

    assert.equal(detection.groups.length, 1);
    assert.equal(detection.groups[0]?.matchedBy, "title");
  });

  it("needs a payer and a category to build a signature", () => {
    const detection = detectFixedExpenses(
      [
        { title: "bonifico casa", amount: 90, monthKey: "2026-06", categoryId: "casa", payerId: null },
        { title: "versamento mensile", amount: 90, monthKey: "2026-07", categoryId: "casa", payerId: null },
      ],
      { currentMonthKey: "2026-07" },
    );

    assert.deepEqual(detection.groups, []);
  });
});

describe("isFixedExpenseTitle", () => {
  it("matches renamed occurrences of a detected commitment", () => {
    const keys = toFixedExpenseKeySet(
      detectFixedExpenseGroups(
        [
          sample("Affitto maggio", 500, "2026-05"),
          sample("Affitto giugno", 500, "2026-06"),
        ],
        { currentMonthKey: "2026-06" },
      ),
    );

    assert.equal(isFixedExpenseTitle("Affitto luglio 2026", keys), true);
    assert.equal(isFixedExpenseTitle("affitto", keys), true);
    assert.equal(isFixedExpenseTitle("Sushi Gari", keys), false);
    assert.equal(isFixedExpenseTitle("   ", keys), false);
  });
});
