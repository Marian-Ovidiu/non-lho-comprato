import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.DATABASE_URL ??=
  "postgresql://user:pass@localhost:5432/non_lho_comprato_test";

import {
  buildEntriesKindWhere,
  buildEntriesSearchWhere,
  isLikelyImportedNoise,
  normalizeSearchQuery,
  parseSimpleAmountQuery,
} from "@/src/features/entries/search";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

const MEMBERS: WorkspaceMemberOption[] = [
  { userId: "user-1", label: "Marian", name: "Marian", email: "marian@example.com" },
  { userId: "user-2", label: "Martina", name: "Martina", email: "martina@example.com" },
];

describe("normalizeSearchQuery", () => {
  it("trims and lowercases", () => {
    assert.equal(normalizeSearchQuery("  CaFfÈ  "), "caffè");
    assert.equal(normalizeSearchQuery(undefined), "");
  });
});

describe("parseSimpleAmountQuery", () => {
  it("parses plain and comma decimals", () => {
    assert.equal(parseSimpleAmountQuery("25")?.toString(), "25");
    assert.equal(parseSimpleAmountQuery("12,50")?.toString(), "12.5");
    assert.equal(parseSimpleAmountQuery("12.50")?.toString(), "12.5");
  });

  it("handles Italian and English thousand separators", () => {
    assert.equal(parseSimpleAmountQuery("1.234,56")?.toString(), "1234.56");
    assert.equal(parseSimpleAmountQuery("1,234.56")?.toString(), "1234.56");
  });

  it("strips currency symbols and spaces", () => {
    assert.equal(parseSimpleAmountQuery("€ 25,00")?.toString(), "25");
  });

  it("returns null for non-amounts", () => {
    for (const input of ["caffè", "", "-", "+", ".", "-.", "12.3.4"]) {
      assert.equal(parseSimpleAmountQuery(input), null, JSON.stringify(input));
    }
  });
});

describe("isLikelyImportedNoise", () => {
  it("flags bank-import wording in title or note", () => {
    assert.equal(isLikelyImportedNoise("Addebito SEPA"), true);
    assert.equal(isLikelyImportedNoise("Cena", "pagata con bonifico"), true);
  });

  it("keeps ordinary titles", () => {
    assert.equal(isLikelyImportedNoise("Caffè al bar"), false);
  });
});

describe("buildEntriesKindWhere", () => {
  it("maps every filter to the right mode and context", () => {
    assert.deepEqual(buildEntriesKindWhere(), {});
    assert.deepEqual(buildEntriesKindWhere("all"), {});
    assert.deepEqual(buildEntriesKindWhere("evitata"), { mode: "avoided" });
    assert.deepEqual(buildEntriesKindWhere("confronto"), {
      mode: "spent",
      savingContext: "comparison",
    });
    assert.deepEqual(buildEntriesKindWhere("spesa"), {
      mode: "spent",
      savingContext: "none",
    });
  });
});

describe("buildEntriesSearchWhere", () => {
  it("returns an empty filter for empty queries", () => {
    assert.deepEqual(buildEntriesSearchWhere("   ", MEMBERS), {});
  });

  it("searches title and category for plain text", () => {
    const where = buildEntriesSearchWhere("caffè", MEMBERS);
    const clauses = where.OR ?? [];

    assert.ok(
      clauses.some(
        (clause) =>
          typeof clause.title === "object" &&
          clause.title !== null &&
          "contains" in clause.title &&
          clause.title.contains === "caffè",
      ),
    );
    assert.ok(clauses.some((clause) => clause.category));
  });

  it("adds amount clauses when the query parses as money", () => {
    const where = buildEntriesSearchWhere("12,50", MEMBERS);
    const amountClause = (where.OR ?? []).find(
      (clause) => Array.isArray(clause.OR) && clause.OR.some((c) => c.realCost),
    );

    assert.ok(amountClause, "clausola importo mancante");
  });

  it("adds member clauses when the query matches a member", () => {
    const where = buildEntriesSearchWhere("martina", MEMBERS);
    const memberClause = (where.OR ?? []).find(
      (clause) => Array.isArray(clause.OR) && clause.OR.some((c) => c.paidByUserId),
    );

    assert.ok(memberClause, "clausola membri mancante");
    const paidBy = memberClause?.OR?.find((c) => c.paidByUserId);
    assert.deepEqual(paidBy?.paidByUserId, { in: ["user-2"] });
  });
});
