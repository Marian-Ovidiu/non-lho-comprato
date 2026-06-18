import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getMerchantCategoryPresets } from "@/src/lib/imports/merchant-category-presets";

describe("getMerchantCategoryPresets", () => {
  it("returns stable unique presets and merges fallback locales", () => {
    const presets = getMerchantCategoryPresets("fr");

    assert.equal(presets.length, 4);
    assert.equal(new Set(presets.map((preset) => preset.key)).size, 4);

    const cigarettes = presets.find((preset) => preset.key === "cigarettes");
    assert.ok(cigarettes);
    assert.ok(cigarettes?.merchantTokens.includes("tabaccheria"));
    assert.ok(cigarettes?.merchantTokens.includes("smoke"));
  });

  it("keeps priority ordering deterministic", () => {
    const presets = getMerchantCategoryPresets("it");

    assert.deepEqual(
      presets.map((preset) => preset.key),
      ["cigarettes", "groceries", "subscriptions", "delivery"],
    );
  });
});

