import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { describe, it, afterEach } from "node:test";

import {
  decryptFieldText,
  decryptJsonValue,
  decryptOptionalText,
  encryptFieldText,
  encryptJsonValue,
  encryptOptionalText,
  isEncryptedFieldValue,
  isEncryptedJsonValue,
  shouldQueryEncryptedTextFields,
} from "@/src/lib/field-encryption";

const TEST_KEY = Buffer.from("01234567890123456789012345678901").toString("base64");
const OTHER_KEY = Buffer.from("abcdefghijabcdefghijabcdefghijab").toString("base64");

function withFieldEncryption(key = TEST_KEY, keyId = "test-key") {
  process.env.APP_FIELD_ENCRYPTION_KEY = key;
  process.env.APP_FIELD_ENCRYPTION_KEY_ID = keyId;
  delete process.env.APP_FIELD_ENCRYPTION_PREVIOUS_KEYS;
}

afterEach(() => {
  delete process.env.APP_FIELD_ENCRYPTION_KEY;
  delete process.env.APP_FIELD_ENCRYPTION_KEY_ID;
  delete process.env.APP_FIELD_ENCRYPTION_PREVIOUS_KEYS;
});

describe("field encryption", () => {
  it("leaves values as plaintext when no key is configured", () => {
    assert.equal(encryptFieldText("nota privata"), "nota privata");
    assert.equal(decryptFieldText("nota privata"), "nota privata");
    assert.equal(shouldQueryEncryptedTextFields(), true);
  });

  it("encrypts and decrypts text with AES-GCM", () => {
    withFieldEncryption();

    const encrypted = encryptFieldText("nota privata");

    assert.equal(isEncryptedFieldValue(encrypted), true);
    assert.notEqual(encrypted, "nota privata");
    assert.equal(decryptFieldText(encrypted), "nota privata");
    assert.equal(shouldQueryEncryptedTextFields(), false);
  });

  it("keeps optional null and empty values out of ciphertext", () => {
    withFieldEncryption();

    assert.equal(encryptOptionalText(null), null);
    assert.equal(encryptOptionalText(""), null);
    assert.equal(decryptOptionalText(null), null);
  });

  it("decrypts payloads created with previous keys", () => {
    withFieldEncryption(TEST_KEY, "old-key");
    const encrypted = encryptFieldText("merchant riservato");

    withFieldEncryption(OTHER_KEY, "new-key");
    process.env.APP_FIELD_ENCRYPTION_PREVIOUS_KEYS = JSON.stringify({
      "old-key": TEST_KEY,
    });

    assert.equal(decryptFieldText(encrypted), "merchant riservato");
  });

  it("wraps JSON values in an encrypted envelope", () => {
    withFieldEncryption();

    const encrypted = encryptJsonValue({
      description: "Bonifico privato",
      amount: "-12,00",
    });

    assert.equal(isEncryptedJsonValue(encrypted), true);
    assert.deepEqual(decryptJsonValue(encrypted), {
      description: "Bonifico privato",
      amount: "-12,00",
    });
  });
});
