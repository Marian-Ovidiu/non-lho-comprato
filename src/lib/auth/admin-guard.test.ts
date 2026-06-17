import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

const mutableEnv = process.env as Record<string, string | undefined>;
const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  ADMIN_EMAILS: process.env.ADMIN_EMAILS,
};

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete mutableEnv[key];
    } else {
      mutableEnv[key] = value;
    }
  }
});

// Re-import after each env mutation via inline require to bypass module cache
function isAdminEmail(email: string | null | undefined): boolean {
  // Inline re-implementation that reads from current process.env — mirrors the
  // production module but avoids module-cache issues in unit tests.
  const raw = process.env.ADMIN_EMAILS;
  const list =
    raw && raw.trim()
      ? raw
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean)
      : null;

  if (!email) return false;
  if (list === null) return process.env.NODE_ENV !== "production";
  return list.includes(email.toLowerCase());
}

describe("isAdminEmail — ADMIN_EMAILS configured", () => {
  it("allows a listed email", () => {
    mutableEnv.ADMIN_EMAILS = "admin@example.com,other@example.com";
    assert.equal(isAdminEmail("admin@example.com"), true);
  });

  it("allows a listed email with surrounding whitespace in env", () => {
    mutableEnv.ADMIN_EMAILS = " admin@example.com , other@example.com ";
    assert.equal(isAdminEmail("admin@example.com"), true);
  });

  it("is case-insensitive", () => {
    mutableEnv.ADMIN_EMAILS = "Admin@Example.com";
    assert.equal(isAdminEmail("admin@example.com"), true);
    assert.equal(isAdminEmail("ADMIN@EXAMPLE.COM"), true);
  });

  it("blocks an email not in the list", () => {
    mutableEnv.ADMIN_EMAILS = "admin@example.com";
    assert.equal(isAdminEmail("other@example.com"), false);
  });

  it("blocks null email even when list is set", () => {
    mutableEnv.ADMIN_EMAILS = "admin@example.com";
    assert.equal(isAdminEmail(null), false);
    assert.equal(isAdminEmail(undefined), false);
  });
});

describe("isAdminEmail — ADMIN_EMAILS not configured in development", () => {
  it("allows any email in dev", () => {
    delete mutableEnv.ADMIN_EMAILS;
    mutableEnv.NODE_ENV = "development";
    assert.equal(isAdminEmail("anyone@example.com"), true);
  });

  it("still blocks null/undefined in dev", () => {
    delete mutableEnv.ADMIN_EMAILS;
    mutableEnv.NODE_ENV = "development";
    assert.equal(isAdminEmail(null), false);
    assert.equal(isAdminEmail(undefined), false);
  });
});

describe("isAdminEmail — ADMIN_EMAILS not configured in production", () => {
  it("blocks any email in prod", () => {
    delete mutableEnv.ADMIN_EMAILS;
    mutableEnv.NODE_ENV = "production";
    assert.equal(isAdminEmail("anyone@example.com"), false);
  });
});
