import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canRemoveWorkspaceMember } from "@/src/features/workspaces/rbac-policy";

describe("canRemoveWorkspaceMember", () => {
  it("blocks non-owners from removing another member", () => {
    assert.deepEqual(
      canRemoveWorkspaceMember({
        actorUserId: "member-1",
        targetUserId: "member-2",
        actorRole: "member",
        targetRole: "member",
        workspaceOwnerUserId: "owner-1",
        ownerCount: 1,
      }),
      {
        allowed: false,
        message: "Solo un owner puo rimuovere altri membri.",
      },
    );
  });

  it("allows owners to remove regular members", () => {
    assert.deepEqual(
      canRemoveWorkspaceMember({
        actorUserId: "owner-1",
        targetUserId: "member-1",
        actorRole: "owner",
        targetRole: "member",
        workspaceOwnerUserId: "owner-1",
        ownerCount: 1,
      }),
      { allowed: true },
    );
  });

  it("blocks removal of the last owner", () => {
    assert.deepEqual(
      canRemoveWorkspaceMember({
        actorUserId: "owner-1",
        targetUserId: "owner-1",
        actorRole: "owner",
        targetRole: "owner",
        workspaceOwnerUserId: "owner-1",
        ownerCount: 1,
      }),
      {
        allowed: false,
        message: "Non puoi rimuovere l'ultimo owner dello workspace.",
      },
    );
  });

  it("allows regular members to leave the workspace", () => {
    assert.deepEqual(
      canRemoveWorkspaceMember({
        actorUserId: "member-1",
        targetUserId: "member-1",
        actorRole: "member",
        targetRole: "member",
        workspaceOwnerUserId: "owner-1",
        ownerCount: 1,
      }),
      { allowed: true },
    );
  });

  it("blocks owner self-removal until ownership transfer exists", () => {
    assert.deepEqual(
      canRemoveWorkspaceMember({
        actorUserId: "owner-1",
        targetUserId: "owner-1",
        actorRole: "owner",
        targetRole: "owner",
        workspaceOwnerUserId: "owner-1",
        ownerCount: 2,
      }),
      {
        allowed: false,
        message: "Prima trasferisci la proprieta dello workspace a un altro owner.",
      },
    );
  });

  it("blocks removal of the workspace owner even when another owner exists", () => {
    assert.deepEqual(
      canRemoveWorkspaceMember({
        actorUserId: "owner-2",
        targetUserId: "owner-1",
        actorRole: "owner",
        targetRole: "owner",
        workspaceOwnerUserId: "owner-1",
        ownerCount: 2,
      }),
      {
        allowed: false,
        message: "Prima trasferisci la proprieta dello workspace a un altro owner.",
      },
    );
  });
});
