"use server";

import { Prisma } from "@/src/lib/generated/prisma/client";
import { EntryVisibility } from "@/src/lib/generated/prisma/enums";
import { revalidatePath, updateTag } from "next/cache";

import { refreshSupabaseSessionForAction } from "@/src/lib/auth/action-session";
import { createEntryFromNormalizedInput } from "@/src/actions/entry-create";
import { calculateEntryMoney } from "@/src/lib/entry-domain";
import { prisma } from "@/src/lib/prisma";
import {
  assertWorkspaceMember,
  getCurrentUser,
  getCurrentWorkspace,
} from "@/src/lib/workspace-context";
import {
  createImportedTransactionFingerprint,
} from "@/src/lib/imports/import-fingerprint";
import {
  mapCsvRowToImportedTransactionDraft,
  validateCsvImportMapping,
} from "@/src/lib/imports/import-mapping";
import type {
  CsvImportColumnMapping,
  CsvImportRow,
} from "@/src/lib/imports/import-domain";
import {
  detectDelimiter,
  parseCsvText,
} from "@/src/lib/imports/import-parser";

type ImportBatchStatus =
  | "parsing"
  | "ready"
  | "partial"
  | "completed"
  | "failed";

type ImportedTransactionStatus =
  | "pending"
  | "confirmed"
  | "ignored"
  | "duplicate"
  | "error";

type ImportBatchRecord = {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  source: "bank_csv";
  originalFilename: string | null;
  mimeType: string | null;
  fileSize: number | null;
  delimiter: string | null;
  status: ImportBatchStatus;
  headerRowJson: Prisma.JsonValue | null;
  columnMappingJson: Prisma.JsonValue | null;
  rowCount: number;
  parsedCount: number;
  confirmedCount: number;
  ignoredCount: number;
  duplicateCount: number;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ImportedTransactionRecord = {
  id: string;
  workspaceId: string;
  importBatchId: string;
  source: "bank_csv";
  sourceRowIndex: number;
  externalId: string | null;
  fingerprint: string;
  date: Date | null;
  description: string;
  merchantName: string | null;
  amount: Prisma.Decimal | string | number | null;
  currency: string | null;
  status: ImportedTransactionStatus;
  categoryIdSuggested: string | null;
  categoryIdConfirmed: string | null;
  entryId: string | null;
  duplicateOfId: string | null;
  rawJson: Prisma.JsonValue | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ImportCategoryRecord = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  archivedAt: Date | null;
};

type ImportWorkspaceRecord = {
  id: string;
  currency: string | null;
};

type ImportUserRecord = {
  id: string;
};

type ImportPrismaLike = {
  importBatch: {
    create(args: Record<string, unknown>): Promise<ImportBatchRecord>;
    update(args: Record<string, unknown>): Promise<ImportBatchRecord>;
    delete(args: Record<string, unknown>): Promise<ImportBatchRecord>;
    findFirst(
      args: Record<string, unknown>,
    ): Promise<ImportBatchRecord | null>;
  };
  importedTransaction: {
    create(args: Record<string, unknown>): Promise<ImportedTransactionRecord>;
    update(args: Record<string, unknown>): Promise<ImportedTransactionRecord>;
    findMany(args: Record<string, unknown>): Promise<ImportedTransactionRecord[]>;
  };
  category: {
    findFirst(args: Record<string, unknown>): Promise<ImportCategoryRecord | null>;
  };
};

type ImportActionsDeps = {
  prisma: ImportPrismaLike;
  refreshSupabaseSessionForAction: typeof refreshSupabaseSessionForAction;
  getCurrentUser: typeof getCurrentUser;
  getCurrentWorkspace: typeof getCurrentWorkspace;
  assertWorkspaceMember: typeof assertWorkspaceMember;
  revalidatePath: (path: string) => unknown;
  updateTag: (tag: string) => unknown;
  createEntryFromNormalizedInput: typeof createEntryFromNormalizedInput;
};

export type ImportBatchActionResult = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
  batchId?: string;
  count?: number;
};

export type ImportBatchDetails = {
  batch: ImportBatchRecord & { transactions: ImportedTransactionRecord[] };
  transactions: ImportedTransactionRecord[];
};

