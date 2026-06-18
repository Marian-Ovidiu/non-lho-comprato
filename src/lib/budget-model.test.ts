import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildBudgetScopeKey,
  normalizeBudgetScopeInput,
  validateBudgetScopeInput,
} from "@/src/lib/budget-model";

describe("buildBudgetScopeKey", () => {
  it("builds the canonical workspace key", () => {
    assert.equal(buildBudgetScopeKey("workspace"), "workspace");
  });

  it("builds the canonical category key from categoryId", () => {
    assert.equal(buildBudgetScopeKey("category", "cat-123"), "cat-123");
  });
});

describe("normalizeBudgetScopeInput", () => {
  it("normalizes text, currency and numeric amount inputs", () => {
    assert.deepEqual(
      normalizeBudgetScopeInput({
        scope: "category",
        period: "monthly",
        amount: "12,345",
        categoryId: "  cat-123  ",
        scopeKey: "ignored",
        currency: "eur",
      }),
      {
        scope: "category",
        period: "monthly",
        amount: 12.35,
        categoryId: "cat-123",
        scopeKey: "cat-123",
        requestedScopeKey: "ignored",
        currency: "EUR",
      },
    );
  });

  it("keeps workspace scopeKey canonical even when categoryId is present in input", () => {
    assert.deepEqual(
      normalizeBudgetScopeInput({
        scope: "workspace",
        period: "weekly",
        amount: 50,
        categoryId: "cat-123",
      }),
      {
        scope: "workspace",
        period: "weekly",
        amount: 50,
        categoryId: "cat-123",
        scopeKey: "workspace",
        requestedScopeKey: null,
        currency: null,
      },
    );
  });
});

describe("validateBudgetScopeInput", () => {
  it("accepts a valid workspace budget", () => {
    assert.deepEqual(
      validateBudgetScopeInput({
        scope: "workspace",
        period: "monthly",
        amount: "100",
        scopeKey: "workspace",
      }),
      {
        ok: true,
        value: {
          scope: "workspace",
          period: "monthly",
          amount: 100,
          categoryId: null,
          scopeKey: "workspace",
          requestedScopeKey: "workspace",
          currency: null,
        },
      },
    );
  });

  it("accepts a valid category budget", () => {
    const result = validateBudgetScopeInput({
      scope: "category",
      period: "weekly",
      amount: 25,
      categoryId: "cat-123",
      scopeKey: "cat-123",
      currency: "eur",
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.value, {
        scope: "category",
        period: "weekly",
        amount: 25,
        categoryId: "cat-123",
        scopeKey: "cat-123",
        requestedScopeKey: "cat-123",
        currency: "EUR",
      });
    }
  });

  it("rejects invalid budget inputs", () => {
    const result = validateBudgetScopeInput({
      scope: "workspace",
      period: "yearly",
      amount: 0,
      categoryId: "cat-123",
      scopeKey: "cat-123",
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.deepEqual(result.errors, {
        period: "Il periodo deve essere weekly o monthly.",
        amount: "L'importo deve essere maggiore di 0.",
        categoryId: "Un budget workspace non può avere categoryId.",
        scopeKey: "scopeKey incoerente con scope e categoryId.",
      });
    }
  });

  it("rejects category budgets without categoryId", () => {
    const result = validateBudgetScopeInput({
      scope: "category",
      period: "monthly",
      amount: 10,
      scopeKey: "cat-123",
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.deepEqual(result.errors, {
        categoryId: "Un budget category richiede categoryId.",
        scopeKey: "scopeKey incoerente con scope e categoryId.",
      });
    }
  });
});
