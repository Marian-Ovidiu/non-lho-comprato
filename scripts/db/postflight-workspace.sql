-- Non l'ho comprato workspace migration postflight checks.
-- Read-only: this script only runs SELECT statements.
-- Run against a restored clone first, then after an approved migration window.
-- Expected issue_count values are zero unless explicitly documented otherwise.

SELECT 'postflight_expected_zero_counts' AS section;

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
WHERE "workspaceId" IS NULL
UNION ALL
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
WHERE p."workspaceId" IS DISTINCT FROM c."workspaceId"
UNION ALL
SELECT 'EntryBeneficiary user not member of entry workspace' AS check_name, COUNT(*) AS issue_count
FROM "EntryBeneficiary" b
JOIN "Entry" e ON e.id = b."entryId"
LEFT JOIN "WorkspaceMember" wm
  ON wm."workspaceId" = e."workspaceId"
 AND wm."userId" = b."userId"
WHERE wm.id IS NULL
UNION ALL
SELECT 'WorkspaceMember duplicate workspace/user pairs' AS check_name, COUNT(*) AS issue_count
FROM (
  SELECT "workspaceId", "userId"
  FROM "WorkspaceMember"
  GROUP BY "workspaceId", "userId"
  HAVING COUNT(*) > 1
) duplicates
UNION ALL
SELECT 'WorkspaceInvite tokenHash invalid' AS check_name, COUNT(*) AS issue_count
FROM "WorkspaceInvite"
WHERE "tokenHash" IS NULL
   OR btrim("tokenHash") = ''
   OR "tokenHash" !~ '^[a-f0-9]{64}$'
UNION ALL
SELECT 'WorkspaceInvite expires before createdAt' AS check_name, COUNT(*) AS issue_count
FROM "WorkspaceInvite"
WHERE "expiresAt" < "createdAt"
UNION ALL
SELECT 'WorkspaceInvite usedCount exceeds maxUses' AS check_name, COUNT(*) AS issue_count
FROM "WorkspaceInvite"
WHERE "usedCount" > "maxUses";

SELECT 'postflight_category_duplicate_slug_details' AS section;

SELECT "workspaceId", slug, COUNT(*) AS duplicate_count
FROM "Category"
GROUP BY "workspaceId", slug
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, "workspaceId", slug;

SELECT 'postflight_category_duplicate_name_details' AS section;

SELECT "workspaceId", name, COUNT(*) AS duplicate_count
FROM "Category"
GROUP BY "workspaceId", name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, "workspaceId", name;

SELECT 'postflight_entry_money_domain_counts' AS section;

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
