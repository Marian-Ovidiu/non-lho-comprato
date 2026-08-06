import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSharedWorkspaceName,
  resolveInviteTargetWorkspace,
  toShortPersonLabel,
} from "@/src/features/workspaces/pairing";

const NOW = new Date("2026-08-06T10:00:00.000Z");

function fakeTx() {
  const calls = {
    createdWorkspaces: [] as Array<{ name: string; kind: string; ownerUserId: string }>,
    createdMembers: [] as Array<{ workspaceId: string; userId: string; role: string }>,
    repointedInvites: [] as Array<{ id: string; workspaceId: string }>,
  };

  return {
    calls,
    workspace: {
      create: async ({ data }: { data: { name: string; kind: "shared"; ownerUserId: string } }) => {
        calls.createdWorkspaces.push(data);
        return { id: "ws-new", name: data.name, kind: data.kind };
      },
    },
    workspaceMember: {
      create: async ({
        data,
      }: {
        data: { workspaceId: string; userId: string; role: "owner" | "member" };
      }) => {
        calls.createdMembers.push(data);
        return null;
      },
    },
    workspaceInvite: {
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { workspaceId: string };
      }) => {
        calls.repointedInvites.push({ id: where.id, workspaceId: data.workspaceId });
        return null;
      },
    },
  };
}

describe("toShortPersonLabel", () => {
  it("keeps the first name", () => {
    assert.equal(toShortPersonLabel("Marian Hutanu", "m@example.com"), "Marian");
  });

  it("falls back to the local part of the address", () => {
    assert.equal(toShortPersonLabel(null, "martina.maero@example.com"), "martina.maero");
    assert.equal(toShortPersonLabel("   ", "marta@example.com"), "marta");
  });

  it("returns nothing when there is nothing to use", () => {
    assert.equal(toShortPersonLabel(null, null), null);
    assert.equal(toShortPersonLabel("  ", "  "), null);
  });
});

describe("buildSharedWorkspaceName", () => {
  it("names the space after the two people", () => {
    assert.equal(
      buildSharedWorkspaceName(
        { name: "Marian Hutanu" },
        { name: "Marth Maero" },
      ),
      "Marian e Marth",
    );
  });

  it("falls back when one of the two cannot be named", () => {
    assert.equal(
      buildSharedWorkspaceName({ name: "Marian" }, { name: null, email: null }),
      "Spazio condiviso",
    );
  });

  it("keeps the name within the allowed length", () => {
    const long = "a".repeat(60);
    const name = buildSharedWorkspaceName({ name: long }, { name: long });

    assert.ok(name.length <= 80);
  });
});

describe("resolveInviteTargetWorkspace", () => {
  const inviter = { id: "user-inviter", name: "Marian Hutanu", email: "m@example.com" };
  const accepter = { id: "user-accepter", name: "Marth Maero", email: "b@example.com" };

  it("creates the shared space when the invite still points at a private one", async () => {
    const tx = fakeTx();

    const target = await resolveInviteTargetWorkspace(tx, {
      inviteId: "inv-1",
      workspace: { id: "private-1", name: "m@example.com", kind: "private", ownerUserId: "user-inviter" },
      inviter,
      accepter,
      now: NOW,
    });

    assert.equal(target.created, true);
    assert.equal(target.kind, "shared");
    assert.deepEqual(tx.calls.createdWorkspaces, [
      { name: "Marian e Marth", kind: "shared", ownerUserId: "user-inviter" },
    ]);
    // Chi invita deve trovarsi dentro il nuovo spazio, altrimenti non avrebbe
    // niente tra cui passare.
    assert.equal(tx.calls.createdMembers[0]?.userId, "user-inviter");
    assert.equal(tx.calls.createdMembers[0]?.role, "owner");
  });

  it("repoints the invite so the next person joins the same space", async () => {
    const tx = fakeTx();

    await resolveInviteTargetWorkspace(tx, {
      inviteId: "inv-1",
      workspace: { id: "private-1", name: "m@example.com", kind: "private", ownerUserId: "user-inviter" },
      inviter,
      accepter,
      now: NOW,
    });

    assert.deepEqual(tx.calls.repointedInvites, [{ id: "inv-1", workspaceId: "ws-new" }]);
  });

  it("leaves an already shared space alone", async () => {
    const tx = fakeTx();

    const target = await resolveInviteTargetWorkspace(tx, {
      inviteId: "inv-1",
      workspace: { id: "ws-shared", name: "Marian e Marth", kind: "shared" },
      inviter,
      accepter,
      now: NOW,
    });

    assert.deepEqual(target, {
      id: "ws-shared",
      name: "Marian e Marth",
      kind: "shared",
      created: false,
    });
    assert.deepEqual(tx.calls.createdWorkspaces, []);
    assert.deepEqual(tx.calls.repointedInvites, []);
  });

  it("does not create an ownerless space", async () => {
    const tx = fakeTx();

    const target = await resolveInviteTargetWorkspace(tx, {
      inviteId: "inv-1",
      workspace: { id: "private-1", name: "orfano", kind: "private", ownerUserId: null },
      inviter: { id: null },
      accepter,
      now: NOW,
    });

    assert.equal(target.created, false);
    assert.deepEqual(tx.calls.createdWorkspaces, []);
  });
});
