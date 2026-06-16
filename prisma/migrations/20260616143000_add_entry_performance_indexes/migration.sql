CREATE INDEX IF NOT EXISTS "Entry_workspaceId_paidByUserId_date_idx" ON "Entry" ("workspaceId", "paidByUserId", "date");
CREATE INDEX IF NOT EXISTS "EntryBeneficiary_userId_entryId_idx" ON "EntryBeneficiary" ("userId", "entryId");
