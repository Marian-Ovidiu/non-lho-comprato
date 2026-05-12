"use server";

import { redirect } from "next/navigation";

import { createSupabaseMutableClient } from "@/src/lib/supabase/server";

export async function signOutAction() {
  const supabase = await createSupabaseMutableClient();

  if (supabase) {
    await supabase.auth.signOut({ scope: "local" });
  }

  redirect("/");
}
