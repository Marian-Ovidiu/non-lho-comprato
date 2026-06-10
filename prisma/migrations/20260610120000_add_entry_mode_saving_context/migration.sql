-- CreateEnum
CREATE TYPE "EntryMode" AS ENUM ('spent', 'avoided');

-- CreateEnum
CREATE TYPE "EntrySavingContext" AS ENUM ('none', 'comparison');

-- AlterTable
ALTER TABLE "Entry"
ADD COLUMN     "mode" "EntryMode" NOT NULL DEFAULT 'spent',
ADD COLUMN     "savingContext" "EntrySavingContext" NOT NULL DEFAULT 'none';

-- Backfill deterministic tracker-first semantics without changing money fields.
UPDATE "Entry"
SET
  "mode" = CASE
    WHEN "realCost" = 0 AND "alternativeCost" > 0 AND "savedAmount" > 0
      THEN 'avoided'::"EntryMode"
    ELSE 'spent'::"EntryMode"
  END,
  "savingContext" = CASE
    WHEN "alternativeCost" <> "realCost"
      THEN 'comparison'::"EntrySavingContext"
    ELSE 'none'::"EntrySavingContext"
  END;
