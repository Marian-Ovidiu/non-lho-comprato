import { redirect } from "next/navigation";

import { LoginPanel } from "@/src/components/auth/login-panel";
import { getAuthenticatedUser } from "@/src/lib/auth/session";

export default async function LoginPage() {
  const authUser = await getAuthenticatedUser();

  if (authUser) {
    redirect("/");
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <section className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-text">
            Non l&apos;ho comprato
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Accedi per sincronizzare i tuoi risparmi.
          </h1>
          <p className="text-sm leading-7 text-muted-text">
            Continua con Google per ritrovare il tuo lavoro su ogni
            dispositivo.
          </p>
        </div>

        <LoginPanel compact providers={["google"]} className="mx-auto w-full" />
      </section>
    </main>
  );
}
