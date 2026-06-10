/*
================================================================================
NEW SUPABASE / CLONE ONLY - DO NOT RUN ON OLD PRODUCTION
================================================================================

Purpose:
  Relink existing application users to new Supabase auth.users rows by email.

Safety contract:
  - Intended only after restoring repaired app data into a NEW Supabase project
    or a local/staging clone.
  - Do not run on the old production Supabase project.
  - Updates only public."User"."supabaseId".
  - Does not change public."User".id.
  - Does not touch Entry, WorkspaceMember, EntryBeneficiary, Goal, QuickPreset,
    Workspace, Category, or auth.users.
  - Does not create application users automatically.
  - Aborts on duplicate emails in public."User" or auth.users.
  - Aborts if public."User"."supabaseId" does not exist.

Prerequisite:
  The new Supabase project must already contain auth.users rows for Marian,
  Martina, and the friend, created by logging in with their final providers.

================================================================================
*/

BEGIN;

DO $$
DECLARE
  app_duplicate_count integer;
  auth_duplicate_count integer;
  matched_count integer;
  updated_count integer;
BEGIN
  IF to_regclass('public."User"') IS NULL THEN
    RAISE EXCEPTION 'Missing required table public."User". Aborting user relink.';
  END IF;

  IF to_regclass('auth.users') IS NULL THEN
    RAISE EXCEPTION 'Missing required table auth.users. Aborting user relink.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'supabaseId'
  ) THEN
    RAISE EXCEPTION 'Missing required column public."User"."supabaseId". Run the schema migration that adds it before relinking users.';
  END IF;

  SELECT COUNT(*)
  INTO app_duplicate_count
  FROM (
    SELECT lower(email) AS normalized_email
    FROM public."User"
    WHERE email IS NOT NULL
    GROUP BY lower(email)
    HAVING COUNT(*) > 1
  ) duplicates;

  IF app_duplicate_count > 0 THEN
    RAISE EXCEPTION 'Duplicate emails found in public."User" (% rows). Resolve manually before relinking.', app_duplicate_count;
  END IF;

  SELECT COUNT(*)
  INTO auth_duplicate_count
  FROM (
    SELECT lower(email) AS normalized_email
    FROM auth.users
    WHERE email IS NOT NULL
    GROUP BY lower(email)
    HAVING COUNT(*) > 1
  ) duplicates;

  IF auth_duplicate_count > 0 THEN
    RAISE EXCEPTION 'Duplicate emails found in auth.users (% rows). Resolve manually before relinking.', auth_duplicate_count;
  END IF;

  SELECT COUNT(*)
  INTO matched_count
  FROM public."User" u
  JOIN auth.users au ON lower(au.email) = lower(u.email)
  WHERE u.email IS NOT NULL
    AND au.email IS NOT NULL;

  RAISE NOTICE 'Matched application users by email: %', matched_count;

  UPDATE public."User" AS u
  SET "supabaseId" = au.id::text
  FROM auth.users AS au
  WHERE u.email IS NOT NULL
    AND au.email IS NOT NULL
    AND lower(u.email) = lower(au.email)
    AND u."supabaseId" IS DISTINCT FROM au.id::text;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated public."User"."supabaseId" rows: %', updated_count;
END $$;

COMMIT;
