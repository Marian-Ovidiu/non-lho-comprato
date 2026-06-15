-- Step 4: Drop legacy person columns from Goal and QuickPreset, then drop the Person enum.
ALTER TABLE "Goal" DROP COLUMN IF EXISTS "person";
ALTER TABLE "QuickPreset" DROP COLUMN IF EXISTS "person";

-- Drop the enum type (CASCADE removes any remaining FK references).
DROP TYPE IF EXISTS "Person" CASCADE;
