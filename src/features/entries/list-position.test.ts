import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clampRestoredCount,
  ENTRIES_SNAPSHOT_STORAGE_KEY,
  entryAnchorId,
  planRestoreScroll,
  SMOOTH_TAIL_ROWS,
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

describe("planRestoreScroll", () => {
  const rowHeight = 72;
  const tail = rowHeight * SMOOTH_TAIL_ROWS;

  it("scivola e basta quando la riga è a poche posizioni", () => {
    const plan = planRestoreScroll({
      currentScroll: 0,
      destination: tail - 100,
      rowHeight,
      prefersReducedMotion: false,
    });

    assert.equal(plan.instantTo, null);
    assert.equal(plan.smoothTo, tail - 100);
  });

  it("salta fin quasi a destinazione quando la strada è lunga", () => {
    const destination = 6000;
    const plan = planRestoreScroll({
      currentScroll: 0,
      destination,
      rowHeight,
      prefersReducedMotion: false,
    });

    // Il salto lascia esattamente una coda da percorrere in morbido.
    assert.equal(plan.instantTo, destination - tail);
    assert.equal(plan.smoothTo, destination);
  });

  it("salta dalla parte giusta anche tornando indietro", () => {
    const plan = planRestoreScroll({
      currentScroll: 6000,
      destination: 0,
      rowHeight,
      prefersReducedMotion: false,
    });

    // Risalendo, l'avvicinamento sta *sotto* la meta: il tratto morbido si
    // muove nello stesso verso del viaggio, senza rimbalzi.
    assert.equal(plan.instantTo, tail);
    assert.equal(plan.smoothTo, 0);
  });

  it("non anima niente quando il movimento è di troppo disturbo", () => {
    const plan = planRestoreScroll({
      currentScroll: 0,
      destination: 6000,
      rowHeight,
      prefersReducedMotion: true,
    });

    assert.equal(plan.instantTo, 6000);
    assert.equal(plan.smoothTo, null);
  });

  it("regge una riga di altezza nulla senza dividere per zero", () => {
    const plan = planRestoreScroll({
      currentScroll: 0,
      destination: 5,
      rowHeight: 0,
      prefersReducedMotion: false,
    });

    assert.equal(plan.instantTo, null);
    assert.equal(plan.smoothTo, 5);
  });
});
