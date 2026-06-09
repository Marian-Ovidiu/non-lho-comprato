import { createSupabaseMutableClient } from "@/src/lib/supabase/server";

export async function refreshSupabaseSessionForAction() {
  const supabase = await createSupabaseMutableClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}
