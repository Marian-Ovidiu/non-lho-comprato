import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  detectMerchantPreset,
  normalizeMerchantText,
  resolvePresetToWorkspaceCategory,
  suggestMerchantCategory,
  type MerchantCategorizerCategory,
} from "@/src/lib/imports/merchant-categorizer";

function makeCategory(
  id: string,
  name: string,
  slug: string,
  archivedAt: Date | string | null = null,
): MerchantCategorizerCategory {
  return {
    id,
    name,
    slug,
    archivedAt,
  };
}

describe("normalizeMerchantText", () => {
  it("normalizes accents, symbols and whitespace", () => {
    assert.equal(
      normalizeMerchantText("  Tàbaccherìa & IQOS "),
      "tabaccheria and iqos",
    );
  });
});

describe("detectMerchantPreset", () => {
  it("recognizes the requested preset tokens", () => {
    assert.equal(
      detectMerchantPreset({ merchantName: "tabaccheria" })?.presetKey,
      "cigarettes",
    );
    assert.equal(
      detectMerchantPreset({ merchantName: "iqos" })?.presetKey,
      "cigarettes",
    );
    assert.equal(
      detectMerchantPreset({ merchantName: "lidl" })?.presetKey,
      "groceries",
    );
    assert.equal(
      detectMerchantPreset({ merchantName: "conad" })?.presetKey,
      "groceries",
    );
    assert.equal(
      detectMerchantPreset({ merchantName: "netflix" })?.presetKey,
      "subscriptions",
    );
    assert.equal(
      detectMerchantPreset({ merchantName: "spotify" })?.presetKey,
      "subscriptions",
    );
    assert.equal(
      detectMerchantPreset({ merchantName: "glovo" })?.presetKey,
      "delivery",
    );
    assert.equal(
      detectMerchantPreset({ merchantName: "just eat" })?.presetKey,
      "delivery",
    );
  });

  it("ignores generic tokens like pos", () => {
    assert.equal(detectMerchantPreset({ merchantName: "POS 1234" }), null);
  });

  it("gives merchantName priority over description", () => {
    const result = detectMerchantPreset({
      merchantName: "LIDL",
      description: "NETFLIX",
    });

    assert.equal(result?.presetKey, "groceries");
  });

  it("falls back to description when merchantName does not match", () => {
    const result = detectMerchantPreset({
      merchantName: "POS 1234",
      description: "NETFLIX",
    });

    assert.equal(result?.presetKey, "subscriptions");
  });

  it("falls back to it/en when locale is unknown", () => {
    assert.equal(
      detectMerchantPreset({
        merchantName: "tobacco",
        locale: "fr",
      })?.presetKey,
      "cigarettes",
    );
  });

  it("returns the most specific token when a preset matches", () => {
    const result = detectMerchantPreset({
      merchantName: "APPLE.COM/BILL",
    });

    assert.equal(result?.presetKey, "subscriptions");
    assert.equal(result?.matchedToken, "apple.com/bill");
    assert.equal(result?.confidence, "high");
  });
});

describe("resolvePresetToWorkspaceCategory", () => {
  const categories = [
    makeCategory("sigarette-accessori", "Sigarette / Accessori", "sigarette-accessori"),
    makeCategory("spesa", "Spesa", "spesa"),
    makeCategory("abbonamenti", "Abbonamenti", "abbonamenti"),
    makeCategory("delivery", "Delivery", "delivery"),
    makeCategory("archived", "Sigarette", "sigarette", new Date("2026-01-01T00:00:00.000Z")),
  ];

  it("matches the expected workspace category for each preset", () => {
    assert.equal(
      resolvePresetToWorkspaceCategory("cigarettes", categories, "it")?.id,
      "sigarette-accessori",
    );
    assert.equal(
      resolvePresetToWorkspaceCategory("groceries", categories, "it")?.id,
      "spesa",
    );
    assert.equal(
      resolvePresetToWorkspaceCategory("subscriptions", categories, "it")?.id,
      "abbonamenti",
    );
    assert.equal(
      resolvePresetToWorkspaceCategory("delivery", categories, "it")?.id,
      "delivery",
    );
  });

  it("ignores archived categories", () => {
    const archivedOnly = [
      makeCategory("archived", "Sigarette / Accessori", "sigarette-accessori", new Date()),
    ];

    assert.equal(
      resolvePresetToWorkspaceCategory("cigarettes", archivedOnly, "it"),
      null,
    );
  });

  it("falls back to alias matching for a custom locale", () => {
    assert.equal(
      resolvePresetToWorkspaceCategory("groceries", categories, "fr")?.id,
      "spesa",
    );
  });

  it("is deterministic when more categories are compatible", () => {
    const ambiguousCategories = [
      makeCategory("spesa-alimentari", "Spesa Alimentari", "spesa-alimentari"),
      makeCategory("spesa-mercato", "Spesa Mercato", "spesa-mercato"),
    ];

    const first = resolvePresetToWorkspaceCategory("groceries", ambiguousCategories, "it");
    const second = resolvePresetToWorkspaceCategory("groceries", ambiguousCategories, "it");

    assert.equal(first?.id, "spesa-alimentari");
    assert.equal(second?.id, first?.id);
  });
});

describe("suggestMerchantCategory", () => {
  const categories = [
    makeCategory("sigarette-accessori", "Sigarette / Accessori", "sigarette-accessori"),
    makeCategory("spesa", "Spesa", "spesa"),
    makeCategory("abbonamenti", "Abbonamenti", "abbonamenti"),
    makeCategory("delivery", "Delivery", "delivery"),
  ];

  it("returns categoryIdSuggested when a compatible category exists", () => {
    const suggestion = suggestMerchantCategory({
      merchantName: "LIDL",
      description: "some bank text",
      categories,
      locale: "it",
    });

    assert.equal(suggestion.categoryIdSuggested, "spesa");
    assert.equal(suggestion.matchedPresetKey, "groceries");
    assert.equal(suggestion.confidence, "high");
  });

  it("returns null when the compatible category does not exist in the workspace", () => {
    const suggestion = suggestMerchantCategory({
      merchantName: "LIDL",
      categories: [makeCategory("altro", "Altro", "altro")],
      locale: "it",
    });

    assert.equal(suggestion.categoryIdSuggested, null);
    assert.equal(suggestion.matchedPresetKey, "groceries");
  });

  it("never invents a categoryIdSuggested", () => {
    const suggestion = suggestMerchantCategory({
      merchantName: "bank transfer",
      categories,
      locale: "it",
    });

    assert.equal(suggestion.categoryIdSuggested, null);
    assert.equal(suggestion.matchedPresetKey, undefined);
  });

  it("prefers merchantName over description when both match different presets", () => {
    const suggestion = suggestMerchantCategory({
      merchantName: "GLOVO",
      description: "NETFLIX",
      categories,
      locale: "it",
    });

    assert.equal(suggestion.categoryIdSuggested, "delivery");
    assert.equal(suggestion.matchedPresetKey, "delivery");
  });
});

