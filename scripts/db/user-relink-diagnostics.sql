-- User relink diagnostics after Supabase project migration.
-- READ ONLY: this file only runs SELECT statements.
-- Intended target: restored clone or new Supabase project, never old production for mutation.

SELECT 'schema_prerequisites' AS section;

SELECT 'public.User table exists' AS check_name, (to_regclass('public."User"') IS NOT NULL) AS present
UNION ALL
SELECT 'public.User.supabaseId column exists' AS check_name, EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'User'
    AND column_name = 'supabaseId'
)
UNION ALL
SELECT 'auth.users table exists' AS check_name, (to_regclass('auth.users') IS NOT NULL) AS present;

SELECT 'application_users' AS section;

SELECT
  u.id AS app_user_id,
  u.email,
  to_jsonb(u)->>'supabaseId' AS current_supabase_id,
  u.name,
  u."createdAt",
  u."updatedAt",
  COUNT(DISTINCT wm.id) AS workspace_memberships,
  COUNT(DISTINCT owned.id) AS owned_workspaces,
  COUNT(DISTINCT created_entries.id) AS created_entries,
  COUNT(DISTINCT paid_entries.id) AS paid_entries,
  COUNT(DISTINCT beneficiaries.id) AS beneficiary_entries,
  COUNT(DISTINCT target_habits.id) AS target_habits
FROM public."User" u
LEFT JOIN public."WorkspaceMember" wm ON wm."userId" = u.id
LEFT JOIN public."Workspace" owned ON owned."ownerUserId" = u.id
LEFT JOIN public."Entry" created_entries ON created_entries."createdByUserId" = u.id
LEFT JOIN public."Entry" paid_entries ON paid_entries."paidByUserId" = u.id
LEFT JOIN public."EntryBeneficiary" beneficiaries ON beneficiaries."userId" = u.id
LEFT JOIN public."Habit" target_habits ON target_habits."targetUserId" = u.id
GROUP BY u.id, u.email, to_jsonb(u)->>'supabaseId', u.name, u."createdAt", u."updatedAt"
ORDER BY lower(u.email) NULLS LAST, u.id;

SELECT 'auth_users_available' AS section;

SELECT
  au.id::text AS auth_user_id,
  au.email,
  au.created_at,
  au.last_sign_in_at,
  au.email_confirmed_at IS NOT NULL AS email_confirmed
FROM auth.users au
ORDER BY lower(au.email) NULLS LAST, au.created_at;

SELECT 'app_auth_email_matches' AS section;

SELECT
  u.id AS app_user_id,
  u.email AS app_email,
  to_jsonb(u)->>'supabaseId' AS current_supabase_id,
  au.id::text AS matching_auth_user_id,
  au.email AS auth_email,
  CASE
    WHEN au.id IS NULL THEN 'no_auth_match'
    WHEN to_jsonb(u)->>'supabaseId' IS NULL THEN 'will_link'
    WHEN to_jsonb(u)->>'supabaseId' = au.id::text THEN 'already_linked'
    ELSE 'will_replace_supabase_id'
  END AS relink_status
FROM public."User" u
LEFT JOIN auth.users au
  ON lower(au.email) = lower(u.email)
WHERE u.email IS NOT NULL
ORDER BY lower(u.email), u.id;

SELECT 'app_users_without_auth_match' AS section;

SELECT
  u.id AS app_user_id,
  u.email,
  to_jsonb(u)->>'supabaseId' AS current_supabase_id,
  u.name
FROM public."User" u
LEFT JOIN auth.users au
  ON lower(au.email) = lower(u.email)
WHERE u.email IS NOT NULL
  AND au.id IS NULL
ORDER BY lower(u.email), u.id;

SELECT 'auth_users_without_app_user' AS section;

SELECT
  au.id::text AS auth_user_id,
  au.email,
  au.created_at,
  au.last_sign_in_at
FROM auth.users au
LEFT JOIN public."User" u
  ON lower(u.email) = lower(au.email)
WHERE au.email IS NOT NULL
  AND u.id IS NULL
ORDER BY lower(au.email), au.created_at;

SELECT 'duplicate_application_user_emails' AS section;

SELECT
  lower(email) AS normalized_email,
  COUNT(*) AS duplicate_count,
  array_agg(id ORDER BY id) AS app_user_ids
FROM public."User"
WHERE email IS NOT NULL
GROUP BY lower(email)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, normalized_email;

SELECT 'duplicate_auth_user_emails' AS section;

SELECT
  lower(email) AS normalized_email,
  COUNT(*) AS duplicate_count,
  array_agg(id::text ORDER BY id::text) AS auth_user_ids
FROM auth.users
WHERE email IS NOT NULL
GROUP BY lower(email)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, normalized_email;

SELECT 'workspace_membership_by_user' AS section;

SELECT
  u.id AS app_user_id,
  u.email,
  to_jsonb(u)->>'supabaseId' AS current_supabase_id,
  wm."workspaceId",
  w.name AS workspace_name,
  w.kind AS workspace_kind,
  wm.role,
  wm."createdAt" AS member_created_at
FROM public."User" u
LEFT JOIN public."WorkspaceMember" wm ON wm."userId" = u.id
LEFT JOIN public."Workspace" w ON w.id = wm."workspaceId"
ORDER BY lower(u.email) NULLS LAST, u.id, w.name NULLS LAST;
