import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isHabitScheduledForDate,
  isMonthlyHabitSchedule,
  normalizeActiveDays,
  parseActiveDays,
} from "@/src/features/habits/schedule";

const ROME = "Europe/Rome";

function formData(values: Record<string, string | string[]>): FormData {
  const data = new FormData();

  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        data.append(key, item);
      }
    } else {
      data.set(key, value);
    }
  }

  return data;
}

describe("normalizeActiveDays", () => {
  it("dedupes, sorts and keeps only ISO weekdays", () => {
    assert.deepEqual(normalizeActiveDays([7, 1, 3, 1, 7]), [1, 3, 7]);
    assert.deepEqual(normalizeActiveDays([0, 8, 2.5, -1, 4]), [4]);
    assert.deepEqual(normalizeActiveDays([]), []);
  });
});

describe("isMonthlyHabitSchedule", () => {
  it("accepts the persisted monthly shape", () => {
    assert.equal(isMonthlyHabitSchedule({ cadence: "monthly", day: 15 }), true);
  });

  it("rejects arrays, null and malformed objects", () => {
    assert.equal(isMonthlyHabitSchedule([1, 2, 3]), false);
    assert.equal(isMonthlyHabitSchedule(null), false);
    assert.equal(isMonthlyHabitSchedule({ cadence: "weekly", day: 15 }), false);
    assert.equal(isMonthlyHabitSchedule({ cadence: "monthly", day: "x" }), false);
  });
});

describe("isHabitScheduledForDate", () => {
  // 2026-07-02 is a Thursday (ISO weekday 4); dates are workspace-local
  // midnight instants, so build them from the Rome day range convention.
  const thursday = new Date("2026-07-01T22:00:00.000Z");

  it("matches weekly schedules on the workspace-local weekday", () => {
    assert.equal(isHabitScheduledForDate([4], thursday, ROME), true);
    assert.equal(isHabitScheduledForDate([1, 7], thursday, ROME), false);
  });

  it("matches monthly schedules on the day of month", () => {
    assert.equal(
      isHabitScheduledForDate({ cadence: "monthly", day: 2 }, thursday, ROME),
      true,
    );
    assert.equal(
      isHabitScheduledForDate({ cadence: "monthly", day: 3 }, thursday, ROME),
      false,
    );
  });

  it("clamps monthly days beyond the month length", () => {
    // 2026-02-28 is the last day of February: a day-31 habit fires there.
    const lastOfFebruary = new Date("2026-02-27T23:00:00.000Z");
    assert.equal(
      isHabitScheduledForDate(
        { cadence: "monthly", day: 31 },
        lastOfFebruary,
        ROME,
      ),
      true,
    );
  });

  it("rejects garbage schedules", () => {
    assert.equal(isHabitScheduledForDate(null, thursday, ROME), false);
    assert.equal(isHabitScheduledForDate("4", thursday, ROME), false);
    assert.equal(isHabitScheduledForDate({ day: 2 }, thursday, ROME), false);
  });
});

describe("parseActiveDays", () => {
  it("parses weekly checkbox values", () => {
    const result = parseActiveDays(formData({ activeDays: ["1", "3", "3"] }));
    assert.equal(result.error, undefined);
    assert.deepEqual(result.value, [1, 3]);
  });

  it("parses JSON and comma-separated weekly values", () => {
    const json = parseActiveDays(formData({ activeDays: "[1,5]" }));
    assert.deepEqual(json.value, [1, 5]);

    const csv = parseActiveDays(formData({ activeDays: "2, 6" }));
    assert.deepEqual(csv.value, [2, 6]);
  });

  it("parses a valid monthly recurrence", () => {
    const result = parseActiveDays(
      formData({ recurrenceType: "monthly", activeDayOfMonth: "31" }),
    );
    assert.equal(result.error, undefined);
    assert.deepEqual(result.value, { cadence: "monthly", day: 31 });
  });

  it("rejects invalid monthly days", () => {
    for (const day of ["0", "32", "", "banana"]) {
      const result = parseActiveDays(
        formData({ recurrenceType: "monthly", activeDayOfMonth: day }),
      );
      assert.equal(result.error, "Seleziona un giorno del mese valido", day);
    }
  });

  it("requires at least one weekly day", () => {
    const result = parseActiveDays(formData({}));
    assert.equal(result.error, "Seleziona almeno un giorno attivo");
  });

  it("rejects non-numeric weekly tokens", () => {
    const result = parseActiveDays(formData({ activeDays: "lunedì" }));
    assert.equal(result.error, "I giorni attivi non sono validi");
  });
});
