import { redirect } from "next/navigation";

import { LoginPanel } from "@/src/components/auth/login-panel";
import { getAuthenticatedUser } from "@/src/lib/auth/session";

export default async function LoginPage() {
  const authUser = await getAuthenticatedUser();

  if (authUser) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md items-center px-5 py-8 sm:px-6 lg:px-8">
      <section className="w-full space-y-6 text-center">
        <div className="space-y-2.5">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-text">
            Non l&apos;ho comprato
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-[2.5rem] lg:leading-tight">
            Accedi per sincronizzare i tuoi risparmi.
          </h1>
          <p className="mx-auto max-w-sm text-sm leading-6 text-muted-text sm:text-base sm:leading-7">
            Continua con Google per ritrovare il tuo lavoro su ogni
            dispositivo.
          </p>
        </div>

        <LoginPanel compact providers={["google"]} className="mx-auto w-full" />
      </section>
    </main>
  );
}
