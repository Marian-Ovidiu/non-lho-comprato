-- Phase 1C auth/email cutover preflight.
-- READ ONLY: this script only runs SELECT statements.
-- Run on a local clone, staging, or new Supabase target before relying on email-based auth mapping.

SELECT 'preflight_auth_email_summary_counts' AS section;

SELECT 'User.email IS NULL' AS check_name, COUNT(*) AS issue_count
FROM "User"
WHERE email IS NULL
UNION ALL
SELECT 'User.email has leading/trailing spaces' AS check_name, COUNT(*) AS issue_count
FROM "User"
WHERE email IS NOT NULL AND email <> btrim(email)
UNION ALL
SELECT 'User.email is not lowercase' AS check_name, COUNT(*) AS issue_count
FROM "User"
WHERE email IS NOT NULL AND email <> lower(email)
UNION ALL
SELECT 'User duplicate lower(email)' AS check_name, COUNT(*) AS issue_count
FROM (
  SELECT lower(email) AS normalized_email
  FROM "User"
  WHERE email IS NOT NULL
  GROUP BY lower(email)
  HAVING COUNT(*) > 1
) duplicates
UNION ALL
SELECT 'User without workspace membership' AS check_name, COUNT(*) AS issue_count
FROM "User" u
WHERE NOT EXISTS (
  SELECT 1
  FROM "WorkspaceMember" wm
  WHERE wm."userId" = u.id
)
UNION ALL
SELECT 'WorkspaceMember without valid User' AS check_name, COUNT(*) AS issue_count
FROM "WorkspaceMember" wm
LEFT JOIN "User" u ON u.id = wm."userId"
WHERE u.id IS NULL
UNION ALL
SELECT 'Entry.paidByUserId without valid User' AS check_name, COUNT(*) AS issue_count
FROM "Entry" e
LEFT JOIN "User" u ON u.id = e."paidByUserId"
WHERE e."paidByUserId" IS NOT NULL
  AND u.id IS NULL
UNION ALL
SELECT 'Entry.createdByUserId without valid User' AS check_name, COUNT(*) AS issue_count
FROM "Entry" e
LEFT JOIN "User" u ON u.id = e."createdByUserId"
WHERE e."createdByUserId" IS NOT NULL
  AND u.id IS NULL
UNION ALL
SELECT 'EntryBeneficiary without valid User' AS check_name, COUNT(*) AS issue_count
FROM "EntryBeneficiary" b
LEFT JOIN "User" u ON u.id = b."userId"
WHERE u.id IS NULL;

SELECT 'preflight_auth_email_user_email_details' AS section;

SELECT
  id AS user_id,
  email,
  lower(email) AS normalized_email,
  CASE
    WHEN email IS NULL THEN 'email_null'
    WHEN email <> btrim(email) THEN 'email_has_outer_spaces'
    WHEN email <> lower(email) THEN 'email_not_lowercase'
    ELSE 'ok'
  END AS email_status
FROM "User"
WHERE email IS NULL
   OR email <> btrim(email)
   OR email <> lower(email)
ORDER BY email NULLS FIRST, id;

SELECT 'preflight_auth_email_duplicate_lower_email_details' AS section;

SELECT
  lower(email) AS normalized_email,
  COUNT(*) AS duplicate_count,
  array_agg(id ORDER BY id) AS user_ids,
  array_agg(email ORDER BY email) AS emails
FROM "User"
WHERE email IS NOT NULL
GROUP BY lower(email)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, normalized_email;

SELECT 'preflight_auth_email_users_without_workspace_membership_details' AS section;

SELECT
  u.id AS user_id,
  u.email,
  u.name,
  COUNT(DISTINCT owned.id) AS owned_workspaces
FROM "User" u
LEFT JOIN "Workspace" owned ON owned."ownerUserId" = u.id
WHERE NOT EXISTS (
  SELECT 1
  FROM "WorkspaceMember" wm
  WHERE wm."userId" = u.id
)
GROUP BY u.id, u.email, u.name
ORDER BY u.email NULLS LAST, u.id;

SELECT 'preflight_auth_email_workspace_membership_without_user_details' AS section;

SELECT
  wm.id AS workspace_member_id,
  wm."workspaceId",
  wm."userId",
  wm.role
FROM "WorkspaceMember" wm
LEFT JOIN "User" u ON u.id = wm."userId"
WHERE u.id IS NULL
ORDER BY wm."workspaceId", wm."userId";

SELECT 'preflight_auth_email_entry_user_reference_details' AS section;

SELECT 'paidByUserId' AS reference_type, e.id AS entry_id, e.title, e."workspaceId", e."paidByUserId" AS missing_user_id
FROM "Entry" e
LEFT JOIN "User" u ON u.id = e."paidByUserId"
WHERE e."paidByUserId" IS NOT NULL
  AND u.id IS NULL
UNION ALL
SELECT 'createdByUserId' AS reference_type, e.id AS entry_id, e.title, e."workspaceId", e."createdByUserId" AS missing_user_id
FROM "Entry" e
LEFT JOIN "User" u ON u.id = e."createdByUserId"
WHERE e."createdByUserId" IS NOT NULL
  AND u.id IS NULL
ORDER BY reference_type, entry_id;

SELECT 'preflight_auth_email_entry_beneficiary_without_user_details' AS section;

SELECT
  b."entryId" AS entry_id,
  e.title,
  e."workspaceId",
  b."userId" AS missing_user_id
FROM "EntryBeneficiary" b
JOIN "Entry" e ON e.id = b."entryId"
LEFT JOIN "User" u ON u.id = b."userId"
WHERE u.id IS NULL
ORDER BY e."workspaceId", b."entryId", b."userId";
