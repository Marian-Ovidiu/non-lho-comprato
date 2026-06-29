import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const FIELD_ENCRYPTION_PREFIX = "nlcenc:v1";
const ENCRYPTED_JSON_KEY = "__nlcEncryptedJson";
const KEY_BYTES = 32;
const IV_BYTES = 12;

type EncryptionKey = {
  id: string;
  value: Buffer;
};

type EncryptedJsonEnvelope = {
  [ENCRYPTED_JSON_KEY]: string;
};

export class FieldEncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FieldEncryptionError";
  }
}

function toBase64Url(value: Buffer): string {
  return value
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function fromBase64Url(value: string): Buffer {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  return Buffer.from(padded, "base64");
}

function isHexKey(value: string): boolean {
  return /^[0-9a-f]{64}$/iu.test(value);
}

function decodeKey(rawKey: string, source: string): Buffer {
  const trimmed = rawKey.trim();
  const withoutPrefix = trimmed.startsWith("base64:")
    ? trimmed.slice("base64:".length)
    : trimmed;
  const decoded = isHexKey(withoutPrefix)
    ? Buffer.from(withoutPrefix, "hex")
    : fromBase64Url(withoutPrefix);

  if (decoded.length !== KEY_BYTES) {
    throw new FieldEncryptionError(
      `${source} must decode to ${KEY_BYTES} bytes for AES-256-GCM`,
    );
  }

  return decoded;
}

function getActiveKey(): EncryptionKey | null {
  const rawKey = process.env.APP_FIELD_ENCRYPTION_KEY?.trim();

  if (!rawKey) {
    return null;
  }

  const id = process.env.APP_FIELD_ENCRYPTION_KEY_ID?.trim() || "default";

  if (id.includes(":")) {
    throw new FieldEncryptionError("APP_FIELD_ENCRYPTION_KEY_ID cannot contain ':'");
  }

  return {
    id,
    value: decodeKey(rawKey, "APP_FIELD_ENCRYPTION_KEY"),
  };
}

function getPreviousKeys(): EncryptionKey[] {
  const rawKeys = process.env.APP_FIELD_ENCRYPTION_PREVIOUS_KEYS?.trim();

  if (!rawKeys) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawKeys);
  } catch {
    throw new FieldEncryptionError(
      "APP_FIELD_ENCRYPTION_PREVIOUS_KEYS must be a JSON object",
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new FieldEncryptionError(
      "APP_FIELD_ENCRYPTION_PREVIOUS_KEYS must be a JSON object",
    );
  }

  return Object.entries(parsed).map(([id, rawKey]) => {
    if (id.includes(":")) {
      throw new FieldEncryptionError(
        "APP_FIELD_ENCRYPTION_PREVIOUS_KEYS ids cannot contain ':'",
      );
    }

    if (typeof rawKey !== "string") {
      throw new FieldEncryptionError(
        "APP_FIELD_ENCRYPTION_PREVIOUS_KEYS values must be strings",
      );
    }

    return {
      id,
      value: decodeKey(rawKey, `APP_FIELD_ENCRYPTION_PREVIOUS_KEYS.${id}`),
    };
  });
}

function getKeyForId(keyId: string): EncryptionKey {
  const activeKey = getActiveKey();

  if (activeKey && constantTimeEqual(activeKey.id, keyId)) {
    return activeKey;
  }

  const previousKey = getPreviousKeys().find((key) =>
    constantTimeEqual(key.id, keyId),
  );

  if (previousKey) {
    return previousKey;
  }

  throw new FieldEncryptionError(
    `No field encryption key configured for key id "${keyId}"`,
  );
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function getAad(keyId: string): Buffer {
  return Buffer.from(`${FIELD_ENCRYPTION_PREFIX}:${keyId}`);
}

export function isFieldEncryptionEnabled(): boolean {
  return Boolean(process.env.APP_FIELD_ENCRYPTION_KEY?.trim());
}

export function isEncryptedFieldValue(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith(`${FIELD_ENCRYPTION_PREFIX}:`)
  );
}

export function encryptFieldText(value: string): string {
  if (value.length === 0 || isEncryptedFieldValue(value)) {
    return value;
  }

  const key = getActiveKey();

  if (!key) {
    return value;
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key.value, iv);
  cipher.setAAD(getAad(key.id));

  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    FIELD_ENCRYPTION_PREFIX,
    key.id,
    toBase64Url(iv),
    toBase64Url(tag),
    toBase64Url(ciphertext),
  ].join(":");
}

export function decryptFieldText(value: string): string {
  if (!isEncryptedFieldValue(value)) {
    return value;
  }

  const [, version, keyId, ivValue, tagValue, ciphertextValue] =
    value.split(":");

  if (version !== "v1" || !keyId || !ivValue || !tagValue || !ciphertextValue) {
    throw new FieldEncryptionError("Invalid encrypted field payload");
  }

  const key = getKeyForId(keyId);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key.value,
    fromBase64Url(ivValue),
  );
  decipher.setAAD(getAad(keyId));
  decipher.setAuthTag(fromBase64Url(tagValue));

  return Buffer.concat([
    decipher.update(fromBase64Url(ciphertextValue)),
    decipher.final(),
  ]).toString("utf8");
}

export function encryptOptionalText(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  return encryptFieldText(value);
}

export function decryptOptionalText(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  return decryptFieldText(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isEncryptedJsonValue(
  value: unknown,
): value is EncryptedJsonEnvelope {
  return (
    isRecord(value) &&
    typeof value[ENCRYPTED_JSON_KEY] === "string" &&
    isEncryptedFieldValue(value[ENCRYPTED_JSON_KEY])
  );
}

export function encryptJsonValue(value: unknown): unknown {
  if (value === null || typeof value === "undefined" || isEncryptedJsonValue(value)) {
    return value ?? null;
  }

  if (!isFieldEncryptionEnabled()) {
    return value;
  }

  return {
    [ENCRYPTED_JSON_KEY]: encryptFieldText(JSON.stringify(value)),
  };
}

export function decryptJsonValue<T = unknown>(value: unknown): T | null {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  if (!isEncryptedJsonValue(value)) {
    return value as T;
  }

  return JSON.parse(decryptFieldText(value[ENCRYPTED_JSON_KEY])) as T;
}

export function shouldQueryEncryptedTextFields(): boolean {
  return !isFieldEncryptionEnabled();
}

export { FIELD_ENCRYPTION_PREFIX };
