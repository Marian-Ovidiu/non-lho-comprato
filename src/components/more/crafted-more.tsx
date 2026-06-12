import Link from "next/link";

import { signOutAction } from "@/src/actions/auth";
import { CraftedIcon, Label, Rule, Serif, StatTrio } from "@/components/crafted";
import { CraftedMoreRow, CraftedMoreSection } from "@/src/components/more/crafted-more-row";
import { formatCraftedCompact } from "@/src/lib/crafted-money";
import { cn } from "@/lib/utils";

type WorkspaceNextStep = {
  title: string;
  description: string;
  actionLabel: string;
  href: string;
};

export type CraftedMoreProps = {
  profileLabel: string;
  workspaceName: string | null;
  workspaceLabel: string;
  workspaceInitials: string;
  isAuthenticated: boolean;
  monthSaved: number;
  entriesCount: number;
  streak: number;
  workspaceNextStep: WorkspaceNextStep | null;
  showWorkspaceTools: boolean;
  workspaceSection: React.ReactNode;
  appSection: React.ReactNode;
};

export function CraftedMore({
  profileLabel,
  workspaceName,
  workspaceLabel,
  workspaceInitials,
  isAuthenticated,
  monthSaved,
  entriesCount,
  streak,
  workspaceNextStep,
  showWorkspaceTools,
  workspaceSection,
  appSection,
}: CraftedMoreProps) {
  return (
    <div className="-mx-4 pb-6 sm:-mx-6 lg:-mx-8">
      <section className="px-5 py-6">
        <Label className="mb-4 block">Profilo</Label>
        <div className="flex items-start gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center border border-line text-xs font-semibold tracking-[0.08em]">
            {workspaceInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[22px] font-semibold tracking-[-0.02em]">{profileLabel}</p>
            {workspaceName ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {workspaceName} · {workspaceLabel}
              </p>
            ) : (
              <Serif className="mt-1 block text-sm text-ink-3">
                Accedi per sincronizzare i tuoi segnali.
              </Serif>
            )}
          </div>
          <CraftedIcon name="flame" size={18} className="mt-1 shrink-0 text-accent" />
        </div>
      </section>

      {isAuthenticated ? (
        <>
          <StatTrio
            items={[
              {
                label: "Impatto netto",
                value: formatCraftedCompact(monthSaved),
                suffix: "€",
              },
              {
                label: "Movimenti",
                value: entriesCount,
              },
              {
                label: "Streak",
                value: streak,
              },
            ]}
          />
          <Rule />
        </>
      ) : null}

      {!isAuthenticated ? (
        <section className="px-5 py-6">
          <Link
            href="/login"
            className="flex h-[54px] w-full items-center justify-center rounded-2xl bg-accent text-[15.5px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
          >
            Accedi
          </Link>
        </section>
      ) : null}

      {workspaceNextStep ? (
        <>
          <CraftedMoreSection title="Prossimo passo">
            <div className="border-y border-line py-4">
              <p className="text-[15px] font-medium">{workspaceNextStep.title}</p>
              <Serif className="mt-1 block text-sm text-ink-3">
                {workspaceNextStep.description}
              </Serif>
              <Link
                href={workspaceNextStep.href}
                className="mt-3 inline-flex text-sm font-semibold text-accent"
              >
                {workspaceNextStep.actionLabel}
              </Link>
            </div>
          </CraftedMoreSection>
          <Rule />
        </>
      ) : null}

      {showWorkspaceTools ? (
        <>
          <CraftedMoreSection title="Workspace">
            <div className="divide-y divide-line-soft border-y border-line">
              <CraftedMoreRow
                href="/workspace/members"
                label="Partecipanti"
                detail="Invita o gestisci le persone"
                icon="shield"
              />
              <CraftedMoreRow
                href="/workspace/new"
                label="Crea workspace"
                detail="Spazio condiviso per la coppia o il team"
                icon="target"
              />
              <div className="py-3.5">{workspaceSection}</div>
            </div>
          </CraftedMoreSection>
          <Rule />
        </>
      ) : null}

      <CraftedMoreSection title="Gestione">
        <div className="divide-y divide-line-soft border-y border-line">
          <CraftedMoreRow
            href="/habits"
            label="Ricorrenti"
            detail="Spese previste da tenere d'occhio"
            icon="coffee"
          />
          <CraftedMoreRow
            href="/presets"
            label="Preset rapidi"
            detail="Modelli veloci in un tap"
            icon="receipt"
          />
          <CraftedMoreRow
            href="/goals"
            label="Obiettivi"
            detail="Mete alimentate dall'impatto positivo"
            icon="target"
          />
        </div>
      </CraftedMoreSection>
      <Rule />

      <CraftedMoreSection title="Analisi">
        <div className="border-y border-line">
          <CraftedMoreRow
            href="/reports/monthly"
            label="Report mensile"
            detail="Riepilogo del mese in PDF"
            icon="arrowUp"
          />
        </div>
      </CraftedMoreSection>
      <Rule />

      <CraftedMoreSection title="App">{appSection}</CraftedMoreSection>

      {isAuthenticated ? (
        <>
          <Rule className="mt-5" />
          <form action={signOutAction} className="px-5 py-5">
            <button
              type="submit"
              className={cn(
                "w-full border border-line py-3.5 text-sm font-medium text-muted-foreground",
                "transition-colors hover:text-foreground",
              )}
            >
              Esci
            </button>
          </form>
        </>
      ) : null}
    </div>
  );
}
