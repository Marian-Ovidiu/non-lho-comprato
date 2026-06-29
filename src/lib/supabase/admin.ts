import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnvironment } from "@/src/lib/supabase/config";

function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
}

export function createSupabaseAdminClient() {
  const environment = getSupabaseEnvironment();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!environment || !serviceRoleKey) {
    return null;
  }

  return createClient(environment.url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Returns true when account deletion can safely proceed:
 * - Admin client is available (Supabase auth user will be deleted), OR
 * - We are not in production (local/test environments allow data-only deletion).
 *
 * In production without SUPABASE_SERVICE_ROLE_KEY the Supabase auth user would
 * survive the deletion, leaving the account half-deleted. We block early instead.
 */
export function isAdminDeletionAvailable(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
): boolean {
  if (adminClient !== null) return true;
  return process.env.NODE_ENV !== "production";
}
