import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { splitBalanceMovements } from "@/src/features/balances/split";

const IO = "utente-io";
const LEI = "utente-lei";
const giorno = "2026-08-10";

function spesa(
  over: Partial<Parameters<typeof splitBalanceMovements>[0][number]> = {},
) {
  return {
    dateKey: giorno,
    amount: 100,
    paidByUserId: IO,
    isJointAccount: false,
    ...over,
  };
}

function giroconto(
  over: Partial<Parameters<typeof splitBalanceMovements>[2][number]> = {},
) {
  return {
    dateKey: giorno,
    amount: 400,
    userId: IO,
    direction: "to_joint" as const,
    ...over,
  };
}

function regolamento(
  over: Partial<Parameters<typeof splitBalanceMovements>[3][number]> = {},
) {
  return {
    dateKey: giorno,
    amount: 200,
    fromUserId: IO,
    toUserId: LEI,
    ...over,
  };
}

describe("splitBalanceMovements", () => {
  it("toglie l'intero dal saldo di chi ha pagato, anche se la spesa vale per due", () => {
    // È il punto su cui il modello si decide: metà e metà renderebbe
    // entrambi i saldi ottimisti, perché dal conto di chi paga esce tutto.
    const out = splitBalanceMovements([spesa()], [], [], [], IO);

    assert.deepEqual(out.personalOut, [{ dateKey: giorno, amount: 100 }]);
    assert.equal(out.jointOut.length, 0);
  });

  it("non tocca il mio saldo se ha pagato l'altra persona", () => {
    const out = splitBalanceMovements(
      [spesa({ paidByUserId: LEI })],
      [],
      [],
      [],
      IO,
    );

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
      [],
      [],
      IO,
    );

    assert.equal(out.personalOut.length, 0);
    assert.deepEqual(
      out.jointOut.map((m) => m.amount),
      [100, 40],
    );
  });

  it("ignora le spese senza un pagante invece di attribuirle a caso", () => {
    const out = splitBalanceMovements(
      [spesa({ paidByUserId: null })],
      [],
      [],
      [],
      IO,
    );

    assert.equal(out.personalOut.length, 0);
    assert.equal(out.jointOut.length, 0);
  });

  it("porta l'entrata sul conto personale di chi l'ha incassata", () => {
    const out = splitBalanceMovements(
      [],
      [
        { dateKey: giorno, amount: 1800, receivedByUserId: IO },
        { dateKey: giorno, amount: 900, receivedByUserId: LEI },
      ],
      [],
      [],
      IO,
    );

    assert.deepEqual(
      out.personalIn.map((m) => m.amount),
      [1800],
    );
    assert.equal(out.jointIn.length, 0);
  });

  it("non manda mai un'entrata sul conto comune", () => {
    // Era la vecchia regola, e confondeva "di nessuno" con "di tutti e due".
    // Sul comune i soldi ci arrivano solo versati da qualcuno: è un giroconto.
    const out = splitBalanceMovements(
      [],
      [{ dateKey: giorno, amount: 200, receivedByUserId: null }],
      [],
      [],
      IO,
    );

    assert.equal(out.jointIn.length, 0);
    assert.equal(out.personalIn.length, 0);
  });

  it("il versamento sul comune esce dal mio saldo ed entra nel comune", () => {
    const out = splitBalanceMovements([], [], [giroconto()], [], IO);

    assert.deepEqual(out.personalOut, [{ dateKey: giorno, amount: 400 }]);
    assert.deepEqual(out.jointIn, [{ dateKey: giorno, amount: 400 }]);
    assert.equal(out.personalIn.length, 0);
    assert.equal(out.jointOut.length, 0);
  });

  it("il prelievo dal comune entra nel mio saldo ed esce dal comune", () => {
    const out = splitBalanceMovements(
      [],
      [],
      [giroconto({ direction: "to_personal", amount: 150 })],
      [],
      IO,
    );

    assert.deepEqual(out.personalIn, [{ dateKey: giorno, amount: 150 }]);
    assert.deepEqual(out.jointOut, [{ dateKey: giorno, amount: 150 }]);
  });

  it("il versamento dell'altra persona muove il comune ma non il mio saldo", () => {
    // È il caso che rende visibile lo storico senza aprire il suo saldo: vedo
    // che ha messo 100 nel comune, non vedo cosa resta sul suo conto.
    const out = splitBalanceMovements(
      [],
      [],
      [giroconto({ userId: LEI, amount: 100 })],
      [],
      IO,
    );

    assert.deepEqual(
      out.jointIn.map((m) => m.amount),
      [100],
    );
    assert.equal(out.personalOut.length, 0);
    assert.equal(out.personalIn.length, 0);
  });

  it("un giroconto senza persona lascia il comune coerente e nessun personale", () => {
    const out = splitBalanceMovements(
      [],
      [],
      [giroconto({ userId: null })],
      [],
      IO,
    );

    assert.deepEqual(
      out.jointIn.map((m) => m.amount),
      [400],
    );
    assert.equal(out.personalOut.length, 0);
  });

  it("versare e riprendere lo stesso importo lascia i due saldi come prima", () => {
    const out = splitBalanceMovements(
      [],
      [],
      [giroconto(), giroconto({ direction: "to_personal" })],
      [],
      IO,
    );

    const somma = (movimenti: { amount: number }[]) =>
      movimenti.reduce((totale, m) => totale + m.amount, 0);

    assert.equal(somma(out.personalIn) - somma(out.personalOut), 0);
    assert.equal(somma(out.jointIn) - somma(out.jointOut), 0);
  });

  it("il regolamento che pago esce dal mio saldo", () => {
    // Per mesi i regolamenti hanno spostato soldi veri che nessun saldo
    // vedeva: due numeri sbagliati, in silenzio, ogni volta che pareggiavate.
    const out = splitBalanceMovements([], [], [], [regolamento()], IO);

    assert.deepEqual(out.personalOut, [{ dateKey: giorno, amount: 200 }]);
    assert.equal(out.personalIn.length, 0);
  });

  it("il regolamento che incasso entra nel mio saldo", () => {
    const out = splitBalanceMovements(
      [],
      [],
      [],
      [regolamento({ fromUserId: LEI, toUserId: IO })],
      IO,
    );

    assert.deepEqual(out.personalIn, [{ dateKey: giorno, amount: 200 }]);
    assert.equal(out.personalOut.length, 0);
  });

  it("il regolamento non tocca mai il conto comune", () => {
    // È un pareggio fra due persone: il cointestato non c'entra, ed è il
    // motivo per cui non serve la guardia sulle date del giroconto.
    const out = splitBalanceMovements([], [], [], [regolamento()], IO);

    assert.equal(out.jointIn.length, 0);
    assert.equal(out.jointOut.length, 0);
  });

  it("un regolamento fra estranei non entra in nessuno dei miei saldi", () => {
    const out = splitBalanceMovements(
      [],
      [],
      [],
      [regolamento({ fromUserId: "terzo", toUserId: LEI })],
      IO,
    );

    assert.equal(out.personalIn.length, 0);
    assert.equal(out.personalOut.length, 0);
  });

  it("nessuna spesa tocca due saldi", () => {
    const spese = [
      spesa(),
      spesa({ paidByUserId: LEI }),
      spesa({ isJointAccount: true }),
    ];
    const out = splitBalanceMovements(spese, [], [], [], IO);

    const toccati = out.personalOut.length + out.jointOut.length;
    assert.ok(toccati <= spese.length);
    assert.equal(toccati, 2); // la terza è dell'altra persona: non mi riguarda
  });
});