const IMPORT_REVALIDATE_PATHS = ["/workspace/imports"] as const;
const ENTRY_INVALIDATION_PATHS = [
  "/",
  "/entries",
  "/stats",
  "/workspace/budgets",
  "/more",
  "/workspace/imports",
] as const;
const MAX_IMPORT_FILE_SIZE = 1_048_576;
const MAX_CONFIRM_BATCH_SIZE = 100;
const ALLOWED_MIME_TYPES = new Set([
  "text/csv",
  "text/plain",
  "application/csv",
  "text/comma-separated-values",
]);

function makeDefaultDeps(): ImportActionsDeps {
  return {
    prisma: prisma as unknown as ImportPrismaLike,
    refreshSupabaseSessionForAction,
    getCurrentUser,
    getCurrentWorkspace,
    assertWorkspaceMember,
    revalidatePath,
    updateTag,
    createEntryFromNormalizedInput,
  };
}

function toDecimalString(value: number): string {
  return value.toFixed(2);
}

function tryRevalidatePath(
  path: string,
  revalidate: (path: string) => unknown,
): void {
  try {
    revalidate(path);
  } catch (error) {
    console.warn(`Failed to revalidate ${path}:`, error);
  }
}

function invalidateImportPaths(
  revalidate: (path: string) => unknown,
): void {
  for (const path of IMPORT_REVALIDATE_PATHS) {
    tryRevalidatePath(path, revalidate);
  }
}

function invalidateEntryPaths(
  workspaceId: string,
  revalidate: (path: string) => unknown,
  update: (tag: string) => unknown,
): void {
  for (const path of ENTRY_INVALIDATION_PATHS) {
    tryRevalidatePath(path, revalidate);
  }

  update(`entries:${workspaceId}`);
  update(`goals:${workspaceId}`);
}

function getFormText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getFormValues(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .flatMap((value) =>
      typeof value === "string" ? value.split(",") : [],
    )
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseCsvImportMapping(formData: FormData): CsvImportColumnMapping {
  return {
    date: getFormText(formData, "date"),
    description: getFormText(formData, "description"),
    amount: getFormText(formData, "amount"),
    currency: getFormText(formData, "currency") || null,
    merchantName: getFormText(formData, "merchantName") || null,
    dateFormat:
      (getFormText(formData, "dateFormat") as CsvImportColumnMapping["dateFormat"]) ||
      "DD/MM/YYYY",
    amountConvention:
      (getFormText(formData, "amountConvention") as CsvImportColumnMapping["amountConvention"]) ||
      "negative_is_expense",
  };
}

function readCsvFile(formData: FormData): File | null {
  const file = formData.get("file");
  return file instanceof File ? file : null;
}

function isAllowedCsvFile(file: File): boolean {
  if (file.size > MAX_IMPORT_FILE_SIZE) {
    return false;
  }

  const mimeType = file.type.trim().toLowerCase();

  if (mimeType && (ALLOWED_MIME_TYPES.has(mimeType) || mimeType.startsWith("text/"))) {
    return true;
  }

  return file.name.toLowerCase().endsWith(".csv");
}

function countTransactionStatuses(transactions: ImportedTransactionRecord[]) {
  return transactions.reduce(
    (acc, transaction) => {
      acc.rowCount += 1;
      acc.parsedCount += transaction.status === "error" ? 0 : 1;
      acc.confirmed += transaction.status === "confirmed" ? 1 : 0;
      acc.ignored += transaction.status === "ignored" ? 1 : 0;
      acc.duplicate += transaction.status === "duplicate" ? 1 : 0;
      acc.pending += transaction.status === "pending" ? 1 : 0;
      acc.error += transaction.status === "error" ? 1 : 0;
      return acc;
    },
    {
      rowCount: 0,
      parsedCount: 0,
      confirmed: 0,
      ignored: 0,
      duplicate: 0,
      pending: 0,
      error: 0,
    },
  );
}

function buildRawTransactionPayload(
  batchId: string,
  workspaceId: string,
  sourceRowIndex: number,
  rawJson: CsvImportRow,
): Record<string, unknown> {
  return {
    workspaceId,
    importBatchId: batchId,
    source: "bank_csv",
    sourceRowIndex,
    externalId: null,
    fingerprint: `raw:${batchId}:${sourceRowIndex}`,
    date: null,
    description: "",
    merchantName: null,
    amount: null,
    currency: null,
    status: "pending",
    categoryIdSuggested: null,
    categoryIdConfirmed: null,
    entryId: null,
    duplicateOfId: null,
    rawJson,
    errorMessage: null,
  };
}

function normalizeTransactionAmount(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.abs(value) : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
  }

  if (value && typeof value === "object" && "toString" in value) {
    const parsed = Number(String(value).replace(",", "."));
    return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
  }

  return 0;
}

