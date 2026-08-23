import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  decodeFeedCursor,
  encodeFeedCursor,
  sliceFeedPage,
  type FeedRowRef,
} from "@/src/features/entries/month-feed";

const riga = (over: Partial<FeedRowRef> = {}): FeedRowRef => ({
  kind: "entry",
  id: "riga-1",
  date: new Date("2026-08-20T00:00:00.000Z"),
  createdAt: new Date("2026-08-20T10:30:00.000Z"),
  ...over,
});

describe("cursore del feed", () => {
  it("torna intatto dopo un giro di andata e ritorno", () => {
    const originale = riga();
    const tornato = decodeFeedCursor(encodeFeedCursor(originale));

    assert.equal(tornato?.id, originale.id);
    assert.equal(tornato?.date.getTime(), originale.date.getTime());
    assert.equal(tornato?.createdAt.getTime(), originale.createdAt.getTime());
  });

  it("distingue due righe con la stessa data ma tabelle diverse", () => {
    // È il motivo per cui l'id da solo non basta più: una spesa e un'entrata
    // possono cadere lo stesso giorno e nessuna delle due viene prima per id.
    const spesa = encodeFeedCursor(riga({ id: "a" }));
    const entrata = encodeFeedCursor(riga({ id: "b", kind: "income" }));

    assert.notEqual(spesa, entrata);
  });

  it("legge come 'nessun cursore' tutto cio' che non abbiamo scritto noi", () => {
    for (const spazzatura of [null, undefined, "", "abc", "a|b", "1|2|3|4", "non-una-data|non-una-data|x"]) {
      assert.equal(decodeFeedCursor(spazzatura), null, String(spazzatura));
    }
  });
});

describe("sliceFeedPage", () => {
  it("con meno righe del limite non c'e' un seguito", () => {
    const out = sliceFeedPage([riga({ id: "a" }), riga({ id: "b" })], 20);

    assert.equal(out.hasMore, false);
    assert.equal(out.nextCursor, null);
    assert.equal(out.rows.length, 2);
  });

  it("con una riga in piu' taglia, segnala il seguito e punta all'ultima tenuta", () => {
    const righe = [riga({ id: "a" }), riga({ id: "b" }), riga({ id: "c" })];
    const out = sliceFeedPage(righe, 2);

    assert.equal(out.hasMore, true);
    assert.deepEqual(out.rows.map((r) => r.id), ["a", "b"]);
    // Non "c": quella appartiene gia' alla pagina dopo.
    assert.ok(out.nextCursor?.endsWith("|b"));
  });

  it("con esattamente il limite non promette una pagina che non c'e'", () => {
    const out = sliceFeedPage([riga({ id: "a" }), riga({ id: "b" })], 2);

    assert.equal(out.hasMore, false);
    assert.equal(out.nextCursor, null);
  });
});
