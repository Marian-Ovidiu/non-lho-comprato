CREATE INDEX IF NOT EXISTS "Entry_workspaceId_date_idx"
  ON "Entry" ("workspaceId", "date");

CREATE INDEX IF NOT EXISTS "Entry_workspaceId_categoryId_date_idx"
  ON "Entry" ("workspaceId", "categoryId", "date");

CREATE INDEX IF NOT EXISTS "Entry_workspaceId_savedAmount_date_idx"
  ON "Entry" ("workspaceId", "savedAmount", "date");
