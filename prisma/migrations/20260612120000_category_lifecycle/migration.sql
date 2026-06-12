-- Phase 16A: Category lifecycle foundation
-- Adds isDefault flag and soft-delete archivedAt to Category model.

ALTER TABLE "Category" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Category" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Category_workspaceId_archivedAt_idx" ON "Category"("workspaceId", "archivedAt");

-- Backfill: mark all existing categories whose slug matches a built-in default.
UPDATE "Category"
SET "isDefault" = true
WHERE slug IN (
  'cibo',
  'caffe',
  'delivery',
  'spesa',
  'trasporti',
  'auto',
  'shopping',
  'casa',
  'svago',
  'viaggi',
  'abbonamenti',
  'salute',
  'regali',
  'tech',
  'beauty',
  'sigarette-accessori',
  'altro'
);
