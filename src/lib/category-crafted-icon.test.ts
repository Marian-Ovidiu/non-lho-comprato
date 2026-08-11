import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_CATEGORIES } from "@/src/lib/categories";
import {
  getCategoryCraftedIcon,
  SELECTABLE_CATEGORY_ICONS,
} from "@/src/lib/category-crafted-icon";

describe("getCategoryCraftedIcon", () => {
  it("gives every default category an icon of its own", () => {
    // Prima erano nove icone per diciassette categorie: Cibo, Delivery e Spesa
    // condividevano la posata. In un elenco l'icona è la prima cosa che si
    // legge, e se è la stessa per tre categorie non sta dicendo niente.
    const byIcon = new Map<string, string[]>();

    for (const category of DEFAULT_CATEGORIES) {
      const icon = getCategoryCraftedIcon(category);
      byIcon.set(icon, [...(byIcon.get(icon) ?? []), category.name]);
    }

    const shared = [...byIcon.entries()].filter(([, names]) => names.length > 1);

    assert.deepEqual(
      shared,
      [],
      `icone condivise: ${shared.map(([icon, names]) => `${icon} → ${names.join(", ")}`).join(" · ")}`,
    );
    assert.equal(byIcon.size, DEFAULT_CATEGORIES.length);
  });

  it("matches by slug or by name, ignoring case and accents", () => {
    assert.equal(getCategoryCraftedIcon({ slug: "caffe" }), "coffee");
    assert.equal(getCategoryCraftedIcon({ name: "Caffè" }), "coffee");
    assert.equal(getCategoryCraftedIcon({ name: "RISTORANTE" }), "restaurant");
    assert.equal(
      getCategoryCraftedIcon({ slug: "sigarette-accessori" }),
      "cig",
    );
  });

  it("gives a face to the categories people create by hand", () => {
    // Prima ricadevano tutte sulla ricevuta, cioè sull'icona di "Altro".
    assert.equal(getCategoryCraftedIcon({ name: "Luce" }), "bolt");
    assert.equal(getCategoryCraftedIcon({ name: "Gas" }), "bolt");
    assert.equal(getCategoryCraftedIcon({ name: "Medicina" }), "pill");
    assert.equal(getCategoryCraftedIcon({ name: "Benzina" }), "car");
    assert.equal(getCategoryCraftedIcon({ name: "Costi Banca" }), "wallet");
  });

  it("does not pretend to recognise what it does not know", () => {
    // Un cartellino distingue senza fingere: "Altro" ha un'icona sua e non
    // deve essere anche il rifugio di tutto ciò che non è in elenco.
    const unknown = getCategoryCraftedIcon({ name: "Zzz qualcosa" });

    assert.equal(unknown, "bookmark");
    assert.notEqual(unknown, getCategoryCraftedIcon({ slug: "altro" }));
  });

  it("falls back for empty input", () => {
    assert.equal(getCategoryCraftedIcon(), "bookmark");
    assert.equal(getCategoryCraftedIcon({ name: "", slug: "" }), "bookmark");
  });
});

describe("SELECTABLE_CATEGORY_ICONS", () => {
  it("offers every default icon to anyone creating a category", () => {
    const defaults = new Set(DEFAULT_CATEGORIES.map(getCategoryCraftedIcon));

    for (const icon of defaults) {
      assert.ok(
        SELECTABLE_CATEGORY_ICONS.includes(icon),
        `l'icona ${icon} è usata da un default ma non si può scegliere`,
      );
    }
  });

  it("lists each icon once", () => {
    assert.equal(
      new Set(SELECTABLE_CATEGORY_ICONS).size,
      SELECTABLE_CATEGORY_ICONS.length,
    );
  });
});
