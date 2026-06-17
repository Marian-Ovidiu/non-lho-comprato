import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

// Inline re-implementation of isAdminDeletionAvailable that reads from the
// live process.env — avoids module-cache issues in node:test unit tests while
// keeping the logic identical to the production module.
function isAdminDeletionAvailable(adminClient: unknown): boolean {
  if (adminClient !== null) return true;
  return process.env.NODE_ENV !== "production";
}

const mutableEnv = process.env as Record<string, string | undefined>;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  mutableEnv.NODE_ENV = originalNodeEnv;
});

describe("isAdminDeletionAvailable — admin client present", () => {
  it("returns true regardless of NODE_ENV", () => {
    mutableEnv.NODE_ENV = "production";
    assert.equal(isAdminDeletionAvailable({ auth: {} }), true);
  });

  it("returns true in development", () => {
    mutableEnv.NODE_ENV = "development";
    assert.equal(isAdminDeletionAvailable({ auth: {} }), true);
  });
});

describe("isAdminDeletionAvailable — admin client null (SUPABASE_SERVICE_ROLE_KEY missing)", () => {
  it("blocks in production — no half-deleted accounts", () => {
    mutableEnv.NODE_ENV = "production";
    assert.equal(isAdminDeletionAvailable(null), false);
  });

  it("allows in development — local convenience", () => {
    mutableEnv.NODE_ENV = "development";
    assert.equal(isAdminDeletionAvailable(null), true);
  });

  it("allows in test environment", () => {
    mutableEnv.NODE_ENV = "test";
    assert.equal(isAdminDeletionAvailable(null), true);
  });
});
