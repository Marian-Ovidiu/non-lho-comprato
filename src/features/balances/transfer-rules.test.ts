import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  fallsBetweenBalanceStarts,
  validateTransfer,
} from "@/src/features/balances/transfer-rules";

function input(over: Partial<Parameters<typeof validateTransfer>[0]> = {}) {
  return {
    amount: 400,
    dateKey: "2026-08-20",
    direction: "to_joint",
    isShared: true,
    personalStartDateKey: "2026-08-16",
    jointStartDateKey: "2026-08-16",
    ...over,
  };
}

describe("validateTransfer", () => {
  it("accetta un versamento sul comune con date allineate", () => {
    assert.deepEqual(validateTransfer(input()), { ok: true });
  });

  it("accetta il prelievo dal comune", () => {
    assert.deepEqual(
      validateTransfer(input({ direction: "to_personal" })),
      { ok: true },
    );
  });

  it("rifiuta il giroconto in uno spazio privato", () => {
    const out = validateTransfer(input({ isShared: false }));

    assert.equal(out.ok, false);
    assert.ok(out.ok === false && out.errors.direction);
  });

  it("rifiuta un importo nullo o negativo", () => {
    for (const amount of [0, -50, Number.NaN]) {
      const out = validateTransfer(input({ amount }));
      assert.equal(out.ok, false, `importo ${amount}`);
    }
  });

  it("rifiuta una direzione inventata", () => {
    const out = validateTransfer(input({ direction: "to_nowhere" }));

    assert.equal(out.ok, false);
  });

  it("non chiede chi muove i soldi: e' sempre chi registra", () => {
    // Il campo non esiste di proposito. Se esistesse, esisterebbe anche il
    // modo di far scendere il saldo personale dell'altra persona.
    assert.ok(!("userId" in input()));
  });

  it("rifiuta la data che cade fra le due date di partenza", () => {
    // Il personale parte il 16, il comune il 20: un giroconto il 18 uscirebbe
    // dal conto personale e non entrerebbe mai nel comune.
    const out = validateTransfer(
      input({
        dateKey: "2026-08-18",
        personalStartDateKey: "2026-08-16",
        jointStartDateKey: "2026-08-20",
      }),
    );

    assert.equal(out.ok, false);
    assert.ok(out.ok === false && out.errors.date.includes("2026-08-20"));
  });

  it("accetta la data precedente a entrambe le partenze", () => {
    // La ignorano tutti e due allo stesso modo: nessun euro si perde.
    const out = validateTransfer(
      input({
        dateKey: "2026-08-01",
        personalStartDateKey: "2026-08-16",
        jointStartDateKey: "2026-08-20",
      }),
    );

    assert.deepEqual(out, { ok: true });
  });

  it("accetta la data successiva a entrambe le partenze", () => {
    const out = validateTransfer(
      input({
        dateKey: "2026-09-01",
        personalStartDateKey: "2026-08-16",
        jointStartDateKey: "2026-08-20",
      }),
    );

    assert.deepEqual(out, { ok: true });
  });

  it("non inventa la finestra quando un saldo non e' stato impostato", () => {
    const out = validateTransfer(
      input({ dateKey: "2026-08-01", jointStartDateKey: null }),
    );

    assert.deepEqual(out, { ok: true });
  });
});

describe("fallsBetweenBalanceStarts", () => {
  it("e' simmetrica: non importa quale dei due saldi parte prima", () => {
    assert.equal(
      fallsBetweenBalanceStarts("2026-08-18", "2026-08-16", "2026-08-20"),
      true,
    );
    assert.equal(
      fallsBetweenBalanceStarts("2026-08-18", "2026-08-20", "2026-08-16"),
      true,
    );
  });

  it("il giorno di partenza del secondo saldo e' gia' fuori dalla finestra", () => {
    assert.equal(
      fallsBetweenBalanceStarts("2026-08-20", "2026-08-16", "2026-08-20"),
      false,
    );
  });

  it("con le date uguali la finestra non esiste", () => {
    assert.equal(
      fallsBetweenBalanceStarts("2026-08-16", "2026-08-16", "2026-08-16"),
      false,
    );
  });
});
