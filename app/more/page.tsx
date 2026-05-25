import Link from "next/link";
import { BarChart3, Download, Layers3, MoonStar, Repeat2 } from "lucide-react";

import { signOutAction } from "@/src/actions/auth";
import { getAuthenticatedUser, getCurrentWorkspace } from "@/src/lib/auth/session";
import { AiAnalysisExportCard } from "@/src/components/more/ai-analysis-export-card";
import { PwaInstallContent } from "@/src/components/pwa/install-button";
import { PageHeader } from "@/src/components/layout/page-header";
import { ThemeSelector } from "@/src/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type ToolCardProps = {
  href?: string;
  label: string;
  description: string;
  icon: typeof Repeat2;
  actionLabel?: string;
  disabled?: boolean;
};

function ToolCard({
  href,
  label,
  description,
  icon: Icon,
  actionLabel = "Apri",
  disabled = false,
}: ToolCardProps) {
  return (
    <Card className="overflow-hidden border-border shadow-sm dark:border-border">
      <CardHeader className="space-y-3 p-4 pb-0 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-background dark:bg-surface dark:text-foreground">
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base text-foreground dark:text-foreground">
              {label}
            </CardTitle>
            <p className="text-sm leading-6 text-muted-text dark:text-muted-text">
              {description}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-4 sm:p-5 sm:pt-4">
        {href ? (
          <Button asChild className="h-10 w-full rounded-2xl px-4">
            <Link href={href}>{actionLabel}</Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-2xl"
            disabled={disabled}
          >
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default async function MorePage() {
  const authUser = await getAuthenticatedUser();
  let workspace = null as Awaited<ReturnType<typeof getCurrentWorkspace>> | null;

  try {
    workspace = await getCurrentWorkspace();
  } catch {
    workspace = null;
  }

  const profileLabel = authUser?.name ?? authUser?.email ?? "Account";
  const workspaceLabel = workspace
    ? workspace.kind === "shared"
      ? "Condiviso"
      : "Privato"
    : "Nessun workspace";
  const workspaceInitials = workspace
    ? workspace.name
        .split(" ")
        .map((part) => part.trim().charAt(0))
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "NL";

  return (
    <main className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="Profilo"
        title="Altro"
        serifWord="e impostazioni."
        chips={[
          { label: "Profilo", tone: "warm" },
          { label: "App", tone: "default" },
        ]}
      />

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground dark:text-foreground">
            Profilo
          </h2>
          <p className="text-sm text-muted-text dark:text-muted-text">
            Account e workspace in un unico posto.
          </p>
        </div>

        {workspace ? (
          <Card className="overflow-hidden border-border shadow-sm dark:border-border">
            <CardHeader className="space-y-3 p-4 pb-0 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface text-xs font-semibold text-foreground">
                  {workspaceInitials}
                </div>
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-base text-foreground dark:text-foreground">
                    {profileLabel}
                  </CardTitle>
                  <p className="text-sm leading-6 text-muted-text dark:text-muted-text">
                    {workspace.name} <span aria-hidden="true">·</span>{" "}
                    {workspaceLabel}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-3 p-4 pt-4 sm:p-5 sm:pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-text">
                  Workspace
                </span>
                <span className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-text">
                  {workspaceLabel}
                </span>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  variant="outline"
                  className="h-10 w-full rounded-2xl px-4 sm:w-auto"
                >
                  <Link href="/invite">Invita una persona</Link>
                </Button>

                <form action={signOutAction}>
                  <Button
                    type="submit"
                    variant="outline"
                    className="h-10 w-full rounded-2xl px-4 sm:w-auto"
                  >
                    Esci
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden border-border shadow-sm dark:border-border">
            <CardHeader className="space-y-3 p-4 pb-0 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface text-xs font-semibold text-foreground">
                  NL
                </div>
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-base text-foreground dark:text-foreground">
                    Profilo
                  </CardTitle>
                  <p className="text-sm leading-6 text-muted-text dark:text-muted-text">
                    Accesso non disponibile. Vai alla schermata di login.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-4 sm:p-5 sm:pt-4">
              <Button asChild className="h-10 w-full rounded-2xl px-4 sm:w-auto">
                <Link href="/login">Accedi</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground dark:text-foreground">
            Gestione quotidiana
          </h2>
          <p className="text-sm text-muted-text dark:text-muted-text">
            Le cose che usi ogni giorno.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ToolCard
            href="/habits"
            label="Abitudini"
            description="Spese ricorrenti e ripetute"
            icon={Repeat2}
            actionLabel="Apri abitudini"
          />
          <ToolCard
            href="/presets"
            label="Preset rapidi"
            description="Modelli veloci in un tap"
            icon={Layers3}
            actionLabel="Apri preset"
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground dark:text-foreground">
            Analisi
          </h2>
          <p className="text-sm text-muted-text dark:text-muted-text">
            I riepiloghi del mese.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ToolCard
            href="/reports/monthly"
            label="Report mensile"
            description="Riepilogo del mese"
            icon={BarChart3}
            actionLabel="Apri report"
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground dark:text-foreground">
            App
          </h2>
          <p className="text-sm text-muted-text dark:text-muted-text">
            Preferenze e installazione.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card className="overflow-hidden border-border shadow-sm dark:border-border">
            <CardHeader className="space-y-3 p-4 pb-0 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-background dark:bg-surface dark:text-foreground">
                  <MoonStar className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-base text-foreground dark:text-foreground">
                    Tema
                  </CardTitle>
                  <p className="text-sm leading-6 text-muted-text dark:text-muted-text">
                    Chiaro o scuro, salvato su questo dispositivo.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-4 sm:p-5 sm:pt-4">
              <ThemeSelector />
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border shadow-sm dark:border-border">
            <CardHeader className="space-y-3 p-4 pb-0 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-background dark:bg-surface dark:text-foreground">
                  <Download className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-base text-foreground dark:text-foreground">
                    Installa app
                  </CardTitle>
                  <p className="text-sm leading-6 text-muted-text dark:text-muted-text">
                    Aggiungi l&apos;app alla schermata Home.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-4 sm:p-5 sm:pt-4">
              <PwaInstallContent />
            </CardContent>
          </Card>

          <AiAnalysisExportCard />
        </div>
      </section>
    </main>
  );
}
