import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildBalanceLedger } from "@/src/features/balances/ledger";

const creato = new Date("2026-09-01T10:00:00.000Z");

function movimento(
  dateKey: string,
  amount: number,
  id: string,
  kind: "entry" | "income" | "transfer" | "settlement" = "entry",
) {
  return { dateKey, amount, ref: { kind, id } };
}

const describe_ = (ref: { id: string }) => ({
  title: `titolo ${ref.id}`,
  createdAt: creato,
});

describe("buildBalanceLedger", () => {
  it("parte dal saldo dichiarato e porta avanti il progressivo", () => {
    const rows = buildBalanceLedger(
      [
        {
          label: "Io",
          start: { amount: 1000, dateKey: "2026-09-01" },
          incoming: [movimento("2026-09-05", 200, "e1", "income")],
          outgoing: [movimento("2026-09-02", 50.5, "s1")],
        },
      ],
      describe_,
    );

    assert.deepEqual(
      rows.map((row) => [row.kind, row.amount, row.runningBalance]),
      [
        ["saldo_partenza", "1000.00", "1000.00"],
        ["spesa", "-50.50", "949.50"],
        ["entrata", "200.00", "1149.50"],
      ],
    );
    assert.equal(rows[1]?.title, "titolo s1");
  });

  it("mostra i movimenti prima della partenza ma non li somma", () => {
    // Sono quelli che l'app ignora: vederli spiega perche' il saldo non li
    // ha contati, un progressivo accanto farebbe credere il contrario.
    const rows = buildBalanceLedger(
      [
        {
          label: "Io",
          start: { amount: 100, dateKey: "2026-09-10" },
          incoming: [],
          outgoing: [
            movimento("2026-09-09", 30, "prima"),
            movimento("2026-09-10", 10, "stesso-giorno"),
          ],
        },
      ],
      describe_,
    );

    assert.deepEqual(
      rows.map((row) => [row.id, row.countsTowardBalance, row.runningBalance]),
      [
        ["prima", "false", ""],
        ["", "true", "100.00"],
        ["stesso-giorno", "true", "90.00"],
      ],
    );
  });

  it("senza saldo di partenza elenca i movimenti e non inventa un progressivo", () => {
    const rows = buildBalanceLedger(
      [
        {
          label: "Lei",
          start: null,
          incoming: [movimento("2026-09-03", 500, "stipendio", "income")],
          outgoing: [],
        },
      ],
      describe_,
    );

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.countsTowardBalance, "");
    assert.equal(rows[0]?.runningBalance, "");
  });

  it("scrive il saldo di partenza anche se dopo non e' successo niente", () => {
    const rows = buildBalanceLedger(
      [
        {
          label: "Conto comune",
          start: { amount: 148.58, dateKey: "2026-10-22" },
          incoming: [],
          outgoing: [movimento("2026-10-01", 20, "vecchia")],
        },
      ],
      describe_,
    );

    assert.deepEqual(
      rows.map((row) => row.kind),
      ["spesa", "saldo_partenza"],
    );
  });
});
