"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnvironment } from "@/src/lib/supabase/config";

export function createSupabaseBrowserClient() {
  const environment = getSupabaseEnvironment();

  if (!environment) {
    return null;
  }

  return createBrowserClient(environment.url, environment.anonKey);
}
