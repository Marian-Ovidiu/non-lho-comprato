-- Phase 1C known orphan test user cleanup.
-- MUTATIVE: run only on a restored local clone, staging, or new Supabase target after review.
-- DO NOT RUN ON OLD PRODUCTION.
-- This script intentionally deletes exactly one known orphan test user and is idempotent.

BEGIN;

SELECT 'repair_known_test_users_before' AS section;

SELECT
  u.id AS user_id,
  u.email,
  u.name,
  COUNT(DISTINCT wm.id) AS memberships,
  COUNT(DISTINCT owned.id) AS owned_workspaces,
  COUNT(DISTINCT paid.id) AS entries_paid,
  COUNT(DISTINCT created.id) AS entries_created,
  COUNT(DISTINCT beneficiary."entryId") AS beneficiary_entries,
  CASE
    WHEN u.id IS NULL THEN 'target_user_missing'
    WHEN COUNT(DISTINCT wm.id) = 0
      AND COUNT(DISTINCT owned.id) = 0
      AND COUNT(DISTINCT paid.id) = 0
      AND COUNT(DISTINCT created.id) = 0
      AND COUNT(DISTINCT beneficiary."entryId") = 0
      THEN 'eligible_for_delete'
    ELSE 'not_eligible_manual_review_required'
  END AS cleanup_status
FROM (
  SELECT
    '60c670fb-707a-480b-b29a-2d30fe2e09e0'::text AS id,
    'private.by.lena@gmail.com'::text AS email
) target
LEFT JOIN "User" u ON u.id = target.id AND u.email = target.email
LEFT JOIN "WorkspaceMember" wm ON wm."userId" = u.id
LEFT JOIN "Workspace" owned ON owned."ownerUserId" = u.id
LEFT JOIN "Entry" paid ON paid."paidByUserId" = u.id
LEFT JOIN "Entry" created ON created."createdByUserId" = u.id
LEFT JOIN "EntryBeneficiary" beneficiary ON beneficiary."userId" = u.id
GROUP BY u.id, u.email, u.name;

WITH deleted AS (
  DELETE FROM "User" u
  WHERE u.id = '60c670fb-707a-480b-b29a-2d30fe2e09e0'
    AND u.email = 'private.by.lena@gmail.com'
    AND NOT EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm WHERE wm."userId" = u.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM "Workspace" w WHERE w."ownerUserId" = u.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM "Entry" e WHERE e."paidByUserId" = u.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM "Entry" e WHERE e."createdByUserId" = u.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM "EntryBeneficiary" b WHERE b."userId" = u.id
    )
  RETURNING u.id, u.email
)
SELECT 'repair_known_test_users_deleted_rows' AS check_name, COUNT(*) AS deleted_rows
FROM deleted;

SELECT 'repair_known_test_users_after' AS section;

SELECT
  target.id AS target_user_id,
  target.email AS target_email,
  CASE
    WHEN u.id IS NULL THEN 'deleted_or_already_absent'
    ELSE 'still_present_manual_review_required'
  END AS cleanup_status
FROM (
  SELECT
    '60c670fb-707a-480b-b29a-2d30fe2e09e0'::text AS id,
    'private.by.lena@gmail.com'::text AS email
) target
LEFT JOIN "User" u ON u.id = target.id AND u.email = target.email;

COMMIT;
