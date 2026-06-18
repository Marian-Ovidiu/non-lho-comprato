ALTER TYPE "EntrySource" ADD VALUE 'imported';

CREATE TYPE "ImportSource" AS ENUM ('bank_csv');

CREATE TYPE "ImportBatchStatus" AS ENUM ('parsing', 'ready', 'partial', 'completed', 'failed');

CREATE TYPE "ImportedTransactionStatus" AS ENUM ('pending', 'confirmed', 'ignored', 'duplicate', 'error');

CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "source" "ImportSource" NOT NULL DEFAULT 'bank_csv',
    "originalFilename" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "delimiter" TEXT,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'parsing',
    "headerRowJson" JSONB,
    "columnMappingJson" JSONB,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "parsedCount" INTEGER NOT NULL DEFAULT 0,
    "confirmedCount" INTEGER NOT NULL DEFAULT 0,
    "ignoredCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportedTransaction" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "source" "ImportSource" NOT NULL DEFAULT 'bank_csv',
    "sourceRowIndex" INTEGER NOT NULL,
    "externalId" TEXT,
    "fingerprint" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "merchantName" TEXT,
    "amount" DECIMAL(10,2),
    "currency" TEXT,
    "status" "ImportedTransactionStatus" NOT NULL DEFAULT 'pending',
    "categoryIdSuggested" TEXT,
    "categoryIdConfirmed" TEXT,
    "entryId" TEXT,
    "duplicateOfId" TEXT,
    "rawJson" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportedTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImportBatch_workspaceId_status_idx" ON "ImportBatch"("workspaceId", "status");
CREATE INDEX "ImportBatch_createdByUserId_idx" ON "ImportBatch"("createdByUserId");
CREATE INDEX "ImportBatch_source_idx" ON "ImportBatch"("source");

CREATE UNIQUE INDEX "ImportedTransaction_importBatchId_sourceRowIndex_key" ON "ImportedTransaction"("importBatchId", "sourceRowIndex");
CREATE INDEX "ImportedTransaction_workspaceId_source_fingerprint_idx" ON "ImportedTransaction"("workspaceId", "source", "fingerprint");
CREATE INDEX "ImportedTransaction_workspaceId_status_idx" ON "ImportedTransaction"("workspaceId", "status");
CREATE INDEX "ImportedTransaction_entryId_idx" ON "ImportedTransaction"("entryId");
CREATE INDEX "ImportedTransaction_importBatchId_idx" ON "ImportedTransaction"("importBatchId");

ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ImportedTransaction" ADD CONSTRAINT "ImportedTransaction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportedTransaction" ADD CONSTRAINT "ImportedTransaction_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportedTransaction" ADD CONSTRAINT "ImportedTransaction_categoryIdSuggested_fkey" FOREIGN KEY ("categoryIdSuggested") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImportedTransaction" ADD CONSTRAINT "ImportedTransaction_categoryIdConfirmed_fkey" FOREIGN KEY ("categoryIdConfirmed") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImportedTransaction" ADD CONSTRAINT "ImportedTransaction_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImportedTransaction" ADD CONSTRAINT "ImportedTransaction_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "ImportedTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
