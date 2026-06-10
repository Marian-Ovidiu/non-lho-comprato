DROP INDEX IF EXISTS "Category_name_key";
DROP INDEX IF EXISTS "Category_slug_key";

CREATE TEMP TABLE "_category_workspace_usage" AS
SELECT DISTINCT "categoryId", "workspaceId"
FROM "Entry"
WHERE "workspaceId" IS NOT NULL
UNION
SELECT DISTINCT "categoryId", "workspaceId"
FROM "Habit"
WHERE "workspaceId" IS NOT NULL
UNION
SELECT DISTINCT "categoryId", "workspaceId"
FROM "QuickPreset"
WHERE "workspaceId" IS NOT NULL
UNION
SELECT "id" AS "categoryId", "workspaceId"
FROM "Category"
WHERE "workspaceId" IS NOT NULL;

CREATE TEMP TABLE "_category_primary_workspace" AS
SELECT
  c."id" AS "categoryId",
  COALESCE(
    c."workspaceId",
    (
      SELECT MIN(u."workspaceId")
      FROM "_category_workspace_usage" u
      WHERE u."categoryId" = c."id"
    ),
    (
      SELECT w."id"
      FROM "Workspace" w
      ORDER BY w."createdAt", w."id"
      LIMIT 1
    )
  ) AS "workspaceId"
FROM "Category" c;

UPDATE "Category" c
SET "workspaceId" = p."workspaceId"
FROM "_category_primary_workspace" p
WHERE c."id" = p."categoryId"
  AND c."workspaceId" IS DISTINCT FROM p."workspaceId";

INSERT INTO "Category" (
  "id",
  "workspaceId",
  "name",
  "slug",
  "color",
  "icon",
  "createdAt",
  "updatedAt"
)
SELECT
  'cat_' || substr(md5(u."categoryId" || ':' || u."workspaceId"), 1, 24),
  u."workspaceId",
  c."name",
  c."slug",
  c."color",
  c."icon",
  c."createdAt",
  c."updatedAt"
FROM "_category_workspace_usage" u
JOIN "_category_primary_workspace" p
  ON p."categoryId" = u."categoryId"
JOIN "Category" c
  ON c."id" = u."categoryId"
WHERE u."workspaceId" <> p."workspaceId"
ON CONFLICT ("id") DO NOTHING;

CREATE TEMP TABLE "_category_workspace_target" AS
SELECT
  p."categoryId",
  p."workspaceId",
  p."categoryId" AS "targetCategoryId"
FROM "_category_primary_workspace" p
WHERE p."workspaceId" IS NOT NULL
UNION ALL
SELECT
  u."categoryId",
  u."workspaceId",
  'cat_' || substr(md5(u."categoryId" || ':' || u."workspaceId"), 1, 24) AS "targetCategoryId"
FROM "_category_workspace_usage" u
JOIN "_category_primary_workspace" p
  ON p."categoryId" = u."categoryId"
WHERE u."workspaceId" <> p."workspaceId";

UPDATE "Entry" e
SET "categoryId" = m."targetCategoryId"
FROM "_category_workspace_target" m
WHERE e."categoryId" = m."categoryId"
  AND e."workspaceId" = m."workspaceId"
  AND e."categoryId" <> m."targetCategoryId";

UPDATE "Habit" h
SET "categoryId" = m."targetCategoryId"
FROM "_category_workspace_target" m
WHERE h."categoryId" = m."categoryId"
  AND h."workspaceId" = m."workspaceId"
  AND h."categoryId" <> m."targetCategoryId";

UPDATE "QuickPreset" p
SET "categoryId" = m."targetCategoryId"
FROM "_category_workspace_target" m
WHERE p."categoryId" = m."categoryId"
  AND p."workspaceId" = m."workspaceId"
  AND p."categoryId" <> m."targetCategoryId";

ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_workspaceId_fkey";
ALTER TABLE "Category" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Category"
ADD CONSTRAINT "Category_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Category_workspaceId_slug_key" ON "Category"("workspaceId", "slug");
CREATE UNIQUE INDEX "Category_workspaceId_name_key" ON "Category"("workspaceId", "name");
