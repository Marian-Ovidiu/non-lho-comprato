import { redirect } from "next/navigation";

import { CraftedOnboardingScreen } from "@/src/components/onboarding/crafted-onboarding-screen";
import { getAuthenticatedUser, getCurrentWorkspace } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    redirect("/login");
  }

  try {
    await getCurrentWorkspace();
  } catch (error) {
    console.error("Failed to load workspace on onboarding:", error);
  }

  return <CraftedOnboardingScreen />;
}
