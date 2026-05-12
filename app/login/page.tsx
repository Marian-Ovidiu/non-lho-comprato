import { redirect } from "next/navigation";

import { LoginPanel } from "@/src/components/auth/login-panel";
import { PageHeader } from "@/src/components/layout/page-header";
import { getAuthenticatedUser } from "@/src/lib/auth/session";

export default async function LoginPage() {
  const authUser = await getAuthenticatedUser();

  if (authUser) {
    redirect("/");
  }

  return (
    <main className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Accesso"
        title="Accedi"
        description="Collega il tuo account per preparare il passaggio ai multi-account."
      />

      <LoginPanel />
    </main>
  );
}
