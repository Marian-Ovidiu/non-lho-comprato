import Link from "next/link";

import { CraftedIcon, Label, Serif } from "@/components/crafted";

export default function AccountDeletedPage() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col justify-center px-5 py-10">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <CraftedIcon name="check" size={18} className="text-accent" />
          <Label>Account eliminato</Label>
        </div>
        <div className="space-y-3">
          <h1 className="text-[clamp(2.5rem,12vw,4rem)] font-bold leading-[0.95] tracking-[-0.045em]">
            I tuoi dati sono stati eliminati.
          </h1>
          <Serif className="block max-w-lg text-base leading-7 text-muted-foreground">
            La sessione e stata chiusa. Se hai bisogno di assistenza sulla
            cancellazione dati, usa il contatto indicato nella pagina pubblica.
          </Serif>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="flex h-[52px] items-center justify-center rounded-2xl bg-accent px-5 text-[15px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
          >
            Torna alla homepage
          </Link>
          <Link
            href="/delete-account"
            className="flex h-[52px] items-center justify-center rounded-2xl border border-line px-5 text-[15px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Informazioni cancellazione
          </Link>
        </div>
      </div>
    </main>
  );
}