function buildEntryMoney(amount: unknown) {
  const normalized = normalizeTransactionAmount(amount);
  return calculateEntryMoney({
    mode: "spent",
    savingContext: "none",
    amountSpent: normalized,
  });
}

function mapTransactionUpdatePayload(
  draft: ReturnType<typeof mapCsvRowToImportedTransactionDraft>,
  fingerprint: string,
  duplicateOfId: string | null,
): Record<string, unknown> {
  return {
    date: draft.date,
    description: draft.description,
    merchantName: draft.merchantName,
    amount: draft.amount === null ? null : toDecimalString(draft.amount),
    currency: draft.currency,
    status:
      draft.status === "error"
        ? "error"
        : duplicateOfId
          ? "duplicate"
          : draft.status,
    fingerprint,
    duplicateOfId,
    errorMessage: draft.errorMessage ?? null,
    rawJson: draft.raw,
  };
}

function resolveCategoryIdForConfirmation(
  transaction: ImportedTransactionRecord,
  defaultCategoryId: string,
): string | null {
  return transaction.categoryIdConfirmed || defaultCategoryId || null;
}

async function loadCurrentWorkspace(
  deps: ImportActionsDeps,
): Promise<{ user: ImportUserRecord; workspace: ImportWorkspaceRecord }> {
  const [user, workspace] = await Promise.all([
    deps.getCurrentUser(),
    deps.getCurrentWorkspace(),
  ]);

  await deps.assertWorkspaceMember(user.id, workspace.id);
  return { user, workspace };
}

async function ensureBatchBelongsToWorkspace(
  deps: ImportActionsDeps,
  batchId: string,
  workspaceId: string,
): Promise<ImportBatchRecord | null> {
  return deps.prisma.importBatch.findFirst({
    where: {
      id: batchId,
      workspaceId,
    },
  });
}

async function ensureCategoryBelongsToWorkspace(
  deps: ImportActionsDeps,
  categoryId: string,
  workspaceId: string,
): Promise<ImportCategoryRecord | null> {
  return deps.prisma.category.findFirst({
    where: {
      id: categoryId,
      workspaceId,
    },
  });
}

async function syncImportBatchCounters(
  deps: ImportActionsDeps,
  batchId: string,
): Promise<ImportBatchRecord> {
  const transactions = await deps.prisma.importedTransaction.findMany({
    where: { importBatchId: batchId },
    orderBy: [{ sourceRowIndex: "asc" }],
  });
  const counts = countTransactionStatuses(transactions);
  const status =
    counts.confirmed > 0
      ? counts.pending > 0
        ? "partial"
        : "completed"
      : "ready";

  return deps.prisma.importBatch.update({
    where: { id: batchId },
    data: {
      rowCount: counts.rowCount,
      parsedCount: counts.parsedCount,
      confirmedCount: counts.confirmed,
      ignoredCount: counts.ignored,
      duplicateCount: counts.duplicate,
      status,
    },
  });
}

