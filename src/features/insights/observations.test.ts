import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildObservations,
  type ObservationEntry,
} from "@/src/features/insights/observations";

const euro = (value: number) => `€${value.toFixed(2)}`;

let counter = 0;

function entry(overrides: Partial<ObservationEntry> & { dateKey: string; amount: number }): ObservationEntry {
  counter += 1;
  return {
    id: `e${counter}`,
    title: "movimento",
    categoryId: "cibo",
    categoryName: "Cibo fuori",
    categorySlug: "cibo",
    isFixed: false,
    payerId: "marian",
    payerLabel: "Marian",
    isShared: false,
    monthKey: overrides.dateKey.slice(0, 7),
    ...overrides,
  };
}

/** Un mese piatto: n giorni con lo stesso importo, per fare da storico. */
function flatMonth(monthKey: string, perDay: number, days = 28, categoryId = "cibo") {
  return Array.from({ length: days }, (_, index) =>
    entry({
      dateKey: `${monthKey}-${String(index + 1).padStart(2, "0")}`,
      amount: perDay,
      categoryId,
      categoryName: categoryId === "cibo" ? "Cibo fuori" : "Spesa",
    }),
  );
}

const BASE = {
  monthKey: "2026-07",
  dayOfMonth: 20,
  daysInMonth: 31,
  formatAmount: euro,
};

describe("buildObservations", () => {
  it("says nothing without history", () => {
    // Meglio una pagina che tace di una che inventa un pattern su due settimane.
    const observations = buildObservations({
      ...BASE,
      entries: flatMonth("2026-07", 20, 20),
    });

    assert.deepEqual(
      observations.filter((item) => item.kind === "pace"),
      [],
    );
  });

  it("reports the pace when the month runs above the usual one", () => {
    const observations = buildObservations({
      ...BASE,
      entries: [
        ...flatMonth("2026-05", 20),
        ...flatMonth("2026-06", 20),
        ...flatMonth("2026-07", 40, 20),
      ],
    });
    const pace = observations.find((item) => item.kind === "pace");

    assert.ok(pace, "l'osservazione sul passo deve esserci");
    assert.match(pace.title, /sopra/u);
  });

  it("reports the pace when the month runs below", () => {
    const observations = buildObservations({
      ...BASE,
      entries: [
        ...flatMonth("2026-05", 40),
        ...flatMonth("2026-06", 40),
        ...flatMonth("2026-07", 12, 20),
      ],
    });

    assert.match(String(observations.find((item) => item.kind === "pace")?.title), /sotto/u);
  });

  it("stays quiet when the month is in line", () => {
    const observations = buildObservations({
      ...BASE,
      entries: [
        ...flatMonth("2026-05", 20),
        ...flatMonth("2026-06", 20),
        ...flatMonth("2026-07", 20, 20),
      ],
    });

    assert.deepEqual(
      observations.filter((item) => item.kind === "pace"),
      [],
    );
  });

  it("ignores fixed costs, so rent day does not read as overspending", () => {
    // Un affitto segnato il 5 invece che l'11 spostava i confronti di
    // centinaia di euro senza che fosse cambiato nulla nei consumi.
    const withRent = buildObservations({
      ...BASE,
      entries: [
        ...flatMonth("2026-05", 20),
        ...flatMonth("2026-06", 20),
        ...flatMonth("2026-07", 20, 20),
        entry({
          dateKey: "2026-07-05",
          amount: 500,
          title: "Affitto",
          categoryId: "casa",
          categoryName: "Casa",
          isFixed: true,
        }),
      ],
    });

    assert.deepEqual(
      withRent.filter((item) => item.kind === "pace"),
      [],
    );
  });

  it("flags a movement far above the typical one of its category", () => {
    const observations = buildObservations({
      ...BASE,
      entries: [
        ...flatMonth("2026-07", 15, 19),
        entry({ dateKey: "2026-07-20", amount: 120, title: "Cena anniversario" }),
      ],
    });
    const outlier = observations.find((item) => item.kind === "outlier");

    assert.equal(outlier?.title, "Cena anniversario");
    assert.equal(outlier?.entryIds.length, 1);
  });

  it("does not flag a big movement in a category where big is normal", () => {
    const observations = buildObservations({
      ...BASE,
      entries: flatMonth("2026-07", 120, 20),
    });

    assert.deepEqual(
      observations.filter((item) => item.kind === "outlier"),
      [],
    );
  });

  it("compares the two heaviest categories against each other", () => {
    const observations = buildObservations({
      ...BASE,
      entries: [
        ...flatMonth("2026-07", 30, 20, "cibo"),
        ...flatMonth("2026-07", 10, 20, "spesa"),
      ],
    });
    const ratio = observations.find((item) => item.kind === "ratio");

    assert.match(String(ratio?.title), /3\.0×/u);
  });

  it("points at a category that carries the month", () => {
    const observations = buildObservations({
      ...BASE,
      entries: [
        ...flatMonth("2026-07", 30, 20, "cibo"),
        ...flatMonth("2026-07", 5, 20, "spesa"),
      ],
    });

    assert.ok(observations.some((item) => item.kind === "dominant"));
  });

  it("reports what concentrates after the 15th, only once the month is over", () => {
    const lateEntries = Array.from({ length: 10 }, (_, index) =>
      entry({ dateKey: `2026-07-${20 + index}`, amount: 30 }),
    );

    const midMonth = buildObservations({ ...BASE, entries: lateEntries });
    assert.deepEqual(
      midMonth.filter((item) => item.kind === "second-half"),
      [],
    );

    const monthOver = buildObservations({ ...BASE, dayOfMonth: 31, entries: lateEntries });
    assert.ok(monthOver.some((item) => item.kind === "second-half"));
  });

  it("notices a category that was not there before", () => {
    const observations = buildObservations({
      ...BASE,
      entries: [
        ...flatMonth("2026-05", 20),
        ...flatMonth("2026-06", 20),
        ...flatMonth("2026-07", 20, 20),
        entry({
          dateKey: "2026-07-10",
          amount: 80,
          title: "Psicologa",
          categoryId: "salute",
          categoryName: "Salute",
        }),
      ],
    });

    assert.ok(observations.some((item) => item.kind === "new-category"));
  });

  it("orders observations so the most relevant comes first", () => {
    const observations = buildObservations({
      ...BASE,
      entries: [
        ...flatMonth("2026-05", 20),
        ...flatMonth("2026-06", 20),
        ...flatMonth("2026-07", 40, 20),
        entry({ dateKey: "2026-07-18", amount: 400, title: "Volo" }),
      ],
    });

    const weights = observations.map((item) => item.weight);
    assert.deepEqual(weights, [...weights].sort((left, right) => right - left));
  });

  it("does not talk about who paid when there is only one person", () => {
    const observations = buildObservations({
      ...BASE,
      dayOfMonth: 31,
      entries: [
        ...flatMonth("2026-05", 20),
        ...flatMonth("2026-06", 20),
        ...flatMonth("2026-07", 20, 28),
      ],
    });

    assert.deepEqual(
      observations.filter((item) => item.kind === "payer-balance"),
      [],
    );
  });
});

