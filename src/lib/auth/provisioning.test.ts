import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  getLegacyAuthMapping,
  isLegacyAuthBridgeEnabled,
} from "@/src/lib/auth/legacy-auth";

process.env.DATABASE_URL ??= "postgresql://user:pass@localhost:5432/non_lho_comprato_test";

const mutableEnv = process.env as Record<string, string | undefined>;
const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  ENABLE_LEGACY_AUTH_BRIDGE: process.env.ENABLE_LEGACY_AUTH_BRIDGE,
  LEGACY_PRIMARY_EMAIL: process.env.LEGACY_PRIMARY_EMAIL,
  LEGACY_SECONDARY_EMAIL: process.env.LEGACY_SECONDARY_EMAIL,
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
    process.env.LEGACY_PRIMARY_EMAIL = "legacy@example.com";

    assert.equal(isLegacyAuthBridgeEnabled(), false);
    assert.equal(getLegacyAuthMapping("legacy@example.com"), null);
  });

  it("maps legacy emails only when the compat bridge is enabled", () => {
    process.env.ENABLE_LEGACY_AUTH_BRIDGE = "true";
    process.env.LEGACY_PRIMARY_EMAIL = "legacy@example.com";
    process.env.LEGACY_WORKSPACE_ID = "legacy-workspace";

    assert.deepEqual(getLegacyAuthMapping("LEGACY@example.com"), {
      userId: "legacy-user-1",
      workspaceId: "legacy-workspace",
    });
  });

  it("never maps legacy emails in production even when the bridge flag is enabled", () => {
    mutableEnv.NODE_ENV = "production";
    process.env.ENABLE_LEGACY_AUTH_BRIDGE = "true";
    process.env.LEGACY_PRIMARY_EMAIL = "legacy@example.com";
    process.env.LEGACY_WORKSPACE_ID = "legacy-workspace";

    assert.equal(isLegacyAuthBridgeEnabled(), false);
    assert.equal(getLegacyAuthMapping("legacy@example.com"), null);
  });
});

describe("active workspace fallback", () => {
  it("uses the most recently selected workspace when no valid cookie is present", async () => {
    const { resolveActiveWorkspaceForUser } = await import("@/src/lib/auth/provisioning");

    const { workspace, resolutionPath } = await resolveActiveWorkspaceForUser({
      userId: "user-1",
      email: "person@example.com",
      selectedWorkspaceId: null,
      accessibleWorkspaces: [
        {
          id: "private-user-1",
          name: "Privato",
          kind: "private",
          timezone: "Europe/Rome",
          currency: "EUR",
          language: "it",
          ownerUserId: "user-1",
          lastSelectedAt: new Date("2026-06-10T10:00:00.000Z"),
        },
        {
          id: "shared-casa",
          name: "Casa",
          kind: "shared",
          timezone: "Europe/Rome",
          currency: "EUR",
          language: "it",
          ownerUserId: "user-2",
          lastSelectedAt: new Date("2026-06-11T10:00:00.000Z"),
        },
      ],
    });

    assert.equal(workspace.id, "shared-casa");
    assert.equal(resolutionPath, "accessible:fallback");
  });

  it("prefers a shared workspace over the private workspace when no last selection exists", async () => {
    const { resolveActiveWorkspaceForUser } = await import("@/src/lib/auth/provisioning");

    const { workspace } = await resolveActiveWorkspaceForUser({
      userId: "user-1",
      email: "person@example.com",
      selectedWorkspaceId: null,
      accessibleWorkspaces: [
        {
          id: "private-user-1",
          name: "Privato",
          kind: "private",
          timezone: "Europe/Rome",
          currency: "EUR",
          language: "it",
          ownerUserId: "user-1",
          lastSelectedAt: null,
        },
        {
          id: "shared-casa",
          name: "Casa",
          kind: "shared",
          timezone: "Europe/Rome",
          currency: "EUR",
          language: "it",
          ownerUserId: "user-2",
          lastSelectedAt: null,
        },
      ],
    });

    assert.equal(workspace.id, "shared-casa");
  });
});
