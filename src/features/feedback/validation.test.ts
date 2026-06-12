import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateFeedback, VALID_FEEDBACK_TYPES } from "@/src/features/feedback/validation";

describe("validateFeedback", () => {
  it("accepts valid bug feedback", () => {
    const result = validateFeedback({ type: "bug", message: "App si blocca aprendo stats" });
    assert.equal(result.valid, true);
    assert.equal(result.data?.type, "bug");
    assert.equal(result.data?.message, "App si blocca aprendo stats");
  });

  it("accepts all valid types", () => {
    for (const type of VALID_FEEDBACK_TYPES) {
      const result = validateFeedback({ type, message: "test valido per il tipo" });
      assert.equal(result.valid, true, `type '${type}' should be valid`);
    }
  });

  it("rejects invalid type", () => {
    const result = validateFeedback({ type: "unknown", message: "Ciao mondo" });
    assert.equal(result.valid, false);
    assert.ok("type" in result.errors);
  });

  it("rejects message shorter than 3 chars", () => {
    const result = validateFeedback({ type: "bug", message: "ab" });
    assert.equal(result.valid, false);
    assert.ok("message" in result.errors);
  });

  it("rejects empty message", () => {
    const result = validateFeedback({ type: "suggestion", message: "" });
    assert.equal(result.valid, false);
    assert.ok("message" in result.errors);
  });

  it("rejects message over 2000 chars", () => {
    const result = validateFeedback({ type: "other", message: "a".repeat(2001) });
    assert.equal(result.valid, false);
    assert.ok("message" in result.errors);
  });

  it("accepts message at exactly 2000 chars", () => {
    const result = validateFeedback({ type: "other", message: "a".repeat(2000) });
    assert.equal(result.valid, true);
  });

  it("accepts message at exactly 3 chars", () => {
    const result = validateFeedback({ type: "confusion", message: "abc" });
    assert.equal(result.valid, true);
  });

  it("trims message whitespace", () => {
    const result = validateFeedback({ type: "suggestion", message: "  bella idea  " });
    assert.equal(result.valid, true);
    assert.equal(result.data?.message, "bella idea");
  });

  it("truncates userAgent to 500 chars", () => {
    const result = validateFeedback({
      type: "bug",
      message: "crash",
      userAgent: "x".repeat(600),
    });
    assert.equal(result.valid, true);
    assert.equal(result.data?.userAgent?.length, 500);
  });

  it("returns null for absent optional fields", () => {
    const result = validateFeedback({ type: "other", message: "qualcosa" });
    assert.equal(result.valid, true);
    assert.equal(result.data?.route, null);
    assert.equal(result.data?.userAgent, null);
    assert.equal(result.data?.viewport, null);
    assert.equal(result.data?.timezone, null);
    assert.equal(result.data?.locale, null);
    assert.equal(result.data?.displayMode, null);
  });

  it("collects both type and message errors simultaneously", () => {
    const result = validateFeedback({ type: "bad", message: "x" });
    assert.equal(result.valid, false);
    assert.ok("type" in result.errors);
    assert.ok("message" in result.errors);
  });
});
