import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeMoneyInputString } from "@/src/lib/money-number";

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
