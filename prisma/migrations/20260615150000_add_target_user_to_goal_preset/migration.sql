-- Goal.targetUserId
ALTER TABLE "Goal" ADD COLUMN "targetUserId" TEXT;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Goal_targetUserId_idx" ON "Goal"("targetUserId");

-- QuickPreset.targetUserId + targetScope
ALTER TABLE "QuickPreset" ADD COLUMN "targetUserId" TEXT;
ALTER TABLE "QuickPreset" ADD COLUMN "targetScope" TEXT;
ALTER TABLE "QuickPreset" ADD CONSTRAINT "QuickPreset_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "QuickPreset_targetUserId_idx" ON "QuickPreset"("targetUserId");
