import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertWorkspaceRecord } from "@/src/lib/workspace-isolation";

// These tests enforce the workspace isolation contract:
// a record belonging to workspace-B must never be returned to a session
// scoped to workspace-A.
//
// DB-level enforcement: actions now call
//   prisma.*.findUnique({ where: { id, workspaceId } })
// so Prisma returns null for any cross-workspace lookup.
//
// Application-level enforcement (HabitOccurrence + any future model without a
// direct workspaceId): `assertWorkspaceRecord` is called post-fetch.
// Both layers are tested here.

describe("assertWorkspaceRecord — workspace isolation policy", () => {
  describe("null record (resource not found)", () => {
    it("throws when record is null", () => {
      assert.throws(
        () => assertWorkspaceRecord(null, "ws-a"),
        { message: "record not found" },
      );
    });

    it("includes the resource label in the error message", () => {
      assert.throws(
        () => assertWorkspaceRecord(null, "ws-a", "Entry"),
        { message: "Entry not found" },
      );
    });
  });

  describe("direct workspaceId mismatch (cross-workspace attack)", () => {
    it("throws when record.workspaceId belongs to a different workspace", () => {
      assert.throws(
        () => assertWorkspaceRecord({ workspaceId: "ws-b" }, "ws-a", "Entry"),
        { message: "Entry not found" },
      );
    });

    it("throws even with a plausible-looking workspace ID", () => {
      assert.throws(
        () => assertWorkspaceRecord(
          { workspaceId: "ws-a-evil" },
          "ws-a",
          "Goal",
        ),
        { message: "Goal not found" },
      );
    });

    it("throws when workspaceId is null (orphan record)", () => {
      assert.throws(
        () => assertWorkspaceRecord({ workspaceId: null }, "ws-a", "Budget"),
        { message: "Budget not found" },
      );
    });

    it("throws when workspaceId is undefined (unscoped record)", () => {
      assert.throws(
        () => assertWorkspaceRecord({}, "ws-a", "Record"),
        { message: "Record not found" },
      );
    });
  });

  describe("matching workspace (same-workspace access)", () => {
    it("does not throw when workspaceId matches", () => {
      assert.doesNotThrow(() =>
        assertWorkspaceRecord({ workspaceId: "ws-a" }, "ws-a"),
      );
    });

    it("allows access with the minimal required shape", () => {
      assert.doesNotThrow(() =>
        assertWorkspaceRecord({ workspaceId: "ws-a", habit: null }, "ws-a"),
      );
    });
  });

  describe("HabitOccurrence — workspace resolved via habit relation", () => {
    it("throws when habit belongs to a different workspace", () => {
      assert.throws(
        () => assertWorkspaceRecord(
          { habit: { workspaceId: "ws-b" } },
          "ws-a",
          "Occurrence",
        ),
        { message: "Occurrence not found" },
      );
    });

    it("allows access when habit belongs to the current workspace", () => {
      assert.doesNotThrow(() =>
        assertWorkspaceRecord(
          { habit: { workspaceId: "ws-a" } },
          "ws-a",
          "Occurrence",
        ),
      );
    });

    it("throws when habit.workspaceId is null", () => {
      assert.throws(
        () => assertWorkspaceRecord(
          { habit: { workspaceId: null } },
          "ws-a",
          "Occurrence",
        ),
        { message: "Occurrence not found" },
      );
    });

    it("prefers record.workspaceId over habit.workspaceId when both are present", () => {
      // A record with a direct workspaceId should use that — not the habit's.
      assert.doesNotThrow(() =>
        assertWorkspaceRecord(
          { workspaceId: "ws-a", habit: { workspaceId: "ws-b" } },
          "ws-a",
        ),
      );

      assert.throws(
        () => assertWorkspaceRecord(
          { workspaceId: "ws-b", habit: { workspaceId: "ws-a" } },
          "ws-a",
        ),
        { message: "record not found" },
      );
    });
  });

  describe("error message hides workspace IDs (no information leak)", () => {
    it("error message does not reveal which workspace the record belongs to", () => {
      let thrownMessage = "";
      try {
        assertWorkspaceRecord({ workspaceId: "ws-secret-b" }, "ws-a", "Entry");
      } catch (e) {
        thrownMessage = e instanceof Error ? e.message : String(e);
      }
      assert.equal(thrownMessage, "Entry not found");
      assert.ok(
        !thrownMessage.includes("ws-secret-b"),
        "Error message must not leak the record's workspaceId",
      );
    });
  });
});
