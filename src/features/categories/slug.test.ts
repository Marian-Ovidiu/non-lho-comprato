import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generateSlugFromName } from "@/src/features/categories/slug";

describe("generateSlugFromName", () => {
  it("lowercases ASCII names", () => {
    assert.equal(generateSlugFromName("Cibo"), "cibo");
  });

  it("strips Italian diacritics", () => {
    assert.equal(generateSlugFromName("Caffè"), "caffe");
    assert.equal(generateSlugFromName("Già fatto"), "gia-fatto");
  });

  it("replaces spaces with dashes", () => {
    assert.equal(generateSlugFromName("Hello World"), "hello-world");
  });

  it("collapses multiple non-alphanumeric chars into a single dash", () => {
    assert.equal(generateSlugFromName("Sigarette / Accessori"), "sigarette-accessori");
    assert.equal(generateSlugFromName("A // B"), "a-b");
    assert.equal(generateSlugFromName("Musica & Arte"), "musica-arte");
  });

  it("trims leading and trailing whitespace and dashes", () => {
    assert.equal(generateSlugFromName("  Trim me  "), "trim-me");
    assert.equal(generateSlugFromName("--edges--"), "edges");
  });

  it("preserves numbers", () => {
    assert.equal(generateSlugFromName("123 Test"), "123-test");
    assert.equal(generateSlugFromName("Spesa 2"), "spesa-2");
  });

  it("handles parentheses and punctuation", () => {
    assert.equal(generateSlugFromName("Palestra (Fitness)"), "palestra-fitness");
    assert.equal(generateSlugFromName("Sport, hobby, svago"), "sport-hobby-svago");
  });

  it("strips é, ü, ñ, ç via NFD decomposition", () => {
    assert.equal(generateSlugFromName("España"), "espana");
    assert.equal(generateSlugFromName("Günstig"), "gunstig");
    assert.equal(generateSlugFromName("Çay"), "cay");
  });

  it("returns 'categoria' for empty string", () => {
    assert.equal(generateSlugFromName(""), "categoria");
  });

  it("returns 'categoria' for all-non-alphanumeric input", () => {
    assert.equal(generateSlugFromName("!!!"), "categoria");
    assert.equal(generateSlugFromName("/ / /"), "categoria");
  });

  it("handles a name that is already slug-shaped", () => {
    assert.equal(generateSlugFromName("spese-condominiali"), "spese-condominiali");
  });

  it("does not add a trailing dash for names ending in alphanumeric", () => {
    const slug = generateSlugFromName("Test!");
    assert.equal(slug.endsWith("-"), false);
    assert.equal(slug, "test");
  });
});
