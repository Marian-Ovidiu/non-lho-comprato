-- Non l'ho comprato workspace migration preflight checks.
-- Read-only: this script only runs SELECT statements.
-- Run against a restored clone/backup before any workspace/category migration.

SELECT 'preflight_workspace_null_counts' AS section;

SELECT 'Entry.workspaceId IS NULL' AS check_name, COUNT(*) AS issue_count
FROM "Entry"
WHERE "workspaceId" IS NULL
UNION ALL
SELECT 'Habit.workspaceId IS NULL' AS check_name, COUNT(*) AS issue_count
FROM "Habit"
WHERE "workspaceId" IS NULL
UNION ALL
SELECT 'Goal.workspaceId IS NULL' AS check_name, COUNT(*) AS issue_count
FROM "Goal"
WHERE "workspaceId" IS NULL
UNION ALL
SELECT 'QuickPreset.workspaceId IS NULL' AS check_name, COUNT(*) AS issue_count
FROM "QuickPreset"
WHERE "workspaceId" IS NULL
UNION ALL
SELECT 'Category.workspaceId IS NULL' AS check_name, COUNT(*) AS issue_count
FROM "Category"
WHERE "workspaceId" IS NULL;

SELECT 'preflight_category_duplicate_slug_details' AS section;

SELECT "workspaceId", slug, COUNT(*) AS duplicate_count
FROM "Category"
GROUP BY "workspaceId", slug
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, "workspaceId", slug;

SELECT 'preflight_category_duplicate_name_details' AS section;

SELECT "workspaceId", name, COUNT(*) AS duplicate_count
FROM "Category"
GROUP BY "workspaceId", name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, "workspaceId", name;

SELECT 'preflight_category_workspace_mismatch_counts' AS section;

SELECT 'Entry.category.workspace mismatch' AS check_name, COUNT(*) AS issue_count
FROM "Entry" e
JOIN "Category" c ON c.id = e."categoryId"
WHERE e."workspaceId" IS DISTINCT FROM c."workspaceId"
UNION ALL
SELECT 'Habit.category.workspace mismatch' AS check_name, COUNT(*) AS issue_count
FROM "Habit" h
JOIN "Category" c ON c.id = h."categoryId"
WHERE h."workspaceId" IS DISTINCT FROM c."workspaceId"
UNION ALL
SELECT 'QuickPreset.category.workspace mismatch' AS check_name, COUNT(*) AS issue_count
FROM "QuickPreset" p
JOIN "Category" c ON c.id = p."categoryId"
WHERE p."workspaceId" IS DISTINCT FROM c."workspaceId";

SELECT 'preflight_category_workspace_mismatch_samples' AS section;

SELECT 'Entry' AS model, e.id AS record_id, e."workspaceId" AS record_workspace_id, c.id AS category_id, c."workspaceId" AS category_workspace_id
FROM "Entry" e
JOIN "Category" c ON c.id = e."categoryId"
WHERE e."workspaceId" IS DISTINCT FROM c."workspaceId"
ORDER BY e."updatedAt" DESC
LIMIT 25;

SELECT 'Habit' AS model, h.id AS record_id, h."workspaceId" AS record_workspace_id, c.id AS category_id, c."workspaceId" AS category_workspace_id
FROM "Habit" h
JOIN "Category" c ON c.id = h."categoryId"
WHERE h."workspaceId" IS DISTINCT FROM c."workspaceId"
ORDER BY h."updatedAt" DESC
LIMIT 25;

SELECT 'QuickPreset' AS model, p.id AS record_id, p."workspaceId" AS record_workspace_id, c.id AS category_id, c."workspaceId" AS category_workspace_id
FROM "QuickPreset" p
JOIN "Category" c ON c.id = p."categoryId"
WHERE p."workspaceId" IS DISTINCT FROM c."workspaceId"
ORDER BY p."updatedAt" DESC
LIMIT 25;

SELECT 'preflight_entry_beneficiary_membership' AS section;

SELECT COUNT(*) AS beneficiaries_without_workspace_membership
FROM "EntryBeneficiary" b
JOIN "Entry" e ON e.id = b."entryId"
LEFT JOIN "WorkspaceMember" wm
  ON wm."workspaceId" = e."workspaceId"
 AND wm."userId" = b."userId"
WHERE wm.id IS NULL;

