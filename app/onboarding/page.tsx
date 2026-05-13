import { redirect } from "next/navigation";

import { getAuthenticatedUser, getCurrentWorkspace } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    redirect("/login");
  }

  await getCurrentWorkspace();

  // Workspace provisioning is complete here; the app continues on the home route.
  redirect("/?welcome=1");
}
