"use server";

import { redirect } from "next/navigation";
import { unstable_rethrow } from "next/navigation";

import { deleteAppAccountData } from "@/src/lib/account-deletion";
import { refreshSupabaseSessionForAction } from "@/src/lib/auth/action-session";
import { getCurrentUser } from "@/src/lib/auth/session";
import { prisma } from "@/src/lib/prisma";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { createSupabaseMutableClient } from "@/src/lib/supabase/server";

export type DeleteAccountState = {
  success: boolean;
  message: string;
};

export async function signOutAction() {
  const supabase = await createSupabaseMutableClient();

  if (supabase) {
    await supabase.auth.signOut({ scope: "local" });
  }

  redirect("/");
}

export async function deleteAccountAction(
  _previousState: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const understood = formData.get("understood") === "on";
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (!understood || confirmation !== "ELIMINA") {
    return {
      success: false,
      message: "Conferma l'azione e scrivi ELIMINA per procedere.",
    };
  }

  const authUser = await refreshSupabaseSessionForAction();

  if (!authUser) {
    return {
      success: false,
      message: "Sessione non valida. Accedi di nuovo prima di eliminare l'account.",
    };
  }

  try {
    const appUser = await getCurrentUser();

    await prisma.$transaction(async (tx) => {
      await deleteAppAccountData(tx, appUser.id);
    });

    const admin = createSupabaseAdminClient();

    if (admin) {
      const { error } = await admin.auth.admin.deleteUser(authUser.id);

      if (error) {
        console.error("[account-deletion] Supabase auth user deletion failed", {
          code: error.code,
          status: error.status,
        });
      }
    } else {
      console.warn(
        "[account-deletion] SUPABASE_SERVICE_ROLE_KEY missing; app data deleted and local session signed out.",
      );
    }

    const supabase = await createSupabaseMutableClient();
    await supabase?.auth.signOut({ scope: "local" });
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to delete account:", error);
    return {
      success: false,
      message: "Non riesco a eliminare l'account adesso. Riprova tra poco.",
    };
  }

  redirect("/account-deleted");
}
