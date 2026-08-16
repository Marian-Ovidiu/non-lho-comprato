import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeBalance,
  countsTowardBalance,
} from "@/src/features/balances/balance";

const start = { amount: 1000, dateKey: "2026-08-01" };

describe("computeBalance", () => {
  it("non dichiara niente finché il saldo non è stato impostato", () => {
    const state = computeBalance(null, [], []);
    assert.equal(state.configured, false);
  });

  it("somma le entrate e sottrae le uscite dal punto di partenza", () => {
    const state = computeBalance(
      start,
      [{ dateKey: "2026-08-05", amount: 1800 }],
      [
        { dateKey: "2026-08-06", amount: 250 },
        { dateKey: "2026-08-07", amount: 49.9 },
      ],
    );

    assert.equal(state.configured, true);
    if (!state.configured) return;
    assert.equal(state.incoming, 1800);
    assert.equal(state.outgoing, 299.9);
    assert.equal(state.current, 2500.1);
  });

  it("ignora quello che è successo prima del giorno di partenza", () => {
    // È il punto che rende l'aggiunta indolore su chi usa l'app da mesi:
    // i movimenti storici non devono spostare un saldo dichiarato oggi.
    const state = computeBalance(
      start,
      [{ dateKey: "2026-07-15", amount: 5000 }],
      [{ dateKey: "2026-07-20", amount: 4000 }],
    );

    assert.equal(state.configured, true);
    if (!state.configured) return;
    assert.equal(state.incoming, 0);
    assert.equal(state.outgoing, 0);
    assert.equal(state.current, 1000);
  });

  it("conta il giorno di partenza stesso", () => {
    const state = computeBalance(start, [], [{ dateKey: "2026-08-01", amount: 100 }]);

    assert.equal(state.configured, true);
    if (!state.configured) return;
    assert.equal(state.current, 900);
  });

  it("va sotto zero senza fare storie", () => {
    const state = computeBalance(start, [], [{ dateKey: "2026-08-09", amount: 1500 }]);

    assert.equal(state.configured, true);
    if (!state.configured) return;
    assert.equal(state.current, -500);
  });

  it("arrotonda ai centesimi invece di trascinare la virgola mobile", () => {
    const state = computeBalance(
      { amount: 0, dateKey: "2026-08-01" },
      [{ dateKey: "2026-08-02", amount: 0.1 }],
      [{ dateKey: "2026-08-03", amount: 0.3 }],
    );

    assert.equal(state.configured, true);
    if (!state.configured) return;
    assert.equal(state.current, -0.2);
  });
});

describe("countsTowardBalance", () => {
  it("prende da quel giorno in poi, non prima", () => {
    assert.equal(countsTowardBalance("2026-07-31", "2026-08-01"), false);
    assert.equal(countsTowardBalance("2026-08-01", "2026-08-01"), true);
    assert.equal(countsTowardBalance("2026-08-02", "2026-08-01"), true);
  });
});
