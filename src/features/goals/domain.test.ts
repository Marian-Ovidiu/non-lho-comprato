import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeGoalsWithProgress,
  validateGoalForm,
  type GoalProgressRow,
} from "@/src/features/goals/domain";

describe("validateGoalForm", () => {
  it("accepts a valid goal, parsing locale amounts", () => {
    const result = validateGoalForm({
      title: "Vacanza",
      emoji: "✈️",
      targetAmountRaw: "1.234,56",
    });

    assert.deepEqual(result.errors, {});
    assert.equal(result.targetAmount, 1234.56);
  });

  it("requires a title of at least 2 characters", () => {
    assert.equal(
      validateGoalForm({ title: "", emoji: "", targetAmountRaw: "10" }).errors
        .title,
      "Il titolo è obbligatorio",
    );
    assert.equal(
      validateGoalForm({ title: "V", emoji: "", targetAmountRaw: "10" }).errors
        .title,
      "Il titolo deve avere almeno 2 caratteri",
    );
  });

  it("validates the target amount", () => {
    const cases: Array<[string, string]> = [
      ["", "Questo campo è obbligatorio"],
      ["abc", "Inserisci un numero valido"],
      ["1,2,3", "Inserisci un numero valido"],
      ["0", "Il valore deve essere maggiore di 0"],
      ["-5", "Il valore deve essere maggiore di 0"],
    ];

    for (const [raw, expected] of cases) {
      assert.equal(
        validateGoalForm({ title: "Vacanza", emoji: "", targetAmountRaw: raw })
          .errors.targetAmount,
        expected,
        `input ${JSON.stringify(raw)}`,
      );
    }
  });

  it("limits the emoji to 4 code points", () => {
    assert.equal(
      validateGoalForm({
        title: "Vacanza",
        emoji: "abcde",
        targetAmountRaw: "10",
      }).errors.emoji,
      "Usa al massimo 4 caratteri",
    );
    assert.deepEqual(
      validateGoalForm({ title: "Vacanza", emoji: "🏖️", targetAmountRaw: "10" })
        .errors,
      {},
    );
  });
});

function goalRow(overrides: Partial<GoalProgressRow> = {}): GoalProgressRow {
  return {
    id: "goal-1",
    title: "Vacanza",
    targetAmount: "100.00",
    emoji: null,
    targetUserId: null,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("computeGoalsWithProgress", () => {
  it("averages the pace over calendar months, counting empty ones", () => {
    const result = computeGoalsWithProgress({
      goals: [goalRow()],
      totalAllRaw: "103.50",
      userTotals: [],
      monthlyTotals: [
        { month: "2026-01", total: "100.00" },
        { month: "2026-06", total: "3.50" },
      ],
      currentMonthKey: "2026-07",
      contributors: ["io"],
    });

    assert.equal(result.monthlyPace, 14.79);
    assert.equal(result.goals[0].monthlyPace, 14.79);
  });

  it("returns zero pace and pool without avoided entries", () => {
    const result = computeGoalsWithProgress({
      goals: [goalRow()],
      totalAllRaw: "0",
      userTotals: [],
      monthlyTotals: [],
      currentMonthKey: "2026-07",
      contributors: ["io"],
    });

    assert.equal(result.savedPool, 0);
    assert.equal(result.monthlyPace, 0);
    assert.equal(result.goals[0].progressAmount, 0);
    assert.equal(result.goals[0].isCompleted, false);
  });

  it("measures workspace goals on the pool and personal goals on the user total", () => {
    const result = computeGoalsWithProgress({
      goals: [
        goalRow({ id: "shared" }),
        goalRow({ id: "personal", targetUserId: "user-1" }),
        goalRow({ id: "orphan", targetUserId: "user-none" }),
      ],
      totalAllRaw: "80.00",
      userTotals: [{ userId: "user-1", total: "30.00" }],
      monthlyTotals: [{ month: "2026-07", total: "80.00" }],
      currentMonthKey: "2026-07",
      contributors: ["io"],
    });

    const [shared, personal, orphan] = result.goals;
    assert.equal(shared.progressAmount, 80);
    assert.equal(shared.progressPercent, 80);
    assert.equal(personal.progressAmount, 30);
    assert.equal(personal.remainingAmount, 70);
    assert.equal(orphan.progressAmount, 0);
    assert.equal(result.savedPool, 80);
  });

  it("marks completion at the exact target and caps the percent", () => {
    const result = computeGoalsWithProgress({
      goals: [goalRow({ targetAmount: "50.00" })],
      totalAllRaw: "50.00",
      userTotals: [],
      monthlyTotals: [{ month: "2026-07", total: "50.00" }],
      currentMonthKey: "2026-07",
      contributors: ["io"],
    });

    assert.equal(result.goals[0].isCompleted, true);
    assert.equal(result.goals[0].progressPercent, 100);
    assert.equal(result.goals[0].remainingAmount, 0);
  });

  it("clamps a first month in the future to a single observed month", () => {
    const result = computeGoalsWithProgress({
      goals: [],
      totalAllRaw: "10.00",
      userTotals: [],
      monthlyTotals: [{ month: "2026-09", total: "10.00" }],
      currentMonthKey: "2026-07",
      contributors: ["io"],
    });

    assert.equal(result.monthlyPace, 10);
  });
});
