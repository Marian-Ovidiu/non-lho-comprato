import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { splitBalanceMovements } from "@/src/features/balances/split";

const IO = "utente-io";
const LEI = "utente-lei";
const giorno = "2026-08-10";

function spesa(over: Partial<Parameters<typeof splitBalanceMovements>[0][number]> = {}) {
  return {
    dateKey: giorno,
    amount: 100,
    paidByUserId: IO,
    isJointAccount: false,
    ...over,
  };
}

describe("splitBalanceMovements", () => {
  it("toglie l'intero dal saldo di chi ha pagato, anche se la spesa vale per due", () => {
    // È il punto su cui il modello si decide: metà e metà renderebbe
    // entrambi i saldi ottimisti, perché dal conto di chi paga esce tutto.
    const out = splitBalanceMovements([spesa()], [], IO);

    assert.deepEqual(out.personalOut, [{ dateKey: giorno, amount: 100 }]);
    assert.equal(out.jointOut.length, 0);
  });

  it("non tocca il mio saldo se ha pagato l'altra persona", () => {
    const out = splitBalanceMovements([spesa({ paidByUserId: LEI })], [], IO);

    assert.equal(out.personalOut.length, 0);
    assert.equal(out.jointOut.length, 0);
  });

  it("manda le cointestate sul comune, chiunque le abbia inserite", () => {
    const out = splitBalanceMovements(
      [
        spesa({ isJointAccount: true, paidByUserId: IO }),
        spesa({ isJointAccount: true, paidByUserId: LEI, amount: 40 }),
      ],
      [],
      IO,
    );

    assert.equal(out.personalOut.length, 0);
    assert.deepEqual(out.jointOut.map((m) => m.amount), [100, 40]);
  });

  it("ignora le spese senza un pagante invece di attribuirle a caso", () => {
    const out = splitBalanceMovements([spesa({ paidByUserId: null })], [], IO);

    assert.equal(out.personalOut.length, 0);
    assert.equal(out.jointOut.length, 0);
  });

  it("porta le entrate sul conto su cui sono state incassate", () => {
    const out = splitBalanceMovements(
      [],
      [
        { dateKey: giorno, amount: 1800, receivedByUserId: IO },
        { dateKey: giorno, amount: 900, receivedByUserId: LEI },
        { dateKey: giorno, amount: 200, receivedByUserId: null },
      ],
      IO,
    );

    assert.deepEqual(out.personalIn.map((m) => m.amount), [1800]);
    assert.deepEqual(out.jointIn.map((m) => m.amount), [200]);
  });

  it("non fa mai toccare due saldi allo stesso movimento", () => {
    const spese = [
      spesa(),
      spesa({ paidByUserId: LEI }),
      spesa({ isJointAccount: true }),
    ];
    const out = splitBalanceMovements(spese, [], IO);

    const toccati =
      out.personalOut.length + out.jointOut.length;
    assert.ok(toccati <= spese.length);
    assert.equal(toccati, 2); // la terza è dell'altra persona: non mi riguarda
  });
});
