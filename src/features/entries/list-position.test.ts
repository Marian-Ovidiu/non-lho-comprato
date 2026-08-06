import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clampRestoredCount,
  ENTRIES_SNAPSHOT_STORAGE_KEY,
  entryAnchorId,
  isSnapshotUsable,
  MAX_RESTORED_ENTRIES,
  parseSnapshot,
  readSnapshot,
  SNAPSHOT_TTL_MS,
  writeSnapshot,
  type EntriesListSnapshot,
} from "@/src/features/entries/list-position";

const NOW = 1_760_000_000_000;

function snapshot(overrides: Partial<EntriesListSnapshot> = {}): EntriesListSnapshot {
  return {
    monthKey: "2026-07",
    query: "",
    kind: "all",
    categoryIds: [],
    loadedCount: 60,
    anchorEntryId: "entry-1",
    savedAt: NOW,
    ...overrides,
  };
}

function fakeStorage(initial: string | null = null) {
  let value = initial;

  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
    removeItem: () => {
      value = null;
    },
    read: () => value,
  };
}

describe("isSnapshotUsable", () => {
  it("accepts a fresh snapshot for the same month", () => {
    assert.equal(isSnapshotUsable(snapshot(), "2026-07", NOW + 1000), true);
  });

  it("rejects another month", () => {
    // Cambiare mese cambia elenco: la riga di prima non c'entra più.
    assert.equal(isSnapshotUsable(snapshot(), "2026-06", NOW), false);
  });

  it("rejects a snapshot older than the ttl", () => {
    assert.equal(
      isSnapshotUsable(snapshot(), "2026-07", NOW + SNAPSHOT_TTL_MS + 1),
      false,
    );
  });

  it("rejects a snapshot saved in the future", () => {
    assert.equal(isSnapshotUsable(snapshot(), "2026-07", NOW - 1000), false);
  });

  it("rejects a snapshot without an anchor row", () => {
    assert.equal(
      isSnapshotUsable(snapshot({ anchorEntryId: "" }), "2026-07", NOW),
      false,
    );
  });

  it("rejects nothing at all", () => {
    assert.equal(isSnapshotUsable(null, "2026-07", NOW), false);
  });
});

describe("clampRestoredCount", () => {
  it("never restores less than a page", () => {
    assert.equal(clampRestoredCount(0, 20), 20);
    assert.equal(clampRestoredCount(7, 20), 20);
    assert.equal(clampRestoredCount(Number.NaN, 20), 20);
  });

  it("keeps the loaded amount when it is bigger", () => {
    assert.equal(clampRestoredCount(100, 20), 100);
  });

  it("caps the restore so the query stays bounded", () => {
    assert.equal(clampRestoredCount(5000, 20), MAX_RESTORED_ENTRIES);
  });
});

describe("parseSnapshot", () => {
  it("returns null for missing or broken payloads", () => {
    assert.equal(parseSnapshot(null), null);
    assert.equal(parseSnapshot("not json"), null);
    assert.equal(parseSnapshot(JSON.stringify({ monthKey: "2026-07" })), null);
  });

  it("fills in defaults for partial payloads", () => {
    const parsed = parseSnapshot(
      JSON.stringify({ monthKey: "2026-07", anchorEntryId: "e1", savedAt: NOW }),
    );

    assert.deepEqual(parsed, {
      monthKey: "2026-07",
      query: "",
      kind: "all",
      categoryIds: [],
      loadedCount: 0,
      anchorEntryId: "e1",
      savedAt: NOW,
    });
  });

  it("drops non-string category ids", () => {
    const parsed = parseSnapshot(
      JSON.stringify({
        ...snapshot(),
        categoryIds: ["cat-1", 42, null, "cat-2"],
      }),
    );

    assert.deepEqual(parsed?.categoryIds, ["cat-1", "cat-2"]);
  });
});

describe("readSnapshot", () => {
  it("reads once and clears, so only the way back restores", () => {
    const storage = fakeStorage(JSON.stringify(snapshot()));

    assert.equal(readSnapshot(storage)?.anchorEntryId, "entry-1");
    assert.equal(storage.read(), null);
    assert.equal(readSnapshot(storage), null);
  });

  it("survives a missing storage", () => {
    assert.equal(readSnapshot(null), null);
  });
});

describe("writeSnapshot", () => {
  it("round-trips through storage", () => {
    const storage = fakeStorage();
    writeSnapshot(storage, snapshot({ query: "sushi", categoryIds: ["cat-1"] }));

    const parsed = parseSnapshot(storage.read());
    assert.equal(parsed?.query, "sushi");
    assert.deepEqual(parsed?.categoryIds, ["cat-1"]);
  });

  it("survives a storage that refuses to write", () => {
    assert.doesNotThrow(() =>
      writeSnapshot(
        {
          setItem: () => {
            throw new Error("quota exceeded");
          },
        },
        snapshot(),
      ),
    );
    assert.doesNotThrow(() => writeSnapshot(null, snapshot()));
  });
});

describe("entryAnchorId", () => {
  it("builds a dom id that survives being used as a selector", () => {
    assert.equal(entryAnchorId("abc123"), "entry-row-abc123");
    assert.equal(ENTRIES_SNAPSHOT_STORAGE_KEY, "nlc_entries_list_position");
  });
});
