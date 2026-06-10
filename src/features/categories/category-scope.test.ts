import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getWorkspaceCategorySlugWhere } from "@/src/features/categories/category-scope";

describe("getWorkspaceCategorySlugWhere", () => {
  it("uses workspaceId and slug as the category identity", () => {
    assert.deepEqual(getWorkspaceCategorySlugWhere("workspace-a", "caffe"), {
      workspaceId_slug: {
        workspaceId: "workspace-a",
        slug: "caffe",
      },
    });
  });

  it("keeps the same slug isolated across workspaces", () => {
    assert.notDeepEqual(
      getWorkspaceCategorySlugWhere("workspace-a", "caffe"),
      getWorkspaceCategorySlugWhere("workspace-b", "caffe"),
    );
  });
});
