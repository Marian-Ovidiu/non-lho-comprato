import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCraftedGoalsProps,
  type CraftedGoalSource,
} from "@/src/lib/crafted-goals-build";

function goal(overrides: Partial<CraftedGoalSource> = {}): CraftedGoalSource {
  return {
    id: "goal-1",
    title: "Vacanza",
    targetAmount: 100,
    progressAmount: 50,
    progressPercent: 50,
    remainingAmount: 50,
    isActive: true,
    isCompleted: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    monthlyPace: 10,
    contributors: ["io"],
    ...overrides,
  };
}

describe("buildCraftedGoalsProps", () => {
  it("counts the shared pool once in the hero with multiple goals", () => {
    const props = buildCraftedGoalsProps({
      goals: [goal({ id: "a" }), goal({ id: "b", title: "Moto" })],
      savedPool: 50,
      monthlyPace: 10,
    });

    assert.equal(props.hero.totalSaved, 50);
    assert.equal(props.hero.totalTarget, 200);
    assert.equal(props.hero.totalPct, 25);
    assert.equal(props.hero.activePace, 10);
    assert.equal(props.hero.remaining, 150);
  });

  it("keeps per-goal progress on the individual rows", () => {
    const props = buildCraftedGoalsProps({
      goals: [goal({ id: "a" }), goal({ id: "b", title: "Moto" })],
      savedPool: 50,
      monthlyPace: 10,
    });

    for (const row of props.goals) {
      assert.equal(row.saved, 50);
      assert.equal(row.target, 100);
      assert.equal(row.pct, 50);
      assert.equal(row.remaining, 50);
      assert.equal(row.monthlyPace, 10);
    }
  });

  it("caps the hero percentage at 100 when the pool exceeds every target", () => {
    const props = buildCraftedGoalsProps({
      goals: [goal({ id: "a", targetAmount: 40 })],
      savedPool: 500,
      monthlyPace: 10,
    });

    assert.equal(props.hero.totalSaved, 500);
    assert.equal(props.hero.totalPct, 100);
    assert.equal(props.hero.remaining, 0);
  });

  it("features the first active non-completed goal and maps statuses", () => {
    const props = buildCraftedGoalsProps({
      goals: [
        goal({ id: "done", isCompleted: true, progressPercent: 100 }),
        goal({ id: "paused", isActive: false }),
        goal({ id: "running", title: "Moto" }),
      ],
      savedPool: 100,
      monthlyPace: 5,
    });

    assert.equal(props.featured?.id, "running");
    assert.equal(props.hero.completedCount, 1);
    assert.deepEqual(props.counts, {
      tutti: 3,
      "in-corso": 1,
      pausa: 1,
      completato: 1,
    });
  });

  it("passes savings through without goal attribution", () => {
    const props = buildCraftedGoalsProps(
      { goals: [goal()], savedPool: 50, monthlyPace: 10 },
      [{ id: "e1", from: "Caffè", amount: 3.5, date: "2026-06-10" }],
    );

    assert.deepEqual(props.savings, [
      { id: "e1", from: "Caffè", amount: 3.5, date: "2026-06-10" },
    ]);
  });

  it("returns an empty hero for no goals", () => {
    const props = buildCraftedGoalsProps({
      goals: [],
      savedPool: 12.5,
      monthlyPace: 4,
    });

    assert.equal(props.goals.length, 0);
    assert.equal(props.featured, null);
    assert.equal(props.hero.totalTarget, 0);
    assert.equal(props.hero.totalPct, 0);
    assert.equal(props.hero.remaining, 0);
  });
});
