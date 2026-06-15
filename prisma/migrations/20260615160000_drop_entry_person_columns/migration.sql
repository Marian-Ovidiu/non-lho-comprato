-- Step 3: Drop legacy person/paidBy columns from Entry
-- These were replaced by paidByUserId + EntryBeneficiary (backfilled in Step 1).
ALTER TABLE "Entry" DROP COLUMN IF EXISTS "person";
ALTER TABLE "Entry" DROP COLUMN IF EXISTS "paidBy";
