import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { it as itDict } from "@/src/lib/i18n/it";

process.env.DATABASE_URL ??=
  "postgresql://budget_test:budget_test@127.0.0.1:5432/budget_test";
process.env.DIRECT_URL ??= process.env.DATABASE_URL;

type SeedBatch = {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  source: "bank_csv";
  originalFilename: string | null;
  mimeType: string | null;
  fileSize: number | null;
  delimiter: string | null;
  status: "parsing" | "ready" | "partial" | "completed" | "failed";
  headerRowJson: string[] | null;
  columnMappingJson: unknown;
  rowCount: number;
  parsedCount: number;
  confirmedCount: number;
  ignoredCount: number;
  duplicateCount: number;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type SeedTransaction = {
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
  amount: string | number | null;
  currency: string | null;
  status: "pending" | "confirmed" | "ignored" | "duplicate" | "error";
  categoryIdSuggested: string | null;
  categoryIdConfirmed: string | null;
  entryId: string | null;
  duplicateOfId: string | null;
  rawJson: Record<string, string> | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type SeedCategory = {
  id: string;
  workspaceId: string;
  isDefault: boolean;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  archivedAt: Date | null;
};

type CreatedEntryInput = {
  source: string;
  importedTransactionId?: string | null;
  [key: string]: unknown;
};

function makeCsvFile(text: string, name = "bank.csv", type = "text/csv") {
  return new File([text], name, { type });
}

async function createImportWorld() {
  const { createImportActions } = await import("@/src/actions/imports");

  const currentUser = {
    id: "user-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    email: "user@example.com",
    name: "User 1",
    image: null,
  };

  const workspaces: Record<
    string,
    { id: string; currency: string; timezone: string; language: string }
  > = {
    "workspace-1": {
      id: "workspace-1",
      currency: "EUR",
      timezone: "Europe/Rome",
      language: "it",
    },
    "workspace-foreign": {
      id: "workspace-foreign",
      currency: "EUR",
      timezone: "Europe/Rome",
      language: "en",
    },
  };

  const categories: SeedCategory[] = [
    {
      id: "category-1",
      workspaceId: "workspace-1",
      isDefault: false,
      name: "Spesa",
      slug: "spesa",
      color: null,
      icon: null,
      archivedAt: null,
    },
    {
      id: "category-cigarettes",
      workspaceId: "workspace-1",
      isDefault: false,
      name: "Sigarette / Accessori",
      slug: "sigarette-accessori",
      color: null,
      icon: null,
      archivedAt: null,
    },
    {
      id: "category-subscriptions",
      workspaceId: "workspace-1",
      isDefault: false,
      name: "Abbonamenti",
      slug: "abbonamenti",
      color: null,
      icon: null,
      archivedAt: null,
    },
    {
      id: "category-delivery",
      workspaceId: "workspace-1",
      isDefault: false,
      name: "Delivery",
      slug: "delivery",
      color: null,
      icon: null,
      archivedAt: null,
    },
    {
      id: "category-archived",
      workspaceId: "workspace-1",
      isDefault: false,
      name: "Tabacco",
      slug: "tabacco",
      color: null,
      icon: null,
      archivedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    {
      id: "category-foreign",
      workspaceId: "workspace-foreign",
      isDefault: false,
      name: "Altro",
      slug: "altro",
      color: null,
      icon: null,
      archivedAt: null,
    },
  ];

  const batches: SeedBatch[] = [];
  const transactions: SeedTransaction[] = [];
  const createdEntries: CreatedEntryInput[] = [];
  const invalidations = {
    paths: [] as string[],
    tags: [] as string[],
  };

  let currentWorkspaceId = "workspace-1";
  let batchCounter = 0;
  let transactionCounter = 0;
  let entryCounter = 0;

  function matchesBatch(batch: SeedBatch, where: Record<string, unknown>) {
    if (where.id && batch.id !== where.id) {
      return false;
    }

    if (where.workspaceId && batch.workspaceId !== where.workspaceId) {
      return false;
    }

    return true;
  }

  function matchesTransaction(
    transaction: SeedTransaction,
    where: Record<string, unknown>,
  ) {
    if (where.id && transaction.id !== where.id) {
      return false;
    }

    if (where.importBatchId && transaction.importBatchId !== where.importBatchId) {
      return false;
    }

    if (where.workspaceId && transaction.workspaceId !== where.workspaceId) {
      return false;
    }

    if (where.source && transaction.source !== where.source) {
      return false;
    }

    if (where.status && transaction.status !== where.status) {
      return false;
    }

    return true;
  }

  const prisma = {
    importBatch: {
      async create(args: Record<string, unknown>) {
        const data = args.data as Record<string, unknown>;
        const batch: SeedBatch = {
          id: `batch-${++batchCounter}`,
          workspaceId: String(data.workspaceId),
          createdByUserId: String(data.createdByUserId),
          source: data.source as "bank_csv",
          originalFilename: (data.originalFilename as string | null | undefined) ?? null,
          mimeType: (data.mimeType as string | null | undefined) ?? null,
          fileSize: (data.fileSize as number | null | undefined) ?? null,
          delimiter: (data.delimiter as string | null | undefined) ?? null,
          status: data.status as SeedBatch["status"],
          headerRowJson: (data.headerRowJson as string[] | null | undefined) ?? null,
          columnMappingJson: (data.columnMappingJson as unknown) ?? null,
          rowCount: Number(data.rowCount ?? 0),
          parsedCount: Number(data.parsedCount ?? 0),
          confirmedCount: Number(data.confirmedCount ?? 0),
          ignoredCount: Number(data.ignoredCount ?? 0),
          duplicateCount: Number(data.duplicateCount ?? 0),
          errorMessage: (data.errorMessage as string | null | undefined) ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        batches.push(batch);
        return { ...batch };
      },
      async update(args: Record<string, unknown>) {
        const where = args.where as { id: string };
        const data = args.data as Record<string, unknown>;
        const batch = batches.find((item) => item.id === where.id);
        assert.ok(batch, "batch not found");

        Object.assign(batch, {
          delimiter: (data.delimiter as string | null | undefined) ?? batch.delimiter,
          headerRowJson:
            (data.headerRowJson as string[] | null | undefined) ?? batch.headerRowJson,
          columnMappingJson:
            (data.columnMappingJson as unknown) ?? batch.columnMappingJson,
          rowCount: (data.rowCount as number | undefined) ?? batch.rowCount,
          parsedCount: (data.parsedCount as number | undefined) ?? batch.parsedCount,
          confirmedCount: (data.confirmedCount as number | undefined) ?? batch.confirmedCount,
          ignoredCount: (data.ignoredCount as number | undefined) ?? batch.ignoredCount,
          duplicateCount: (data.duplicateCount as number | undefined) ?? batch.duplicateCount,
          status: (data.status as SeedBatch["status"] | undefined) ?? batch.status,
          errorMessage: (data.errorMessage as string | null | undefined) ?? batch.errorMessage,
          updatedAt: new Date(),
        });

        return { ...batch };
      },
      async delete(args: Record<string, unknown>) {
        const where = args.where as { id: string };
        const index = batches.findIndex((item) => item.id === where.id);
        assert.ok(index >= 0, "batch not found");
        const [removed] = batches.splice(index, 1);
        for (let i = transactions.length - 1; i >= 0; i -= 1) {
          if (transactions[i]?.importBatchId === removed.id) {
            transactions.splice(i, 1);
          }
        }
        return { ...removed };
      },
      async findFirst(args: Record<string, unknown>) {
        const where = (args.where as Record<string, unknown>) ?? {};
        return (
          batches.find((batch) => matchesBatch(batch, where)) ?? null
        );
      },
    },
    importedTransaction: {
      async create(args: Record<string, unknown>) {
        const data = args.data as Record<string, unknown>;
        const transaction: SeedTransaction = {
          id: `transaction-${++transactionCounter}`,
          workspaceId: String(data.workspaceId),
          importBatchId: String(data.importBatchId),
          source: data.source as "bank_csv",
          sourceRowIndex: Number(data.sourceRowIndex),
          externalId: (data.externalId as string | null | undefined) ?? null,
          fingerprint: String(data.fingerprint),
          date: (data.date as Date | null | undefined) ?? null,
          description: String(data.description ?? ""),
          merchantName: (data.merchantName as string | null | undefined) ?? null,
          amount: (data.amount as string | number | null | undefined) ?? null,
          currency: (data.currency as string | null | undefined) ?? null,
          status: data.status as SeedTransaction["status"],
          categoryIdSuggested:
            (data.categoryIdSuggested as string | null | undefined) ?? null,
          categoryIdConfirmed:
            (data.categoryIdConfirmed as string | null | undefined) ?? null,
          entryId: (data.entryId as string | null | undefined) ?? null,
          duplicateOfId:
            (data.duplicateOfId as string | null | undefined) ?? null,
          rawJson: (data.rawJson as Record<string, string> | null | undefined) ?? null,
          errorMessage: (data.errorMessage as string | null | undefined) ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        transactions.push(transaction);
        return { ...transaction };
      },
      async update(args: Record<string, unknown>) {
        const where = args.where as { id: string };
        const data = args.data as Record<string, unknown>;
        const transaction = transactions.find((item) => item.id === where.id);
        assert.ok(transaction, "transaction not found");

        Object.assign(transaction, {
          date: (data.date as Date | null | undefined) ?? transaction.date,
          description: (data.description as string | undefined) ?? transaction.description,
          merchantName:
            (data.merchantName as string | null | undefined) ?? transaction.merchantName,
          amount: (data.amount as string | number | null | undefined) ?? transaction.amount,
          currency: (data.currency as string | null | undefined) ?? transaction.currency,
          status: (data.status as SeedTransaction["status"] | undefined) ?? transaction.status,
          categoryIdSuggested:
            (data.categoryIdSuggested as string | null | undefined) ??
            transaction.categoryIdSuggested,
          categoryIdConfirmed:
            (data.categoryIdConfirmed as string | null | undefined) ??
            transaction.categoryIdConfirmed,
          entryId: (data.entryId as string | null | undefined) ?? transaction.entryId,
          duplicateOfId:
            (data.duplicateOfId as string | null | undefined) ?? transaction.duplicateOfId,
          rawJson: (data.rawJson as Record<string, string> | null | undefined) ??
            transaction.rawJson,
          errorMessage:
            (data.errorMessage as string | null | undefined) ?? transaction.errorMessage,
          fingerprint: (data.fingerprint as string | undefined) ?? transaction.fingerprint,
          updatedAt: new Date(),
        });

        return { ...transaction };
      },
      async findMany(args: Record<string, unknown>) {
        const where = (args.where as Record<string, unknown>) ?? {};
        const results = transactions
          .filter((transaction) => matchesTransaction(transaction, where))
          .sort(
            (left, right) =>
              left.sourceRowIndex - right.sourceRowIndex ||
              left.createdAt.getTime() - right.createdAt.getTime(),
          );
        return results.map((transaction) => ({ ...transaction }));
      },
    },
    category: {
      async findFirst(args: Record<string, unknown>) {
        const where = (args.where as Record<string, unknown>) ?? {};
        return (
          categories.find((category) => {
            if (where.id && category.id !== where.id) {
              return false;
            }
            if (where.workspaceId && category.workspaceId !== where.workspaceId) {
              return false;
            }
            return true;
          }) ?? null
        );
      },
      async findMany(args: Record<string, unknown>) {
        const where = (args.where as Record<string, unknown>) ?? {};
        return categories
          .filter((category) => {
            if (where.workspaceId && category.workspaceId !== where.workspaceId) {
              return false;
            }
            if (where.archivedAt === null && category.archivedAt !== null) {
              return false;
            }
            return true;
          })
          .map((category) => ({ ...category }));
      },
    },
  };

  const actions = await createImportActions({
    prisma,
    refreshSupabaseSessionForAction: async () => undefined,
    getTranslations: async () => itDict,
    getCurrentUser: async () => currentUser,
    getCurrentWorkspace: async () => workspaces[currentWorkspaceId]!,
    assertWorkspaceMember: async (userId: string, workspaceId: string) => {
      assert.equal(userId, currentUser.id);
      assert.equal(workspaceId, currentWorkspaceId);
    },
    revalidatePath: async (path: string) => {
      invalidations.paths.push(path);
    },
    updateTag: async (tag: string) => {
      invalidations.tags.push(tag);
    },
    createEntryFromNormalizedInput: async (input: CreatedEntryInput) => {
      createdEntries.push(input);
      return {
        success: true,
        message: "ok",
        entryId: `entry-${++entryCounter}`,
      };
    },
  } as unknown as Parameters<typeof createImportActions>[0]);

  return {
    actions,
    state: {
      currentWorkspaceId,
      setCurrentWorkspaceId(value: string) {
        currentWorkspaceId = value;
      },
      workspace: workspaces["workspace-1"],
      foreignWorkspace: workspaces["workspace-foreign"],
      categories,
      batches,
      transactions,
      createdEntries,
      invalidations,
    },
  };
}

function csv(text: string) {
  return text
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
}

describe("import actions", () => {
  it("upload batch valido", async () => {
    const { actions, state } = await createImportWorld();

    const formData = new FormData();
    formData.append(
      "file",
      makeCsvFile(csv(`
        Date,Description,Amount,Currency
        01/06/2026,Bar,-12.34,EUR
      `)),
    );

    const result = await actions.uploadImportBatchAction(formData);

    assert.equal(result.success, true);
    assert.equal(result.batchId, "batch-1");
    assert.equal(state.batches.length, 1);
    assert.equal(state.transactions.length, 1);
    assert.equal(state.batches[0]?.status, "ready");
  });

  it("upload file non CSV bloccato", async () => {
    const { actions, state } = await createImportWorld();

    const formData = new FormData();
    formData.append("file", makeCsvFile("hello", "bank.pdf", "application/pdf"));

    const result = await actions.uploadImportBatchAction(formData);

    assert.equal(result.success, false);
    assert.equal(state.batches.length, 0);
  });

  it("upload file spreadsheet-like MIME without CSV name is bloccato", async () => {
    const { actions, state } = await createImportWorld();

    const formData = new FormData();
    formData.append("file", makeCsvFile("hello", "bank.xls", "application/vnd.ms-excel"));

    const result = await actions.uploadImportBatchAction(formData);

    assert.equal(result.success, false);
    assert.equal(state.batches.length, 0);
  });

  it("upload >1MB bloccato", async () => {
    const { actions, state } = await createImportWorld();

    const formData = new FormData();
    formData.append("file", makeCsvFile("a".repeat(1_048_577)));

    const result = await actions.uploadImportBatchAction(formData);

    assert.equal(result.success, false);
    assert.equal(state.batches.length, 0);
  });

  it("mapping valido crea transactions pending", async () => {
    const { actions, state } = await createImportWorld();
    const uploadData = new FormData();
    uploadData.append(
      "file",
      makeCsvFile(csv(`
        Data,Descrizione,Importo,Valuta
        01/06/2026,Caffè,-2,EUR
        02/06/2026,Pranzo,-12.50,EUR
      `)),
    );

    const uploadResult = await actions.uploadImportBatchAction(uploadData);
    assert.equal(uploadResult.success, true);

    const mappingData = new FormData();
    mappingData.append("batchId", String(uploadResult.batchId));
    mappingData.append("date", "Data");
    mappingData.append("description", "Descrizione");
    mappingData.append("amount", "Importo");
    mappingData.append("currency", "Valuta");
    mappingData.append("dateFormat", "DD/MM/YYYY");
    mappingData.append("amountConvention", "negative_is_expense");

    const mappingResult = await actions.saveImportMappingAction(mappingData);

    assert.equal(mappingResult.success, true);
    assert.equal(state.transactions.every((tx) => tx.status === "pending"), true);
    assert.equal(state.batches[0]?.parsedCount, 2);
    assert.equal(state.transactions.every((tx) => tx.categoryIdConfirmed === null), true);
  });

  it("saveImportMappingAction valorizza categoryIdSuggested per TABACCHERIA", async () => {
    const { actions, state } = await createImportWorld();

    const uploadData = new FormData();
    uploadData.append(
      "file",
      makeCsvFile(csv(`
        Data,Merchant,Descrizione,Importo
        01/06/2026,TABACCHERIA MARIO,acquisto,-12.34
      `)),
    );

    const uploadResult = await actions.uploadImportBatchAction(uploadData);
    assert.equal(uploadResult.success, true);

    const mappingData = new FormData();
    mappingData.append("batchId", String(uploadResult.batchId));
    mappingData.append("date", "Data");
    mappingData.append("merchantName", "Merchant");
    mappingData.append("description", "Descrizione");
    mappingData.append("amount", "Importo");
    mappingData.append("dateFormat", "DD/MM/YYYY");
    mappingData.append("amountConvention", "negative_is_expense");

    const mappingResult = await actions.saveImportMappingAction(mappingData);

    assert.equal(mappingResult.success, true);
    assert.equal(state.transactions[0]?.categoryIdSuggested, "category-cigarettes");
    assert.equal(state.transactions[0]?.categoryIdConfirmed, null);
  });

  it("saveImportMappingAction valorizza categoryIdSuggested per LIDL", async () => {
    const { actions, state } = await createImportWorld();

    const uploadData = new FormData();
    uploadData.append(
      "file",
      makeCsvFile(csv(`
        Data,Merchant,Descrizione,Importo
        01/06/2026,LIDL,spesa,-23.10
      `)),
    );

    const uploadResult = await actions.uploadImportBatchAction(uploadData);
    assert.equal(uploadResult.success, true);

    const mappingData = new FormData();
    mappingData.append("batchId", String(uploadResult.batchId));
    mappingData.append("date", "Data");
    mappingData.append("merchantName", "Merchant");
    mappingData.append("description", "Descrizione");
    mappingData.append("amount", "Importo");
    mappingData.append("dateFormat", "DD/MM/YYYY");
    mappingData.append("amountConvention", "negative_is_expense");

    const mappingResult = await actions.saveImportMappingAction(mappingData);

    assert.equal(mappingResult.success, true);
    assert.equal(state.transactions[0]?.categoryIdSuggested, "category-1");
  });

  it("saveImportMappingAction non suggerisce categorie archiviate o di altro workspace", async () => {
    const { actions, state } = await createImportWorld();

    const archivedCategory = state.categories.find(
      (category) => category.id === "category-1",
    );
    assert.ok(archivedCategory);
    archivedCategory!.archivedAt = new Date("2026-06-01T00:00:00.000Z");

    state.categories.push({
      id: "category-foreign-spesa",
      workspaceId: "workspace-foreign",
      isDefault: false,
      name: "Spesa",
      slug: "spesa",
      color: null,
      icon: null,
      archivedAt: null,
    });

    const uploadData = new FormData();
    uploadData.append(
      "file",
      makeCsvFile(csv(`
        Data,Merchant,Descrizione,Importo
        01/06/2026,LIDL,spesa,-23.10
      `)),
    );

    const uploadResult = await actions.uploadImportBatchAction(uploadData);
    assert.equal(uploadResult.success, true);

    const mappingData = new FormData();
    mappingData.append("batchId", String(uploadResult.batchId));
    mappingData.append("date", "Data");
    mappingData.append("merchantName", "Merchant");
    mappingData.append("description", "Descrizione");
    mappingData.append("amount", "Importo");
    mappingData.append("dateFormat", "DD/MM/YYYY");
    mappingData.append("amountConvention", "negative_is_expense");

    const mappingResult = await actions.saveImportMappingAction(mappingData);

    assert.equal(mappingResult.success, true);
    assert.equal(state.transactions[0]?.categoryIdSuggested, null);
  });

  it("confirmImportedTransactionsAction non usa automaticamente categoryIdSuggested come conferma", async () => {
    const { actions, state } = await createImportWorld();

    const uploadData = new FormData();
    uploadData.append(
      "file",
      makeCsvFile(csv(`
        Data,Merchant,Descrizione,Importo
        01/06/2026,TABACCHERIA MARIO,acquisto,-12.34
      `)),
    );
    const uploadResult = await actions.uploadImportBatchAction(uploadData);
    assert.equal(uploadResult.success, true);

    const mappingData = new FormData();
    mappingData.append("batchId", String(uploadResult.batchId));
    mappingData.append("date", "Data");
    mappingData.append("merchantName", "Merchant");
    mappingData.append("description", "Descrizione");
    mappingData.append("amount", "Importo");
    mappingData.append("dateFormat", "DD/MM/YYYY");
    mappingData.append("amountConvention", "negative_is_expense");

    const mappingResult = await actions.saveImportMappingAction(mappingData);
    assert.equal(mappingResult.success, true);
    assert.equal(state.transactions[0]?.categoryIdSuggested, "category-cigarettes");

    const confirmData = new FormData();
    confirmData.append("batchId", String(uploadResult.batchId));
    confirmData.append("transactionIds", state.transactions[0]!.id);

    const confirmResult = await actions.confirmImportedTransactionsAction(confirmData);

    assert.equal(confirmResult.success, false);
    assert.equal(state.createdEntries.length, 0);
  });

  it("saveImportMappingAction usa fallback it/en con workspace language sconosciuta", async () => {
    const { actions, state } = await createImportWorld();
    state.workspace.language = "zz";

    const uploadData = new FormData();
    uploadData.append(
      "file",
      makeCsvFile(csv(`
        Data,Merchant,Descrizione,Importo
        01/06/2026,LIDL,spesa,-23.10
      `)),
    );
    const uploadResult = await actions.uploadImportBatchAction(uploadData);
    assert.equal(uploadResult.success, true);

    const mappingData = new FormData();
    mappingData.append("batchId", String(uploadResult.batchId));
    mappingData.append("date", "Data");
    mappingData.append("merchantName", "Merchant");
    mappingData.append("description", "Descrizione");
    mappingData.append("amount", "Importo");
    mappingData.append("dateFormat", "DD/MM/YYYY");
    mappingData.append("amountConvention", "negative_is_expense");

    const mappingResult = await actions.saveImportMappingAction(mappingData);

    assert.equal(mappingResult.success, true);
    assert.equal(state.transactions[0]?.categoryIdSuggested, "category-1");
  });

  it("mapping mancante colonna fallisce", async () => {
    const { actions, state } = await createImportWorld();
    const uploadData = new FormData();
    uploadData.append(
      "file",
      makeCsvFile(csv(`
        Data,Descrizione,Importo
        01/06/2026,Caffè,-2
      `)),
    );

    const uploadResult = await actions.uploadImportBatchAction(uploadData);
    assert.equal(uploadResult.success, true);

    const mappingData = new FormData();
    mappingData.append("batchId", String(uploadResult.batchId));
    mappingData.append("date", "Data");
    mappingData.append("description", "Colonna assente");
    mappingData.append("amount", "Importo");
    mappingData.append("dateFormat", "DD/MM/YYYY");
    mappingData.append("amountConvention", "negative_is_expense");

    const mappingResult = await actions.saveImportMappingAction(mappingData);

    assert.equal(mappingResult.success, false);
    assert.equal(state.batches[0]?.status, "failed");
  });

  it("duplicate within batch marcato duplicate", async () => {
    const { actions, state } = await createImportWorld();
    const uploadData = new FormData();
    uploadData.append(
      "file",
      makeCsvFile(csv(`
        Data,Descrizione,Importo
        01/06/2026,Caffè,-2
        01/06/2026,Caffè,-2
      `)),
    );

    const uploadResult = await actions.uploadImportBatchAction(uploadData);
    assert.equal(uploadResult.success, true);

    const mappingData = new FormData();
    mappingData.append("batchId", String(uploadResult.batchId));
    mappingData.append("date", "Data");
    mappingData.append("description", "Descrizione");
    mappingData.append("amount", "Importo");
    mappingData.append("dateFormat", "DD/MM/YYYY");
    mappingData.append("amountConvention", "negative_is_expense");

    const mappingResult = await actions.saveImportMappingAction(mappingData);

    assert.equal(mappingResult.success, true);
    assert.equal(state.transactions[0]?.status, "pending");
    assert.equal(state.transactions[1]?.status, "duplicate");
    assert.equal(state.transactions[1]?.duplicateOfId, state.transactions[0]?.id);
  });

  it("duplicate cross-batch marcato duplicate", async () => {
    const { actions, state } = await createImportWorld();

    const firstUpload = new FormData();
    firstUpload.append(
      "file",
      makeCsvFile(csv(`
        Data,Descrizione,Importo
        01/06/2026,Caffè,-2
      `)),
    );
    const firstUploadResult = await actions.uploadImportBatchAction(firstUpload);
    assert.equal(firstUploadResult.success, true);

    const firstMapping = new FormData();
    firstMapping.append("batchId", String(firstUploadResult.batchId));
    firstMapping.append("date", "Data");
    firstMapping.append("description", "Descrizione");
    firstMapping.append("amount", "Importo");
    firstMapping.append("dateFormat", "DD/MM/YYYY");
    firstMapping.append("amountConvention", "negative_is_expense");
    const firstMappingResult = await actions.saveImportMappingAction(firstMapping);
    assert.equal(firstMappingResult.success, true);

    const secondUpload = new FormData();
    secondUpload.append(
      "file",
      makeCsvFile(csv(`
        Data,Descrizione,Importo
        01/06/2026,Caffè,-2
      `)),
    );
    const secondUploadResult = await actions.uploadImportBatchAction(secondUpload);
    assert.equal(secondUploadResult.success, true);

    const secondMapping = new FormData();
    secondMapping.append("batchId", String(secondUploadResult.batchId));
    secondMapping.append("date", "Data");
    secondMapping.append("description", "Descrizione");
    secondMapping.append("amount", "Importo");
    secondMapping.append("dateFormat", "DD/MM/YYYY");
    secondMapping.append("amountConvention", "negative_is_expense");
    const secondMappingResult = await actions.saveImportMappingAction(secondMapping);

    assert.equal(secondMappingResult.success, true);
    const secondBatchTransactions = state.transactions.filter(
      (transaction) => transaction.importBatchId === secondUploadResult.batchId,
    );
    assert.equal(secondBatchTransactions[0]?.status, "duplicate");
  });

  it("get batch blocca cross-workspace", async () => {
    const { actions, state } = await createImportWorld();

    const uploadData = new FormData();
    uploadData.append(
      "file",
      makeCsvFile(csv(`
        Data,Descrizione,Importo
        01/06/2026,Caffè,-2
      `)),
    );
    const uploadResult = await actions.uploadImportBatchAction(uploadData);
    assert.equal(uploadResult.success, true);

    state.setCurrentWorkspaceId("workspace-foreign");
    const batch = await actions.getImportBatchAction(String(uploadResult.batchId));

    assert.equal(batch, null);
  });

  it("confirm pending crea Entry imported", async () => {
    const { actions, state } = await createImportWorld();

    const uploadData = new FormData();
    uploadData.append(
      "file",
      makeCsvFile(csv(`
        Data,Descrizione,Importo
        01/06/2026,Caffè,-2
      `)),
    );
    const uploadResult = await actions.uploadImportBatchAction(uploadData);
    assert.equal(uploadResult.success, true);

    const mappingData = new FormData();
    mappingData.append("batchId", String(uploadResult.batchId));
    mappingData.append("date", "Data");
    mappingData.append("description", "Descrizione");
    mappingData.append("amount", "Importo");
    mappingData.append("dateFormat", "DD/MM/YYYY");
    mappingData.append("amountConvention", "negative_is_expense");
    const mappingResult = await actions.saveImportMappingAction(mappingData);
    assert.equal(mappingResult.success, true);

    const transaction = state.transactions[0]!;

    const confirmData = new FormData();
    confirmData.append("batchId", String(uploadResult.batchId));
    confirmData.append("categoryId", "category-1");
    confirmData.append("transactionIds", transaction.id);

    const confirmResult = await actions.confirmImportedTransactionsAction(confirmData);

    assert.equal(confirmResult.success, true);
    assert.equal(state.createdEntries.length, 1);
    assert.equal(state.createdEntries[0]?.source, "imported");
    assert.equal(state.createdEntries[0]?.importedTransactionId, transaction.id);
    assert.equal(state.transactions[0]?.status, "confirmed");
    assert.equal(state.transactions[0]?.entryId, "entry-1");
    assert.ok(state.invalidations.paths.includes("/workspace/budgets"));
  });

  it("confirm senza category blocca", async () => {
    const { actions, state } = await createImportWorld();

    const uploadData = new FormData();
    uploadData.append(
      "file",
      makeCsvFile(csv(`
        Data,Descrizione,Importo
        01/06/2026,Caffè,-2
      `)),
    );
    const uploadResult = await actions.uploadImportBatchAction(uploadData);
    assert.equal(uploadResult.success, true);

    const mappingData = new FormData();
    mappingData.append("batchId", String(uploadResult.batchId));
    mappingData.append("date", "Data");
    mappingData.append("description", "Descrizione");
    mappingData.append("amount", "Importo");
    mappingData.append("dateFormat", "DD/MM/YYYY");
    mappingData.append("amountConvention", "negative_is_expense");
    await actions.saveImportMappingAction(mappingData);

    const transaction = state.transactions[0]!;

    const confirmData = new FormData();
    confirmData.append("batchId", String(uploadResult.batchId));
    confirmData.append("transactionIds", transaction.id);

    const confirmResult = await actions.confirmImportedTransactionsAction(confirmData);

    assert.equal(confirmResult.success, false);
    assert.equal(state.createdEntries.length, 0);
  });

  it("confirm duplicate/ignored/error non crea Entry", async () => {
    const { actions, state } = await createImportWorld();

    const uploadData = new FormData();
    uploadData.append(
      "file",
      makeCsvFile(csv(`
        Data,Descrizione,Importo
        01/06/2026,Caffè,-2
        01/06/2026,Caffè,-2
        02/06/2026,Salario,1200
        03/06/2026,Errore,
      `)),
    );
    const uploadResult = await actions.uploadImportBatchAction(uploadData);
    assert.equal(uploadResult.success, true);

    const mappingData = new FormData();
    mappingData.append("batchId", String(uploadResult.batchId));
    mappingData.append("date", "Data");
    mappingData.append("description", "Descrizione");
    mappingData.append("amount", "Importo");
    mappingData.append("dateFormat", "DD/MM/YYYY");
    mappingData.append("amountConvention", "negative_is_expense");
    await actions.saveImportMappingAction(mappingData);

    const duplicateRow = state.transactions.find((transaction) => transaction.status === "duplicate");
    const ignoredRow = state.transactions.find((transaction) => transaction.status === "ignored");
    const errorRow = state.transactions.find((transaction) => transaction.status === "error");

    assert.ok(duplicateRow);
    assert.ok(ignoredRow);
    assert.ok(errorRow);

    const confirmData = new FormData();
    confirmData.append("batchId", String(uploadResult.batchId));
    confirmData.append("categoryId", "category-1");
    confirmData.append("transactionIds", duplicateRow!.id);
    confirmData.append("transactionIds", ignoredRow!.id);
    confirmData.append("transactionIds", errorRow!.id);

    const confirmResult = await actions.confirmImportedTransactionsAction(confirmData);

    assert.equal(confirmResult.success, false);
    assert.equal(state.createdEntries.length, 0);
  });

  it("confirm cross-workspace blocca", async () => {
    const { actions, state } = await createImportWorld();

    const uploadData = new FormData();
    uploadData.append(
      "file",
      makeCsvFile(csv(`
        Data,Descrizione,Importo
        01/06/2026,Caffè,-2
      `)),
    );
    const uploadResult = await actions.uploadImportBatchAction(uploadData);
    assert.equal(uploadResult.success, true);

    state.setCurrentWorkspaceId("workspace-foreign");

    const confirmData = new FormData();
    confirmData.append("batchId", String(uploadResult.batchId));
    confirmData.append("categoryId", "category-1");
    confirmData.append("transactionIds", "transaction-1");

    const confirmResult = await actions.confirmImportedTransactionsAction(confirmData);

    assert.equal(confirmResult.success, false);
  });

  it("ignore selected aggiorna status", async () => {
    const { actions, state } = await createImportWorld();

    const uploadData = new FormData();
    uploadData.append(
      "file",
      makeCsvFile(csv(`
        Data,Descrizione,Importo
        01/06/2026,Caffè,-2
        01/06/2026,Caffè,-2
        02/06/2026,Salario,1200
        03/06/2026,Errore,
      `)),
    );
    const uploadResult = await actions.uploadImportBatchAction(uploadData);
    assert.equal(uploadResult.success, true);

    const mappingData = new FormData();
    mappingData.append("batchId", String(uploadResult.batchId));
    mappingData.append("date", "Data");
    mappingData.append("description", "Descrizione");
    mappingData.append("amount", "Importo");
    mappingData.append("dateFormat", "DD/MM/YYYY");
    mappingData.append("amountConvention", "negative_is_expense");
    await actions.saveImportMappingAction(mappingData);

    const selected = state.transactions
      .filter((transaction) => transaction.status !== "ignored")
      .map((transaction) => transaction.id);
    const ignoreData = new FormData();
    ignoreData.append("batchId", String(uploadResult.batchId));
    for (const id of selected) {
      ignoreData.append("transactionIds", id);
    }

    const ignoreResult = await actions.ignoreImportedTransactionsAction(ignoreData);

    assert.equal(ignoreResult.success, true);
    assert.equal(state.transactions.every((transaction) => transaction.status === "ignored"), true);
  });

  it("delete batch senza confirmed elimina", async () => {
    const { actions, state } = await createImportWorld();

    const uploadData = new FormData();
    uploadData.append(
      "file",
      makeCsvFile(csv(`
        Data,Descrizione,Importo
        01/06/2026,Caffè,-2
      `)),
    );
    const uploadResult = await actions.uploadImportBatchAction(uploadData);
    assert.equal(uploadResult.success, true);

    const mappingData = new FormData();
    mappingData.append("batchId", String(uploadResult.batchId));
    mappingData.append("date", "Data");
    mappingData.append("description", "Descrizione");
    mappingData.append("amount", "Importo");
    mappingData.append("dateFormat", "DD/MM/YYYY");
    mappingData.append("amountConvention", "negative_is_expense");
    await actions.saveImportMappingAction(mappingData);

    const deleteData = new FormData();
    deleteData.append("batchId", String(uploadResult.batchId));

    const deleteResult = await actions.deleteImportBatchAction(deleteData);

    assert.equal(deleteResult.success, true);
    assert.equal(state.batches.length, 0);
    assert.equal(state.transactions.length, 0);
  });

  it("delete batch con confirmed blocca", async () => {
    const { actions, state } = await createImportWorld();

    const uploadData = new FormData();
    uploadData.append(
      "file",
      makeCsvFile(csv(`
        Data,Descrizione,Importo
        01/06/2026,Caffè,-2
      `)),
    );
    const uploadResult = await actions.uploadImportBatchAction(uploadData);
    assert.equal(uploadResult.success, true);

    const mappingData = new FormData();
    mappingData.append("batchId", String(uploadResult.batchId));
    mappingData.append("date", "Data");
    mappingData.append("description", "Descrizione");
    mappingData.append("amount", "Importo");
    mappingData.append("dateFormat", "DD/MM/YYYY");
    mappingData.append("amountConvention", "negative_is_expense");
    await actions.saveImportMappingAction(mappingData);

    const transaction = state.transactions[0]!;

    const confirmData = new FormData();
    confirmData.append("batchId", String(uploadResult.batchId));
    confirmData.append("categoryId", "category-1");
    confirmData.append("transactionIds", transaction.id);
    const confirmResult = await actions.confirmImportedTransactionsAction(confirmData);
    assert.equal(confirmResult.success, true);

    const deleteData = new FormData();
    deleteData.append("batchId", String(uploadResult.batchId));
    const deleteResult = await actions.deleteImportBatchAction(deleteData);

    assert.equal(deleteResult.success, false);
    assert.equal(state.batches.length, 1);
  });

  it("invalidazione chiamata dopo confirm", async () => {
    const { actions, state } = await createImportWorld();

    const uploadData = new FormData();
    uploadData.append(
      "file",
      makeCsvFile(csv(`
        Data,Descrizione,Importo
        01/06/2026,Caffè,-2
      `)),
    );
    const uploadResult = await actions.uploadImportBatchAction(uploadData);
    assert.equal(uploadResult.success, true);

    const mappingData = new FormData();
    mappingData.append("batchId", String(uploadResult.batchId));
    mappingData.append("date", "Data");
    mappingData.append("description", "Descrizione");
    mappingData.append("amount", "Importo");
    mappingData.append("dateFormat", "DD/MM/YYYY");
    mappingData.append("amountConvention", "negative_is_expense");
    await actions.saveImportMappingAction(mappingData);

    const transaction = state.transactions[0]!;

    const confirmData = new FormData();
    confirmData.append("batchId", String(uploadResult.batchId));
    confirmData.append("categoryId", "category-1");
    confirmData.append("transactionIds", transaction.id);
    const confirmResult = await actions.confirmImportedTransactionsAction(confirmData);

    assert.equal(confirmResult.success, true);
    assert.ok(state.invalidations.paths.includes("/workspace/budgets"));
    assert.ok(state.invalidations.paths.includes("/"));
    assert.ok(state.invalidations.tags.includes("entries:workspace-1"));
    assert.ok(state.invalidations.tags.includes("goals:workspace-1"));
  });
});
