import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ACCOUNT_DELETION_WORDS,
  getAccountDeletionWord,
  isAccountDeletionConfirmed,
} from "@/src/features/account/deletion-confirmation";

describe("getAccountDeletionWord", () => {
  it("returns the word shown in each language", () => {
    assert.equal(getAccountDeletionWord("it"), "ELIMINA");
    assert.equal(getAccountDeletionWord("en"), "DELETE");
  });

  it("falls back for unknown or missing languages", () => {
    assert.equal(getAccountDeletionWord("de"), "ELIMINA");
    assert.equal(getAccountDeletionWord(null), "ELIMINA");
    assert.equal(getAccountDeletionWord("  "), "ELIMINA");
  });
});

describe("isAccountDeletionConfirmed", () => {
  it("accepts the word of every supported language", () => {
    for (const word of Object.values(ACCOUNT_DELETION_WORDS)) {
      assert.equal(isAccountDeletionConfirmed(word), true);
    }
  });

  it("accepts the word whatever the case and spacing", () => {
    assert.equal(isAccountDeletionConfirmed("delete"), true);
    assert.equal(isAccountDeletionConfirmed("  Elimina "), true);
  });

  it("rejects anything else", () => {
    assert.equal(isAccountDeletionConfirmed(""), false);
    assert.equal(isAccountDeletionConfirmed("   "), false);
    assert.equal(isAccountDeletionConfirmed(null), false);
    assert.equal(isAccountDeletionConfirmed("elimina account"), false);
    assert.equal(isAccountDeletionConfirmed("cancella"), false);
  });
});
