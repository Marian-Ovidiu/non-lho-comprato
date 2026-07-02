import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.DATABASE_URL ??= "postgresql://user:pass@localhost:5432/non_lho_comprato_test";

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
