import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAccountDeletionPlan } from "@/src/lib/account-deletion";

const now = new Date("2026-06-14T10:00:00.000Z");
const later = new Date("2026-06-14T11:00:00.000Z");

describe("buildAccountDeletionPlan", () => {
  it("deletes workspaces where the user is the only member", () => {
    assert.deepEqual(
      buildAccountDeletionPlan("user-1", [
        {
          id: "workspace-1",
          kind: "private",
          ownerUserId: "user-1",
          members: [{ userId: "user-1", role: "owner", createdAt: now }],
        },
      ]),
      {
        workspaceIdsToDelete: ["workspace-1"],
        retainedWorkspaceIds: [],
        ownershipTransfers: [],
      },
    );
  });

  it("retains shared workspaces and removes only the deleting user's membership", () => {
    assert.deepEqual(
      buildAccountDeletionPlan("user-1", [
        {
          id: "workspace-1",
          kind: "shared",
          ownerUserId: "user-2",
          members: [
            { userId: "user-1", role: "member", createdAt: now },
            { userId: "user-2", role: "owner", createdAt: later },
          ],
        },
      ]),
      {
        workspaceIdsToDelete: [],
        retainedWorkspaceIds: ["workspace-1"],
        ownershipTransfers: [],
      },
    );
  });

  it("transfers ownership before deleting an owner from a shared workspace", () => {
    assert.deepEqual(
      buildAccountDeletionPlan("user-1", [
        {
          id: "workspace-1",
          kind: "shared",
          ownerUserId: "user-1",
          members: [
            { userId: "user-1", role: "owner", createdAt: now },
            { userId: "user-2", role: "member", createdAt: later },
          ],
        },
      ]),
      {
        workspaceIdsToDelete: [],
        retainedWorkspaceIds: ["workspace-1"],
        ownershipTransfers: [
          { workspaceId: "workspace-1", newOwnerUserId: "user-2" },
        ],
      },
    );
  });
});
