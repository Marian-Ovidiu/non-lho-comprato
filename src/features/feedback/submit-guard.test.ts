import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { guardFeedbackRateLimit } from "@/src/features/feedback/submit-guard";
import type { RateLimitResult } from "@/src/lib/rate-limit";

const ALLOWED: RateLimitResult = {
  allowed: true,
  retryAfterSeconds: 0,
  limit: 5,
  remaining: 4,
  resetAt: new Date(),
};

const BLOCKED: RateLimitResult = {
  allowed: false,
  retryAfterSeconds: 300,
  limit: 5,
  remaining: 0,
  resetAt: new Date(),
};

describe("guardFeedbackRateLimit — within limits", () => {
  it("allows anonymous feedback within IP limit", () => {
    const result = guardFeedbackRateLimit(ALLOWED, null);
    assert.equal(result.allowed, true);
  });

  it("allows authenticated feedback within both IP and user limits", () => {
    const result = guardFeedbackRateLimit(ALLOWED, ALLOWED);
    assert.equal(result.allowed, true);
  });
});

describe("guardFeedbackRateLimit — IP limit exceeded", () => {
  it("blocks when IP limit is exceeded (anonymous)", () => {
    const result = guardFeedbackRateLimit(BLOCKED, null);
    assert.equal(result.allowed, false);
  });

  it("blocks when IP limit is exceeded even when user limit is fine", () => {
    const result = guardFeedbackRateLimit(BLOCKED, ALLOWED);
    assert.equal(result.allowed, false);
  });

  it("returns a non-empty user-friendly message when IP is blocked", () => {
    const result = guardFeedbackRateLimit(BLOCKED, null);
    assert.ok(!result.allowed);
    if (!result.allowed) assert.ok(result.message.length > 0);
  });
});

describe("guardFeedbackRateLimit — user daily limit exceeded", () => {
  it("blocks when authenticated user limit is exceeded", () => {
    const result = guardFeedbackRateLimit(ALLOWED, BLOCKED);
    assert.equal(result.allowed, false);
  });

  it("returns a non-empty user-friendly message when user is blocked", () => {
    const result = guardFeedbackRateLimit(ALLOWED, BLOCKED);
    assert.ok(!result.allowed);
    if (!result.allowed) assert.ok(result.message.length > 0);
  });

  it("does not apply user limit when userResult is null (anonymous path)", () => {
    const result = guardFeedbackRateLimit(ALLOWED, null);
    assert.equal(result.allowed, true);
  });
});
