import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  getLegacyAuthMapping,
  isLegacyAuthBridgeEnabled,
} from "@/src/lib/auth/legacy-auth";

const originalEnv = {
  ENABLE_LEGACY_AUTH_BRIDGE: process.env.ENABLE_LEGACY_AUTH_BRIDGE,
  LEGACY_MARIAN_EMAIL: process.env.LEGACY_MARIAN_EMAIL,
  LEGACY_MARTINA_EMAIL: process.env.LEGACY_MARTINA_EMAIL,
  LEGACY_WORKSPACE_ID: process.env.LEGACY_WORKSPACE_ID,
};

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("legacy auth bridge", () => {
  it("does not map legacy emails unless explicitly enabled", () => {
    delete process.env.ENABLE_LEGACY_AUTH_BRIDGE;
    process.env.LEGACY_MARIAN_EMAIL = "legacy@example.com";

    assert.equal(isLegacyAuthBridgeEnabled(), false);
    assert.equal(getLegacyAuthMapping("legacy@example.com"), null);
  });

  it("maps legacy emails only when the compat bridge is enabled", () => {
    process.env.ENABLE_LEGACY_AUTH_BRIDGE = "true";
    process.env.LEGACY_MARIAN_EMAIL = "legacy@example.com";
    process.env.LEGACY_WORKSPACE_ID = "legacy-workspace";

    assert.deepEqual(getLegacyAuthMapping("LEGACY@example.com"), {
      userId: "legacy-marian",
      workspaceId: "legacy-workspace",
    });
  });
});