async function updateTransactionsFromMapping(params: {
  deps: ImportActionsDeps;
  batch: ImportBatchRecord;
  transactions: ImportedTransactionRecord[];
  mapping: CsvImportColumnMapping;
  defaultCurrency: string;
}): Promise<void> {
  const { deps, batch, transactions, mapping, defaultCurrency } = params;
  const existingTransactions = await deps.prisma.importedTransaction.findMany({
    where: {
      workspaceId: batch.workspaceId,
      source: "bank_csv",
    },
    orderBy: [{ createdAt: "asc" }],
  });

  const seenFingerprints = new Map<string, string>();

  for (const transaction of transactions) {
    if (transaction.status === "confirmed" && transaction.fingerprint) {
      seenFingerprints.set(transaction.fingerprint, transaction.id);
    }
  }

  for (const transaction of existingTransactions) {
    if (transaction.importBatchId === batch.id) {
      continue;
    }

    if (
      transaction.status === "pending" ||
      transaction.status === "confirmed"
    ) {
      seenFingerprints.set(transaction.fingerprint, transaction.id);
    }
  }

  for (const transaction of transactions) {
    if (transaction.status === "confirmed") {
      continue;
    }

    const rawRow = (transaction.rawJson ?? {}) as CsvImportRow;
    const draft = mapCsvRowToImportedTransactionDraft(
      {
        sourceRowIndex: transaction.sourceRowIndex,
        values: rawRow,
      },
      mapping,
      {
        sourceRowIndex: transaction.sourceRowIndex,
        defaultCurrency,
      },
    );

    const fingerprint =
      draft.status === "error"
        ? `error:${batch.id}:${transaction.sourceRowIndex}`
        : createImportedTransactionFingerprint({
            date: draft.date ?? new Date(0),
            description: draft.description,
            amount: draft.amount ?? 0,
            currency: draft.currency,
          });

    const duplicateOfId = fingerprint ? seenFingerprints.get(fingerprint) ?? null : null;
    const payload = mapTransactionUpdatePayload(
      draft,
      fingerprint,
      duplicateOfId,
    );

    if (duplicateOfId) {
      payload.duplicateOfId = duplicateOfId;
      payload.status = "duplicate";
    }

    await deps.prisma.importedTransaction.update({
      where: { id: transaction.id },
      data: payload,
    });

    if (draft.status !== "error") {
      seenFingerprints.set(fingerprint, transaction.id);
    }
  }
}

async function confirmImportedTransactions(
  deps: ImportActionsDeps,
  batch: ImportBatchRecord,
  workspace: ImportWorkspaceRecord,
  user: ImportUserRecord,
  selectedIds: string[],
  defaultCategoryId: string,
): Promise<ImportBatchActionResult> {
  const transactions = await deps.prisma.importedTransaction.findMany({
    where: { importBatchId: batch.id },
    orderBy: [{ sourceRowIndex: "asc" }],
  });
  const transactionsById = new Map(
    transactions.map((transaction) => [transaction.id, transaction]),
  );

  const errors: Record<string, string> = {};
  const confirmableTransactions: ImportedTransactionRecord[] = [];

  for (const transactionId of selectedIds) {
    const transaction = transactionsById.get(transactionId);

    if (!transaction) {
      errors[transactionId] = "Transazione non trovata.";
      continue;
    }

    if (transaction.status !== "pending") {
      errors[transactionId] = "Puoi confermare solo righe in attesa.";
      continue;
    }

    if (!transaction.date || transaction.amount === null) {
      errors[transactionId] = "La riga non ha dati sufficienti per essere confermata.";
      continue;
    }

    const amount = normalizeTransactionAmount(transaction.amount);
    if (amount <= 0) {
      errors[transactionId] = "L'importo deve essere maggiore di zero.";
      continue;
    }

    const categoryId = resolveCategoryIdForConfirmation(transaction, defaultCategoryId);
    if (!categoryId) {
      errors[transactionId] = "Seleziona una categoria per confermare la riga.";
      continue;
    }

    const category = await ensureCategoryBelongsToWorkspace(
      deps,
      categoryId,
      workspace.id,
    );

    if (!category) {
      errors[transactionId] = "La categoria selezionata non appartiene al workspace.";
      continue;
    }

    confirmableTransactions.push({
      ...transaction,
      categoryIdConfirmed: category.id,
    });
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: "Controlla le righe selezionate.",
      errors,
    };
  }

  const createdEntryIds: string[] = [];
  const noOpDeps = {
    ...deps,
    revalidatePath: () => undefined,
    updateTag: () => undefined,
  };

  for (const transaction of confirmableTransactions) {
    const categoryId = transaction.categoryIdConfirmed || defaultCategoryId;
    const category = await ensureCategoryBelongsToWorkspace(
      deps,
      categoryId,
      workspace.id,
    );

    if (!category) {
      return {
        success: false,
        message: "Categoria non valida durante la conferma.",
      };
    }

    const transactionDate = transaction.date;
    if (!transactionDate) {
      return {
        success: false,
        message: "La riga non ha una data valida durante la conferma.",
      };
    }

    const createResult = await deps.createEntryFromNormalizedInput(
      {
        workspaceId: workspace.id,
        currentUserId: user.id,
        title:
          transaction.merchantName?.trim() ||
          transaction.description.trim(),
        categoryId: category.id,
        date: transactionDate,
        note: transaction.description.trim() || null,
        money: buildEntryMoney(transaction.amount),
        paymentMode: "single_payer",
        paidByUserId: user.id,
        beneficiaryUserIds: [user.id],
        source: "imported",
        visibility: EntryVisibility.workspace,
        importedTransactionId: transaction.id,
      },
      noOpDeps,
    );

    if (!createResult.success || !createResult.entryId) {
      return {
        success: false,
        message: createResult.message,
      };
    }

    createdEntryIds.push(createResult.entryId);

    await deps.prisma.importedTransaction.update({
      where: { id: transaction.id },
      data: {
        status: "confirmed",
        entryId: createResult.entryId,
        categoryIdConfirmed: category.id,
      },
    });
  }

  const updatedBatch = await syncImportBatchCounters(deps, batch.id);
  invalidateEntryPaths(workspace.id, deps.revalidatePath, deps.updateTag);

  return {
    success: true,
    message: "Righe confermate con successo.",
    batchId: updatedBatch.id,
    count: createdEntryIds.length,
  };
}

