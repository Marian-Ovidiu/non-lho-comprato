import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  detectDelimiter,
  MAX_CSV_IMPORT_ROWS,
  parseCsvText,
} from "@/src/lib/imports/import-parser";

describe("detectDelimiter", () => {
  it("detects comma, semicolon and tab", () => {
    assert.equal(detectDelimiter("a,b\n1,2"), ",");
    assert.equal(detectDelimiter("a;b\n1;2"), ";");
    assert.equal(detectDelimiter("a\tb\n1\t2"), "\t");
  });
});

describe("parseCsvText", () => {
  it("parses header rows, quoted fields, BOM and blank lines", () => {
    const csv = '\uFEFFdate,description,amount\n2026-06-18,"Coffee, milk",12.34\n\n2026-06-19,"Two ""quotes"" here",4.56\n';

    const result = parseCsvText(csv);

    assert.equal(result.delimiter, ",");
    assert.deepEqual(result.headers, ["date", "description", "amount"]);
    assert.equal(result.rowCount, 2);
    assert.deepEqual(result.rows[0], {
      sourceRowIndex: 1,
      values: {
        date: "2026-06-18",
        description: "Coffee, milk",
        amount: "12.34",
      },
    });
    assert.deepEqual(result.rows[1], {
      sourceRowIndex: 2,
      values: {
        date: "2026-06-19",
        description: 'Two "quotes" here',
        amount: "4.56",
      },
    });
  });

  it("accepts the default row limit and throws when it is exceeded", () => {
    const rows = Array.from({ length: MAX_CSV_IMPORT_ROWS + 1 }, (_, index) =>
      `2026-06-${String((index % 28) + 1).padStart(2, "0")},Item ${index + 1},1.00`,
    );
    const csvAtLimit = `date,description,amount\n${rows.slice(0, MAX_CSV_IMPORT_ROWS).join("\n")}`;
    const csvOverLimit = `date,description,amount\n${rows.join("\n")}`;

    assert.equal(parseCsvText(csvAtLimit).rowCount, MAX_CSV_IMPORT_ROWS);
    assert.throws(() => parseCsvText(csvOverLimit), /max row limit/i);
  });
});
