import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createRateLimitKey, getClientIpFromHeaders } from "@/src/lib/rate-limit";

describe("rate limit helpers", () => {
  it("builds stable hashed keys without leaking identifiers", () => {
    const first = createRateLimitKey("invite:create", ["User@Example.com", " workspace-a "]);
    const second = createRateLimitKey("invite:create", ["user@example.com", "workspace-a"]);

    assert.equal(first, second);
    assert.equal(first.startsWith("invite:create:"), true);
    assert.equal(first.includes("user@example.com"), false);
    assert.equal(first.includes("workspace-a"), false);
  });

  it("uses the first forwarded IP address", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.1, 10.0.0.2",
      "x-real-ip": "198.51.100.3",
    });

    assert.equal(getClientIpFromHeaders(headers), "203.0.113.1");
  });

  it("falls back when no client IP header is available", () => {
    assert.equal(getClientIpFromHeaders(new Headers()), "unknown");
  });
});