function toSelectedIds(formData: FormData): string[] {
  return Array.from(
    new Set([
      ...getFormValues(formData, "transactionIds"),
      ...getFormValues(formData, "selectedTransactionIds"),
    ]),
  );
}

function buildImportActions(depsOverrides: Partial<ImportActionsDeps> = {}) {
  const deps: ImportActionsDeps = {
    ...makeDefaultDeps(),
    ...depsOverrides,
  };

  return {
    async uploadImportBatchAction(
      formData: FormData,
    ): Promise<ImportBatchActionResult> {
      await deps.refreshSupabaseSessionForAction();

      const file = readCsvFile(formData);

      if (!file) {
        return {
          success: false,
          message: "Seleziona un file CSV valido.",
        };
      }

      if (!isAllowedCsvFile(file)) {
        return {
          success: false,
          message: "Puoi caricare solo file CSV o di testo fino a 1 MB.",
        };
      }

      const { user, workspace } = await loadCurrentWorkspace(deps);
      const batch = await deps.prisma.importBatch.create({
        data: {
          workspaceId: workspace.id,
          createdByUserId: user.id,
          source: "bank_csv",
          originalFilename: file.name || null,
          mimeType: file.type || null,
          fileSize: file.size,
          delimiter: null,
          status: "parsing",
          headerRowJson: null,
          columnMappingJson: null,
          rowCount: 0,
          parsedCount: 0,
          confirmedCount: 0,
          ignoredCount: 0,
          duplicateCount: 0,
          errorMessage: null,
        },
      });

      try {
        const csvText = await file.text();
        const delimiter = detectDelimiter(csvText);
        const parsed = parseCsvText(csvText, {
          delimiter,
          maxRows: 1000,
        });

        if (parsed.headers.length === 0 || parsed.headers.every((header) => header.trim() === "")) {
          throw new Error("Il CSV non contiene intestazioni valide.");
        }

        await Promise.all(
          parsed.rows.map((row) =>
            deps.prisma.importedTransaction.create({
              data: buildRawTransactionPayload(
                batch.id,
                workspace.id,
                row.sourceRowIndex,
                row.values,
              ),
            }),
          ),
        );

        const updatedBatch = await deps.prisma.importBatch.update({
          where: { id: batch.id },
          data: {
            delimiter,
            headerRowJson: parsed.headers,
            rowCount: parsed.rowCount,
            parsedCount: parsed.rowCount,
            status: "ready",
          },
        });

        invalidateImportPaths(deps.revalidatePath);

        return {
          success: true,
          message: "Import CSV caricato con successo.",
          batchId: updatedBatch.id,
          count: parsed.rowCount,
        };
      } catch (error) {
        await deps.prisma.importBatch.update({
          where: { id: batch.id },
          data: {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        });

        return {
          success: false,
          message: "Non riesco a leggere il CSV. Controlla il file e riprova.",
        };
      }
    },

    async saveImportMappingAction(
      formData: FormData,
    ): Promise<ImportBatchActionResult> {
      await deps.refreshSupabaseSessionForAction();

      const batchId = getFormText(formData, "batchId");
      const mapping = parseCsvImportMapping(formData);

      if (!batchId) {
        return {
          success: false,
          message: "Batch import non valido.",
        };
      }

      const { workspace } = await loadCurrentWorkspace(deps);
      const batch = await ensureBatchBelongsToWorkspace(deps, batchId, workspace.id);

      if (!batch) {
        return {
          success: false,
          message: "Batch import non trovato.",
        };
      }

      const headers = Array.isArray(batch.headerRowJson) ? batch.headerRowJson : [];
      const mappingValidation = validateCsvImportMapping(headers as string[], mapping);

      if (!mappingValidation.ok) {
        await deps.prisma.importBatch.update({
          where: { id: batch.id },
          data: {
            status: "failed",
            errorMessage: Object.values(mappingValidation.errors).join(" "),
          },
        });

        return {
          success: false,
          message: "Il mapping non è valido.",
          errors: mappingValidation.errors,
        };
      }

      const transactions = await deps.prisma.importedTransaction.findMany({
        where: { importBatchId: batch.id },
        orderBy: [{ sourceRowIndex: "asc" }],
      });

      if (transactions.length === 0) {
        await deps.prisma.importBatch.update({
          where: { id: batch.id },
          data: {
            status: "failed",
            errorMessage: "Nessuna riga importata.",
          },
        });

        return {
          success: false,
          message: "Nessuna riga importata da mappare.",
        };
      }

      await deps.prisma.importBatch.update({
        where: { id: batch.id },
        data: {
          columnMappingJson: mapping,
        },
      });

      await updateTransactionsFromMapping({
        deps,
        batch,
        transactions,
        mapping,
        defaultCurrency: workspace.currency || "EUR",
      });

      const updatedBatch = await syncImportBatchCounters(deps, batch.id);
      invalidateImportPaths(deps.revalidatePath);

      return {
        success: true,
        message: "Mapping import salvato.",
        batchId: updatedBatch.id,
        count: updatedBatch.parsedCount,
      };
    },

    async getImportBatchAction(
      batchId: string,
    ): Promise<ImportBatchDetails | null> {
      await deps.refreshSupabaseSessionForAction();

      const { workspace } = await loadCurrentWorkspace(deps);
      const batch = await ensureBatchBelongsToWorkspace(
        deps,
        batchId.trim(),
        workspace.id,
      );

      if (!batch) {
        return null;
      }

      const transactions = await deps.prisma.importedTransaction.findMany({
        where: { importBatchId: batch.id },
        orderBy: [{ sourceRowIndex: "asc" }],
      });

      return {
        batch: {
          ...batch,
          transactions,
        },
        transactions,
      };
    },

    async confirmImportedTransactionsAction(
      formData: FormData,
    ): Promise<ImportBatchActionResult> {
      await deps.refreshSupabaseSessionForAction();

      const batchId = getFormText(formData, "batchId");
      const selectedIds = toSelectedIds(formData);
      const defaultCategoryId = getFormText(formData, "categoryId");

      if (!batchId) {
        return {
          success: false,
          message: "Batch import non valido.",
        };
      }

      if (selectedIds.length === 0) {
        return {
          success: false,
          message: "Seleziona almeno una transazione da confermare.",
        };
      }

      if (selectedIds.length > MAX_CONFIRM_BATCH_SIZE) {
        return {
          success: false,
          message: `Puoi confermare al massimo ${MAX_CONFIRM_BATCH_SIZE} righe per volta.`,
        };
      }

      const { user, workspace } = await loadCurrentWorkspace(deps);
      const batch = await ensureBatchBelongsToWorkspace(deps, batchId, workspace.id);

      if (!batch) {
        return {
          success: false,
          message: "Batch import non trovato.",
        };
      }

      return confirmImportedTransactions(
        deps,
        batch,
        workspace,
        user,
        selectedIds,
        defaultCategoryId,
      );
    },

    async ignoreImportedTransactionsAction(
      formData: FormData,
    ): Promise<ImportBatchActionResult> {
      await deps.refreshSupabaseSessionForAction();

      const batchId = getFormText(formData, "batchId");
      const selectedIds = toSelectedIds(formData);

      if (!batchId) {
        return {
          success: false,
          message: "Batch import non valido.",
        };
      }

      if (selectedIds.length === 0) {
        return {
          success: false,
          message: "Seleziona almeno una transazione da ignorare.",
        };
      }

      if (selectedIds.length > MAX_CONFIRM_BATCH_SIZE) {
        return {
          success: false,
          message: `Puoi gestire al massimo ${MAX_CONFIRM_BATCH_SIZE} righe per volta.`,
        };
      }

      const { workspace } = await loadCurrentWorkspace(deps);
      const batch = await ensureBatchBelongsToWorkspace(deps, batchId, workspace.id);

      if (!batch) {
        return {
          success: false,
          message: "Batch import non trovato.",
        };
      }

      const transactions = await deps.prisma.importedTransaction.findMany({
        where: { importBatchId: batch.id },
        orderBy: [{ sourceRowIndex: "asc" }],
      });
      const transactionsById = new Map(
        transactions.map((transaction) => [transaction.id, transaction]),
      );

      const errors: Record<string, string> = {};
      const idsToIgnore: string[] = [];

      for (const transactionId of selectedIds) {
        const transaction = transactionsById.get(transactionId);

        if (!transaction) {
          errors[transactionId] = "Transazione non trovata.";
          continue;
        }

        if (
          transaction.status !== "pending" &&
          transaction.status !== "duplicate" &&
          transaction.status !== "error"
        ) {
          errors[transactionId] = "Puoi ignorare solo righe pending, duplicate o error.";
          continue;
        }

        idsToIgnore.push(transactionId);
      }

      if (Object.keys(errors).length > 0) {
        return {
          success: false,
          message: "Controlla le righe selezionate.",
          errors,
        };
      }

      await Promise.all(
        idsToIgnore.map((id) =>
          deps.prisma.importedTransaction.update({
            where: { id },
            data: { status: "ignored" },
          }),
        ),
      );

      const updatedBatch = await syncImportBatchCounters(deps, batch.id);
      invalidateImportPaths(deps.revalidatePath);

      return {
        success: true,
        message: "Righe ignorate.",
        batchId: updatedBatch.id,
        count: idsToIgnore.length,
      };
    },

    async deleteImportBatchAction(
      formData: FormData,
    ): Promise<ImportBatchActionResult> {
      await deps.refreshSupabaseSessionForAction();

      const batchId = getFormText(formData, "batchId");

      if (!batchId) {
        return {
          success: false,
          message: "Batch import non valido.",
        };
      }

      const { workspace } = await loadCurrentWorkspace(deps);
      const batch = await ensureBatchBelongsToWorkspace(deps, batchId, workspace.id);

      if (!batch) {
        return {
          success: false,
          message: "Batch import non trovato.",
        };
      }

      const transactions = await deps.prisma.importedTransaction.findMany({
        where: { importBatchId: batch.id },
      });
      const counts = countTransactionStatuses(transactions);

      if (counts.confirmed > 0) {
        return {
          success: false,
          message: "Non puoi eliminare un batch che ha già Entry confermate.",
        };
      }

      await deps.prisma.importBatch.delete({
        where: { id: batch.id },
      });

      invalidateImportPaths(deps.revalidatePath);

      return {
        success: true,
        message: "Batch import eliminato.",
        batchId: batch.id,
        count: counts.rowCount,
      };
    },
  };
}

const defaultImportActionsPromise = Promise.resolve(buildImportActions());

export async function createImportActions(
  depsOverrides: Partial<ImportActionsDeps> = {},
) {
  return buildImportActions(depsOverrides);
}

export async function uploadImportBatchAction(
  formData: FormData,
): Promise<ImportBatchActionResult> {
  return (await defaultImportActionsPromise).uploadImportBatchAction(formData);
}

export async function saveImportMappingAction(
  formData: FormData,
): Promise<ImportBatchActionResult> {
  return (await defaultImportActionsPromise).saveImportMappingAction(formData);
}

export async function getImportBatchAction(
  batchId: string,
): Promise<ImportBatchDetails | null> {
  return (await defaultImportActionsPromise).getImportBatchAction(batchId);
}

export async function confirmImportedTransactionsAction(
  formData: FormData,
): Promise<ImportBatchActionResult> {
  return (await defaultImportActionsPromise).confirmImportedTransactionsAction(formData);
}

export async function ignoreImportedTransactionsAction(
  formData: FormData,
): Promise<ImportBatchActionResult> {
  return (await defaultImportActionsPromise).ignoreImportedTransactionsAction(formData);
}

export async function deleteImportBatchAction(
  formData: FormData,
): Promise<ImportBatchActionResult> {
  return (await defaultImportActionsPromise).deleteImportBatchAction(formData);
}
