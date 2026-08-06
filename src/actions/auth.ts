"use server";

import { getActionTranslations } from "@/src/lib/i18n/server";
import { redirect } from "next/navigation";
import { unstable_rethrow } from "next/navigation";

import { deleteAppAccountData } from "@/src/lib/account-deletion";
import { isAccountDeletionConfirmed } from "@/src/features/account/deletion-confirmation";
import { refreshSupabaseSessionForAction } from "@/src/lib/auth/action-session";
import { getCurrentUser } from "@/src/lib/auth/session";
import { prisma } from "@/src/lib/prisma";
import { createSupabaseAdminClient, isAdminDeletionAvailable } from "@/src/lib/supabase/admin";
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
  const t = await getActionTranslations();
  const understood = formData.get("understood") === "on";
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (!understood || !isAccountDeletionConfirmed(confirmation)) {
    return {
      success: false,
      message: t.account.deleteConfirmRequired,
    };
  }

  const authUser = await refreshSupabaseSessionForAction();

  if (!authUser) {
    return {
      success: false,
      message: "Sessione non valida. Accedi di nuovo prima di eliminare l'account.",
    };
  }

  const admin = createSupabaseAdminClient();

  if (!isAdminDeletionAvailable(admin)) {
    return {
      success: false,
      message:
        "Eliminazione account temporaneamente non disponibile. Contatta il supporto.",
    };
  }

  try {
    const appUser = await getCurrentUser();

    await prisma.$transaction(async (tx) => {
      await deleteAppAccountData(tx, appUser.id);
    });

    if (admin) {
      const { error } = await admin.auth.admin.deleteUser(authUser.id);

      if (error) {
        console.error("[account-deletion] Supabase auth user deletion failed", {
          code: error.code,
          status: error.status,
        });
      }
    }

    const supabase = await createSupabaseMutableClient();
    await supabase?.auth.signOut({ scope: "local" });
  } catch (error) {
    unstable_rethrow(error);
    console.error("Failed to delete account:", error);
    return {
      success: false,
      message: t.account.deleteFailed,
    };
  }

  redirect("/account-deleted");
}
