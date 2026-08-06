import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canDeleteWorkspace,
  canLeaveWorkspace,
} from "@/src/features/workspaces/membership-policy";

describe("canLeaveWorkspace", () => {
  it("lets a member walk away from a shared space", () => {
    assert.deepEqual(
      canLeaveWorkspace({ workspaceKind: "shared", isMember: true, memberCount: 2 }),
      { allowed: true },
    );
  });

  it("lets the owner walk away too", () => {
    // Restare incastrati nel proprio spazio condiviso sarebbe peggio: la
    // proprietà passa a chi resta.
    assert.deepEqual(
      canLeaveWorkspace({ workspaceKind: "shared", isMember: true, memberCount: 3 }),
      { allowed: true },
    );
  });

  it("refuses to leave the personal space", () => {
    const decision = canLeaveWorkspace({
      workspaceKind: "private",
      isMember: true,
      memberCount: 1,
    });

    assert.equal(decision.allowed, false);
  });

  it("refuses when there would be nobody left", () => {
    const decision = canLeaveWorkspace({
      workspaceKind: "shared",
      isMember: true,
      memberCount: 1,
    });

    assert.equal(decision.allowed, false);
    assert.match(String(decision.allowed === false && decision.message), /eliminare/u);
  });

  it("refuses a stranger", () => {
    assert.equal(
      canLeaveWorkspace({ workspaceKind: "shared", isMember: false, memberCount: 2 })
        .allowed,
      false,
    );
  });
});

describe("canDeleteWorkspace", () => {
  const owner = "user-owner";
  const other = "user-other";

  it("lets the last one standing delete the space", () => {
    assert.deepEqual(
      canDeleteWorkspace({
        workspaceKind: "shared",
        isMember: true,
        memberCount: 1,
        actorUserId: other,
        workspaceOwnerUserId: owner,
      }),
      { allowed: true },
    );
  });

  it("lets the creator delete a space that still has people in it", () => {
    assert.deepEqual(
      canDeleteWorkspace({
        workspaceKind: "shared",
        isMember: true,
        memberCount: 2,
        actorUserId: owner,
        workspaceOwnerUserId: owner,
      }),
      { allowed: true },
    );
  });

  it("stops anyone else from deleting a shared space", () => {
    const decision = canDeleteWorkspace({
      workspaceKind: "shared",
      isMember: true,
      memberCount: 2,
      actorUserId: other,
      workspaceOwnerUserId: owner,
    });

    assert.equal(decision.allowed, false);
    // L'alternativa va detta: chi non può eliminare può comunque uscire.
    assert.match(String(decision.allowed === false && decision.message), /uscirne/u);
  });

  it("refuses to delete the personal space", () => {
    assert.equal(
      canDeleteWorkspace({
        workspaceKind: "private",
        isMember: true,
        memberCount: 1,
        actorUserId: owner,
        workspaceOwnerUserId: owner,
      }).allowed,
      false,
    );
  });

  it("refuses a stranger", () => {
    assert.equal(
      canDeleteWorkspace({
        workspaceKind: "shared",
        isMember: false,
        memberCount: 1,
        actorUserId: other,
        workspaceOwnerUserId: owner,
      }).allowed,
      false,
    );
  });
});
