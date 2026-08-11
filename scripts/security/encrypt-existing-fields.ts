#!/usr/bin/env tsx

import { loadEnvConfig } from "@next/env";
import type { Prisma } from "@/src/lib/generated/prisma/client";

loadEnvConfig(process.cwd());

const { prisma } = await import("@/src/lib/prisma");
const {
  decryptJsonValue,
  decryptOptionalText,
  encryptJsonValue,
  encryptOptionalText,
  isEncryptedFieldValue,
  isEncryptedJsonValue,
  isFieldEncryptionEnabled,
} = await import("@/src/lib/field-encryption");

const BATCH_SIZE = 500;
const shouldReencrypt = process.env.REENCRYPT_FIELDS === "true";

type BackfillCounters = {
  entryNotes: number;
  feedbackMessages: number;
  importedTransactions: number;
};

function shouldWriteText(value: string | null | undefined): value is string {
  return Boolean(value) && (!isEncryptedFieldValue(value) || shouldReencrypt);
}

function encryptTextForWrite(value: string): string | null {
  const plaintext = isEncryptedFieldValue(value)
    ? decryptOptionalText(value)
    : value;

  return encryptOptionalText(plaintext);
}

async function encryptEntryNotes(): Promise<number> {
  let cursor: string | undefined;
  let updated = 0;

  while (true) {
    const rows = await prisma.entry.findMany({
      where: { note: { not: null } },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, note: true },
    });

    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      if (!shouldWriteText(row.note)) {
        continue;
      }

      await prisma.entry.update({
        where: { id: row.id },
        data: { note: encryptTextForWrite(row.note) },
      });
      updated += 1;
    }

    cursor = rows.at(-1)?.id;
  }

  return updated;
}

async function encryptFeedbackMessages(): Promise<number> {
  let cursor: string | undefined;
  let updated = 0;

  while (true) {
    const rows = await prisma.feedback.findMany({
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, message: true },
    });

    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      if (!shouldWriteText(row.message)) {
        continue;
      }

      await prisma.feedback.update({
        where: { id: row.id },
        data: { message: encryptTextForWrite(row.message) ?? row.message },
      });
      updated += 1;
    }

    cursor = rows.at(-1)?.id;
  }

  return updated;
}

async function encryptImportedTransactions(): Promise<number> {
  let cursor: string | undefined;
  let updated = 0;

  while (true) {
    const rows = await prisma.importedTransaction.findMany({
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        description: true,
        merchantName: true,
        rawJson: true,
      },
    });

    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      const data: Prisma.ImportedTransactionUpdateInput = {};

      if (shouldWriteText(row.description)) {
        data.description = encryptTextForWrite(row.description) ?? "";
      }

      if (shouldWriteText(row.merchantName)) {
        data.merchantName = encryptTextForWrite(row.merchantName);
      }

      if (
        row.rawJson !== null &&
        (!isEncryptedJsonValue(row.rawJson) || shouldReencrypt)
      ) {
        const plaintextJson = isEncryptedJsonValue(row.rawJson)
          ? decryptJsonValue(row.rawJson)
          : row.rawJson;
        data.rawJson = encryptJsonValue(plaintextJson) as Prisma.InputJsonValue;
      }

      if (Object.keys(data).length === 0) {
        continue;
      }

      await prisma.importedTransaction.update({
        where: { id: row.id },
        data,
      });
      updated += 1;
    }

    cursor = rows.at(-1)?.id;
  }

  return updated;
}

async function main() {
  if (!isFieldEncryptionEnabled()) {
    throw new Error(
      "APP_FIELD_ENCRYPTION_KEY is required before encrypting existing fields.",
    );
  }

  const counters: BackfillCounters = {
    entryNotes: await encryptEntryNotes(),
    feedbackMessages: await encryptFeedbackMessages(),
    importedTransactions: await encryptImportedTransactions(),
  };

  console.log("Field encryption backfill completed:");
  console.log(`- Entry.note rows updated: ${counters.entryNotes}`);
  console.log(`- Feedback.message rows updated: ${counters.feedbackMessages}`);
  console.log(
    `- ImportedTransaction rows updated: ${counters.importedTransactions}`,
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
