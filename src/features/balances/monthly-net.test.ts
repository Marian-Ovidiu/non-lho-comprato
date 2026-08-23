import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeMonthlyNet } from "@/src/features/balances/monthly-net";

describe("computeMonthlyNet", () => {
  it("sottrae le uscite dalle entrate", () => {
    assert.deepEqual(computeMonthlyNet([1800, 200], [900, 300]), {
      incoming: 2000,
      outgoing: 1200,
      net: 800,
    });
  });

  it("dice il rosso invece di nasconderlo", () => {
    const out = computeMonthlyNet([1000], [1400]);

    assert.equal(out.net, -400);
  });

  it("un mese senza niente vale zero, non indefinito", () => {
    assert.deepEqual(computeMonthlyNet([], []), {
      incoming: 0,
      outgoing: 0,
      net: 0,
    });
  });

  it("arrotonda ai centesimi invece di trascinare la virgola mobile", () => {
    const out = computeMonthlyNet([0.1, 0.2], []);

    assert.equal(out.incoming, 0.3);
  });

  it("non ha un posto dove infilare i giroconti", () => {
    // La firma prende due liste, non tre. È la garanzia strutturale che un
    // versamento sul conto comune non possa mai gonfiare le entrate del mese.
    assert.equal(computeMonthlyNet.length, 2);
  });
});