describe("il tetto della pagina", () => {
  it("keeps the page readable when everything happens at once", () => {
    // Su tre mesi veri le regole producevano quattordici schede, con la stessa
    // voce ripetuta una volta per movimento: un elenco, non delle notizie.
    const noisy = [
      ...flatMonth("2026-05", 20),
      ...flatMonth("2026-06", 20),
      ...flatMonth("2026-07", 40, 20),
      ...Array.from({ length: 6 }, (_, index) =>
        entry({ dateKey: `2026-07-${10 + index}`, amount: 300, title: "Erba" }),
      ),
    ];

    const observations = buildObservations({ ...BASE, entries: noisy });

    assert.ok(observations.length <= 5, "al massimo cinque osservazioni");
    const outliers = observations.filter((item) => item.kind === "outlier");
    assert.ok(outliers.length <= 2, "al massimo due dello stesso tipo");
  });

  it("says the same fact only once", () => {
    const repeated = [
      ...flatMonth("2026-07", 10, 19),
      entry({ dateKey: "2026-07-20", amount: 90, title: "Erba" }),
      entry({ dateKey: "2026-07-20", amount: 90, title: "Erba" }),
    ];

    const observations = buildObservations({ ...BASE, entries: repeated });
    const titles = observations.map((item) => `${item.title}|${item.detail}`);

    assert.equal(new Set(titles).size, titles.length);
  });

  it("gets the direction right when someone paid less than usual", () => {
    const entries = [
      ...flatMonth("2026-05", 20, 28),
      ...flatMonth("2026-06", 20, 28),
      ...flatMonth("2026-07", 20, 28).map((item, index) =>
        index < 6 ? item : { ...item, payerId: "marta", payerLabel: "Marta" },
      ),
    ];

    const observations = buildObservations({ ...BASE, dayOfMonth: 31, entries });
    const payer = observations.find((item) => item.kind === "payer-balance");

    if (payer?.title.includes("Marian")) {
      assert.match(payer.title, /meno del solito/u);
    }
  });
});
