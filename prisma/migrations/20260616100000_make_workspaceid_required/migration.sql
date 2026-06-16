-- Step 2: Harden workspace isolation
-- Make workspaceId NOT NULL on Entry, Habit, Goal, QuickPreset
-- Change onDelete from SET NULL to CASCADE
-- Safe to run: Step 1 audit confirmed zero NULL workspaceId rows in production (2026-06-16)

-- Entry
ALTER TABLE "Entry" DROP CONSTRAINT IF EXISTS "Entry_workspaceId_fkey";
ALTER TABLE "Entry" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Entry"
  ADD CONSTRAINT "Entry_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Habit
ALTER TABLE "Habit" DROP CONSTRAINT IF EXISTS "Habit_workspaceId_fkey";
ALTER TABLE "Habit" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Habit"
  ADD CONSTRAINT "Habit_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Goal
ALTER TABLE "Goal" DROP CONSTRAINT IF EXISTS "Goal_workspaceId_fkey";
ALTER TABLE "Goal" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Goal"
  ADD CONSTRAINT "Goal_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- QuickPreset
ALTER TABLE "QuickPreset" DROP CONSTRAINT IF EXISTS "QuickPreset_workspaceId_fkey";
ALTER TABLE "QuickPreset" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "QuickPreset"
  ADD CONSTRAINT "QuickPreset_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
