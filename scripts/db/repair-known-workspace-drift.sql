-- Phase 1C known workspace drift repair.
-- MUTATIVE: run only on a restored local clone, staging, or new Supabase target after migrations.
-- DO NOT RUN ON OLD PRODUCTION.
-- This script intentionally repairs exactly one known Entry and is idempotent.

BEGIN;

SELECT 'repair_known_workspace_drift_before' AS section;

SELECT
  e.id AS entry_id,
  e.title,
  e."workspaceId" AS entry_workspace_id,
  e."categoryId",
  c."workspaceId" AS category_workspace_id,
  CASE
    WHEN e.id IS NULL THEN 'target_entry_missing'
    WHEN e."workspaceId" IS NULL AND c.id IS NOT NULL AND c."workspaceId" = 'legacy-marian-martina' THEN 'eligible_for_repair'
    WHEN e."workspaceId" = 'legacy-marian-martina' THEN 'already_repaired'
    ELSE 'not_eligible_manual_review_required'
  END AS repair_status
FROM (SELECT 'cmplbqbg4000a04i9mbuxbe7x'::text AS id) target
LEFT JOIN "Entry" e ON e.id = target.id
LEFT JOIN "Category" c ON c.id = e."categoryId";

WITH repaired AS (
  UPDATE "Entry" e
  SET "workspaceId" = 'legacy-marian-martina'
  FROM "Category" c
  WHERE e.id = 'cmplbqbg4000a04i9mbuxbe7x'
    AND e."workspaceId" IS NULL
    AND c.id = e."categoryId"
    AND c."workspaceId" = 'legacy-marian-martina'
  RETURNING e.id, e.title, e."workspaceId"
)
SELECT 'repair_known_workspace_drift_updated_rows' AS check_name, COUNT(*) AS updated_rows
FROM repaired;

SELECT 'repair_known_workspace_drift_after' AS section;

SELECT
  e.id AS entry_id,
  e.title,
  e."workspaceId" AS entry_workspace_id,
  e."categoryId",
  c."workspaceId" AS category_workspace_id,
  CASE
    WHEN e.id IS NULL THEN 'target_entry_missing'
    WHEN e."workspaceId" = 'legacy-marian-martina' AND c."workspaceId" = 'legacy-marian-martina' THEN 'repaired_or_already_clean'
    ELSE 'manual_review_required'
  END AS repair_status
FROM (SELECT 'cmplbqbg4000a04i9mbuxbe7x'::text AS id) target
LEFT JOIN "Entry" e ON e.id = target.id
LEFT JOIN "Category" c ON c.id = e."categoryId";

COMMIT;
