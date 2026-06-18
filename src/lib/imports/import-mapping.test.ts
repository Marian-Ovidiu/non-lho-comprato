import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  mapCsvRowToImportedTransactionDraft,
  normalizeHeader,
  validateCsvImportMapping,
} from "@/src/lib/imports/import-mapping";
import type { CsvImportColumnMapping } from "@/src/lib/imports/import-domain";

const baseMapping: CsvImportColumnMapping = {
  date: "Data operazione",
  description: "Descrizione",
  amount: "Importo",
  currency: "Valuta",
  merchantName: "Merchant",
  dateFormat: "DD/MM/YYYY",
  amountConvention: "negative_is_expense",
};

describe("normalizeHeader", () => {
  it("normalizes accents, spaces and punctuation", () => {
    assert.equal(normalizeHeader("  Data  Operazióne  "), "data operazione");
    assert.equal(normalizeHeader("Importo €"), "importo");
    assert.equal(normalizeHeader("Controparte / Merchant"), "controparte merchant");
  });
});

describe("validateCsvImportMapping", () => {
  it("accepts a valid mapping", () => {
    const result = validateCsvImportMapping(
      ["Data operazione", "Descrizione", "Importo", "Valuta", "Merchant"],
      baseMapping,
    );

    assert.equal(result.ok, true);
  });

  it("rejects a mapping with a missing column", () => {
    const result = validateCsvImportMapping(
      ["Data operazione", "Descrizione", "Importo"],
      baseMapping,
    );

    assert.equal(result.ok, false);
    assert.equal(result.errors.currency, "Colonna mancante nel CSV");
    assert.equal(result.errors.merchantName, "Colonna mancante nel CSV");
  });
});

describe("mapCsvRowToImportedTransactionDraft", () => {
  it("parses DD/MM/YYYY and european amounts", () => {
    const draft = mapCsvRowToImportedTransactionDraft(
      {
        "Data operazione": "18/06/2026",
        Descrizione: "Caffè",
        Importo: "-1.234,56",
        Valuta: "eur",
        Merchant: "Bar Centrale",
      },
      baseMapping,
      { sourceRowIndex: 7, defaultCurrency: "EUR" },
    );

    assert.equal(draft.sourceRowIndex, 7);
    assert.equal(draft.status, "pending");
    assert.equal(draft.description, "Caffè");
    assert.equal(draft.merchantName, "Bar Centrale");
    assert.equal(draft.amount, 1234.56);
    assert.equal(draft.currency, "EUR");
    assert.equal(draft.date?.toISOString(), "2026-06-18T00:00:00.000Z");
  });

  it("parses YYYY-MM-DD and american amounts", () => {
    const draft = mapCsvRowToImportedTransactionDraft(
      {
        "Data operazione": "2026-06-18",
        Descrizione: "Bookshop",
        Importo: "1,234.56",
        Valuta: "usd",
        Merchant: "Books Inc",
      },
      {
        ...baseMapping,
        dateFormat: "YYYY-MM-DD",
        amountConvention: "positive_is_expense",
      },
    );

    assert.equal(draft.status, "pending");
    assert.equal(draft.amount, 1234.56);
    assert.equal(draft.currency, "USD");
    assert.equal(draft.date?.toISOString(), "2026-06-18T00:00:00.000Z");
  });

  it("marks positive inflows as ignored in negative_is_expense mode", () => {
    const draft = mapCsvRowToImportedTransactionDraft(
      {
        "Data operazione": "18/06/2026",
        Descrizione: "Salary",
        Importo: "2500,00",
        Valuta: "EUR",
        Merchant: "Payroll",
      },
      baseMapping,
    );

    assert.equal(draft.status, "ignored");
    assert.equal(draft.amount, 2500);
  });

  it("marks invalid rows as errors", () => {
    const draft = mapCsvRowToImportedTransactionDraft(
      {
        "Data operazione": "",
        Descrizione: "",
        Importo: "",
        Valuta: "",
        Merchant: "",
      },
      baseMapping,
    );

    assert.equal(draft.status, "error");
    assert.match(draft.errorMessage ?? "", /date|description|amount/i);
  });
});

