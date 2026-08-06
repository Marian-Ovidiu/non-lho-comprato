import { redirect, unstable_rethrow } from "next/navigation";

import { CraftedOnboardingScreen } from "@/src/components/onboarding/crafted-onboarding-screen";
import { getAuthenticatedUser, getCurrentWorkspace } from "@/src/lib/auth/session";
import {
  getCurrentWorkspaceMembers,
  isWorkspaceSetupNeeded,
} from "@/src/lib/workspace-context";

const FALLBACK_TIMEZONE = "Europe/Rome";
const FALLBACK_CURRENCY = "EUR";
const FALLBACK_LANGUAGE = "it";

export default async function OnboardingPage() {
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    redirect("/login");
  }

  let timezone = FALLBACK_TIMEZONE;
  let currency = FALLBACK_CURRENCY;
  let language = FALLBACK_LANGUAGE;
  let memberCount = 1;
  let alreadyOnboarded = false;

  try {
    const [workspace, members, setupNeeded] = await Promise.all([
      getCurrentWorkspace(),
      getCurrentWorkspaceMembers(),
      isWorkspaceSetupNeeded(),
    ]);
    timezone = workspace.timezone ?? FALLBACK_TIMEZONE;
    currency = workspace.currency ?? FALLBACK_CURRENCY;
    language = workspace.language ?? FALLBACK_LANGUAGE;
    memberCount = members.length;
    alreadyOnboarded = !setupNeeded;
  } catch (error) {
    unstable_rethrow(error);
    // I default reggono l'ingresso: meglio un onboarding con impostazioni
    // predefinite che una schermata di errore al primo accesso.
    console.error("Failed to load workspace on onboarding:", error);
  }

  // Ogni login passa da qui, non solo il primo: chi ha già fatto l'ingresso
  // va dritto alla dashboard invece di rivedere i tre passi.
  if (alreadyOnboarded) {
    redirect("/");
  }

  return (
    <CraftedOnboardingScreen
      defaultTimezone={timezone}
      defaultCurrency={currency}
      defaultLanguage={language}
      canInvite={memberCount < 2}
    />
  );
}