SELECT e.id AS entry_id, e."workspaceId" AS entry_workspace_id, b."userId" AS beneficiary_user_id
FROM "EntryBeneficiary" b
JOIN "Entry" e ON e.id = b."entryId"
LEFT JOIN "WorkspaceMember" wm
  ON wm."workspaceId" = e."workspaceId"
 AND wm."userId" = b."userId"
WHERE wm.id IS NULL
ORDER BY e."updatedAt" DESC
LIMIT 25;

SELECT 'preflight_entry_money_domain_counts' AS section;

SELECT 'Entry has negative base cost' AS check_name, COUNT(*) AS issue_count
FROM "Entry"
WHERE "realCost" < 0 OR "alternativeCost" < 0
UNION ALL
SELECT 'Entry avoided mode inconsistent with money fields' AS check_name, COUNT(*) AS issue_count
FROM "Entry"
WHERE mode = 'avoided'
  AND (
    "realCost" <> 0
    OR "alternativeCost" <> "savedAmount"
    OR "savedAmount" < 0
    OR "savingContext" <> 'comparison'
  )
UNION ALL
SELECT 'Entry spent/no-comparison inconsistent with money fields' AS check_name, COUNT(*) AS issue_count
FROM "Entry"
WHERE mode = 'spent'
  AND "savingContext" = 'none'
  AND ("alternativeCost" <> "realCost" OR "savedAmount" <> 0)
UNION ALL
SELECT 'Entry spent/comparison inconsistent with money fields' AS check_name, COUNT(*) AS issue_count
FROM "Entry"
WHERE mode = 'spent'
  AND "savingContext" = 'comparison'
  AND "savedAmount" <> ("alternativeCost" - "realCost")
UNION ALL
SELECT 'Entry unknown mode/context combination' AS check_name, COUNT(*) AS issue_count
FROM "Entry"
WHERE NOT (
  (mode = 'avoided' AND "savingContext" = 'comparison')
  OR (mode = 'spent' AND "savingContext" IN ('none', 'comparison'))
);

SELECT 'preflight_entry_money_domain_samples' AS section;

SELECT id, "workspaceId", mode, "savingContext", "realCost", "alternativeCost", "savedAmount", "updatedAt"
FROM "Entry"
WHERE "realCost" < 0
   OR "alternativeCost" < 0
   OR (
     mode = 'avoided'
     AND (
       "realCost" <> 0
       OR "alternativeCost" <> "savedAmount"
       OR "savedAmount" < 0
       OR "savingContext" <> 'comparison'
     )
   )
   OR (
     mode = 'spent'
     AND "savingContext" = 'none'
     AND ("alternativeCost" <> "realCost" OR "savedAmount" <> 0)
   )
   OR (
     mode = 'spent'
     AND "savingContext" = 'comparison'
     AND "savedAmount" <> ("alternativeCost" - "realCost")
   )
   OR NOT (
     (mode = 'avoided' AND "savingContext" = 'comparison')
     OR (mode = 'spent' AND "savingContext" IN ('none', 'comparison'))
   )
ORDER BY "updatedAt" DESC
LIMIT 25;

SELECT 'preflight_workspace_membership_duplicates' AS section;

SELECT "workspaceId", "userId", COUNT(*) AS duplicate_count
FROM "WorkspaceMember"
GROUP BY "workspaceId", "userId"
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, "workspaceId", "userId";

SELECT 'preflight_workspace_invite_token_hash_checks' AS section;

SELECT 'WorkspaceInvite.tokenHash null or blank' AS check_name, COUNT(*) AS issue_count
FROM "WorkspaceInvite"
WHERE "tokenHash" IS NULL OR btrim("tokenHash") = ''
UNION ALL
SELECT 'WorkspaceInvite.tokenHash not sha256 hex' AS check_name, COUNT(*) AS issue_count
FROM "WorkspaceInvite"
WHERE "tokenHash" IS NULL OR "tokenHash" !~ '^[a-f0-9]{64}$'
UNION ALL
SELECT 'WorkspaceInvite expires before createdAt' AS check_name, COUNT(*) AS issue_count
FROM "WorkspaceInvite"
WHERE "expiresAt" < "createdAt"
UNION ALL
SELECT 'WorkspaceInvite usedCount exceeds maxUses' AS check_name, COUNT(*) AS issue_count
FROM "WorkspaceInvite"
WHERE "usedCount" > "maxUses";
