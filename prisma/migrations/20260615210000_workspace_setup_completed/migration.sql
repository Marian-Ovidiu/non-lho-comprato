ALTER TABLE "Workspace" ADD COLUMN "setupCompleted" BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE "Workspace" SET "setupCompleted" = TRUE;
