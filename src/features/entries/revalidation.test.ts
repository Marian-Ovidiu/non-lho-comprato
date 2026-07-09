import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ENTRY_DEPENDENT_PATHS,
  revalidateEntryDependentViews,
} from "@/src/features/entries/revalidation";

describe("revalidateEntryDependentViews", () => {
  it("revalidates every dependent path and bumps the entries/goals tags", () => {
    const paths: string[] = [];
    const tags: string[] = [];

    revalidateEntryDependentViews("workspace-1", {
      revalidatePath: (path) => paths.push(path),
      updateTag: (tag) => tags.push(tag),
    });

    assert.deepEqual(paths, [...ENTRY_DEPENDENT_PATHS]);
    assert.deepEqual(tags, ["entries:workspace-1", "goals:workspace-1"]);
  });

  it("still bumps the tags when a revalidatePath throws", () => {
    const tags: string[] = [];

    assert.doesNotThrow(() =>
      revalidateEntryDependentViews("workspace-2", {
        revalidatePath: () => {
          throw new Error("outside request scope");
        },
        updateTag: (tag) => tags.push(tag),
      }),
    );

    assert.deepEqual(tags, ["entries:workspace-2", "goals:workspace-2"]);
  });
});
