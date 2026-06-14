import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnvironment } from "@/src/lib/supabase/config";

export function createSupabaseAdminClient() {
  const environment = getSupabaseEnvironment();

  if (!environment?.serviceRoleKey) {
    return null;
  }

  return createClient(environment.url, environment.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
