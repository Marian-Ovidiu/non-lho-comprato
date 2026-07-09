import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeMoneyInputString, round2, splitAmount } from "@/src/lib/money-number";

describe("normalizeMoneyInputString", () => {
  it("normalizes Italian format with thousands separator", () => {
    assert.equal(normalizeMoneyInputString("1.234,56"), "1234.56");
    assert.equal(normalizeMoneyInputString("12.345.678,90"), "12345678.90");
  });

  it("normalizes English format with thousands separator", () => {
    assert.equal(normalizeMoneyInputString("1,234.56"), "1234.56");
    assert.equal(normalizeMoneyInputString("12,345,678.90"), "12345678.90");
  });

  it("reads a single separator as decimal", () => {
    assert.equal(normalizeMoneyInputString("10,50"), "10.50");
    assert.equal(normalizeMoneyInputString("10.50"), "10.50");
    assert.equal(normalizeMoneyInputString("1,234"), "1.234");
  });

  it("passes through plain numbers", () => {
    assert.equal(normalizeMoneyInputString("1234"), "1234");
    assert.equal(normalizeMoneyInputString("1234.56"), "1234.56");
    assert.equal(normalizeMoneyInputString("-5"), "-5");
  });

  it("strips currency symbols, spaces and letters", () => {
    assert.equal(normalizeMoneyInputString("€ 1.234,56"), "1234.56");
    assert.equal(normalizeMoneyInputString("12,00 EUR"), "12.00");
    // Scientific notation is not supported: the letter is stripped like a
    // currency suffix, so the digits collapse.
    assert.equal(normalizeMoneyInputString("12e5"), "125");
  });

  it("rejects non-numeric input", () => {
    assert.equal(normalizeMoneyInputString(""), null);
    assert.equal(normalizeMoneyInputString("abc"), null);
    assert.equal(normalizeMoneyInputString("1,2,3"), null);
    assert.equal(normalizeMoneyInputString("1.2.3"), null);
    assert.equal(normalizeMoneyInputString("-"), null);
    assert.equal(normalizeMoneyInputString("."), null);
  });
});

describe("splitAmount", () => {
  const sum = (values: number[]) => round2(values.reduce((a, b) => a + b, 0));

  it("splits an even total into equal shares", () => {
    assert.deepEqual(splitAmount(10, 2), [5, 5]);
    assert.deepEqual(splitAmount(30, 3), [10, 10, 10]);
  });

  it("allocates the leftover cent to the first shares", () => {
    assert.deepEqual(splitAmount(10, 3), [3.34, 3.33, 3.33]);
    assert.deepEqual(splitAmount(0.1, 3), [0.04, 0.03, 0.03]);
    assert.deepEqual(splitAmount(0.01, 2), [0.01, 0]);
  });

  it("always reconciles: the shares sum back to round2(total)", () => {
    for (const total of [10, 9.99, 100.01, 0.07, 33.33, 1234.56]) {
      for (const parts of [1, 2, 3, 4, 7]) {
        assert.equal(sum(splitAmount(total, parts)), round2(total));
      }
    }
  });

  it("absorbs float noise from the input", () => {
    // 0.1 + 0.2 === 0.30000000000000004
    assert.deepEqual(splitAmount(0.1 + 0.2, 3), [0.1, 0.1, 0.1]);
  });

  it("returns a single full share for one part", () => {
    assert.deepEqual(splitAmount(42.5, 1), [42.5]);
  });

  it("preserves the sign for negative totals", () => {
    assert.deepEqual(splitAmount(-10, 3), [-3.34, -3.33, -3.33]);
  });

  it("returns an empty array for non-positive or non-integer parts", () => {
    assert.deepEqual(splitAmount(10, 0), []);
    assert.deepEqual(splitAmount(10, -1), []);
    assert.deepEqual(splitAmount(10, 2.5), []);
  });
});
