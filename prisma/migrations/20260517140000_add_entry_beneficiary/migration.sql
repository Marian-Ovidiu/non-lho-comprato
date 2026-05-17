-- CreateTable
CREATE TABLE "EntryBeneficiary" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntryBeneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntryBeneficiary_entryId_idx" ON "EntryBeneficiary"("entryId");

-- CreateIndex
CREATE INDEX "EntryBeneficiary_userId_idx" ON "EntryBeneficiary"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EntryBeneficiary_entryId_userId_key" ON "EntryBeneficiary"("entryId", "userId");

-- AddForeignKey
ALTER TABLE "EntryBeneficiary" ADD CONSTRAINT "EntryBeneficiary_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryBeneficiary" ADD CONSTRAINT "EntryBeneficiary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from legacy Entry.beneficiaries (Person[]). Legacy column is retained.
INSERT INTO "EntryBeneficiary" ("id", "entryId", "userId", "createdAt")
SELECT
    gen_random_uuid()::text,
    mapped."entryId",
    mapped."userId",
    mapped."createdAt"
FROM (
    SELECT DISTINCT
        source."entryId",
        source."userId",
        source."createdAt"
    FROM (
        SELECT
            entry."id" AS "entryId",
            'legacy-marian'::text AS "userId",
            entry."createdAt" AS "createdAt"
        FROM "Entry" AS entry
        WHERE 'MARIAN'::"Person" = ANY (entry."beneficiaries")

        UNION ALL

        SELECT
            entry."id",
            'legacy-martina'::text,
            entry."createdAt"
        FROM "Entry" AS entry
        WHERE 'MARTINA'::"Person" = ANY (entry."beneficiaries")

        UNION ALL

        SELECT
            entry."id",
            'legacy-marian'::text,
            entry."createdAt"
        FROM "Entry" AS entry
        WHERE 'TUTTI'::"Person" = ANY (entry."beneficiaries")

        UNION ALL

        SELECT
            entry."id",
            'legacy-martina'::text,
            entry."createdAt"
        FROM "Entry" AS entry
        WHERE 'TUTTI'::"Person" = ANY (entry."beneficiaries")
    ) AS source
) AS mapped;
