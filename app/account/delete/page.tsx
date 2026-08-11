import { redirect } from "next/navigation";

import { Label, Rule, Serif } from "@/components/crafted";
import { DeleteAccountForm } from "@/src/components/account/delete-account-form";
import { CraftedSubpageHeader } from "@/src/components/layout/crafted-subpage-header";
import { getAuthenticatedUser } from "@/src/lib/auth/session";


export default async function DeleteAccountPage() {
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    redirect("/login");
  }

  return (
    <main className="pb-6">
      <CraftedSubpageHeader
        backHref="/more"
        eyebrow="Account"
        title="Elimina account"
        context="Questo percorso elimina il tuo account e i dati collegati. Non e una disattivazione temporanea."
      />

      <Rule />

      <section className="-mx-4 px-5 py-6 sm:-mx-6 lg:-mx-8">
        <Label className="mb-4 block">Prima di continuare</Label>
        <div className="space-y-4 border-y border-line py-4">
          <p className="text-[15px] leading-7 text-foreground">
            L&apos;eliminazione e permanente. Verranno cancellati il profilo
            dell&apos;app, i workspace personali, movimenti, categorie, abitudini,
            obiettivi e impostazioni associati al tuo account.
          </p>
          <Serif className="block text-sm leading-6 text-muted-foreground">
            Nei workspace condivisi, per non rompere i dati degli altri membri,
            rimuoviamo la tua membership e i riferimenti diretti al tuo account.
            I contenuti condivisi possono restare visibili agli altri membri
            senza il tuo profilo collegato.
          </Serif>
          <p className="text-sm leading-6 text-muted-foreground">
            Alcune informazioni tecniche o di sicurezza possono essere conservate
            solo quando necessario per obblighi legali, prevenzione abusi o log
            operativi essenziali.
          </p>
        </div>
      </section>

      <section className="-mx-4 px-5 py-6 sm:-mx-6 lg:-mx-8">
        <Label className="mb-4 block">Conferma</Label>
        <DeleteAccountForm />
      </section>
    </main>
  );
}
