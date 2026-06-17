ALTER TABLE "WorkspaceMember" ADD COLUMN "lastSelectedAt" TIMESTAMP(3);

CREATE INDEX "WorkspaceMember_userId_lastSelectedAt_idx" ON "WorkspaceMember"("userId", "lastSelectedAt");
