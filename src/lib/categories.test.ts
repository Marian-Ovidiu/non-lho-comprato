import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mergeCategoryOptions, DEFAULT_CATEGORIES } from "@/src/lib/categories";

describe("mergeCategoryOptions", () => {
  it("returns all default categories when given empty db list", () => {
    const result = mergeCategoryOptions([]);
    assert.equal(result.length, DEFAULT_CATEGORIES.length);
    for (const def of DEFAULT_CATEGORIES) {
      const found = result.find((r) => r.slug === def.slug);
      assert.ok(found, `slug ${def.slug} should be present`);
      assert.equal(found.id, def.slug);
    }
  });

  it("uses slug as id for unprovisioned default categories", () => {
    const result = mergeCategoryOptions([]);
    const cibo = result.find((r) => r.slug === "cibo");
    assert.ok(cibo);
    assert.equal(cibo.id, "cibo");
  });

  it("replaces a default slug with the real db row when provisioned", () => {
    const dbRow = {
      id: "clxxx001",
      name: "Cibo",
      slug: "cibo",
      color: "#f97316",
      icon: "utensils",
    };
    const result = mergeCategoryOptions([dbRow]);
    const cibo = result.find((r) => r.slug === "cibo");
    assert.ok(cibo);
    assert.equal(cibo.id, "clxxx001");
  });

  it("includes a custom (non-default) db category", () => {
    const custom = {
      id: "clxxx099",
      name: "Palestra",
      slug: "palestra",
      color: "#22c55e",
      icon: "dumbbell",
    };
    const result = mergeCategoryOptions([custom]);
    const found = result.find((r) => r.slug === "palestra");
    assert.ok(found);
    assert.equal(found.id, "clxxx099");
  });

  it("skips a default slug that is in archivedDefaultSlugs", () => {
    const archived = new Set(["cibo"]);
    const result = mergeCategoryOptions([], archived);
    const cibo = result.find((r) => r.slug === "cibo");
    assert.equal(cibo, undefined);
    assert.equal(result.length, DEFAULT_CATEGORIES.length - 1);
  });

  it("skips multiple archived default slugs", () => {
    const archived = new Set(["cibo", "caffe", "altro"]);
    const result = mergeCategoryOptions([], archived);
    for (const slug of archived) {
      assert.equal(result.find((r) => r.slug === slug), undefined);
    }
    assert.equal(result.length, DEFAULT_CATEGORIES.length - 3);
  });

  it("does not skip a default slug that has an active db row even if slug is in archivedDefaultSlugs", () => {
    // This scenario is impossible in normal operation (archived rows are filtered before calling),
    // but the function should still be predictable: db rows always win.
    const dbRow = { id: "clxxx001", name: "Cibo", slug: "cibo", color: "#f97316", icon: "utensils" };
    const archived = new Set(["cibo"]);
    const result = mergeCategoryOptions([dbRow], archived);
    // static fallback for "cibo" is skipped, but then dbRow overwrites nothing in bySlug...
    // actually: the static pass skips cibo, so bySlug has no cibo entry. Then db loop adds it.
    const cibo = result.find((r) => r.slug === "cibo");
    assert.ok(cibo, "active db row should appear even if slug was in archivedDefaultSlugs");
    assert.equal(cibo.id, "clxxx001");
  });

  it("returns results sorted alphabetically by Italian locale", () => {
    const result = mergeCategoryOptions([]);
    const names = result.map((r) => r.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b, "it"));
    assert.deepEqual(names, sorted);
  });

  it("strips workspaceId/createdAt/updatedAt/archivedAt from db rows before returning", () => {
    const dbRow = {
      id: "clxxx001",
      name: "Cibo",
      slug: "cibo",
      color: "#f97316",
      icon: "utensils",
      workspaceId: "ws1",
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
    };
    const result = mergeCategoryOptions([dbRow]);
    const cibo = result.find((r) => r.slug === "cibo");
    assert.ok(cibo);
    assert.equal("workspaceId" in cibo, false);
    assert.equal("createdAt" in cibo, false);
    assert.equal("updatedAt" in cibo, false);
    assert.equal("archivedAt" in cibo, false);
  });
});
