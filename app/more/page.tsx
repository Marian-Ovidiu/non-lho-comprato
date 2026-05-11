import Link from "next/link";
import { BarChart3, Download, Layers3, MoonStar, Repeat2 } from "lucide-react";

import { PwaInstallContent } from "@/src/components/pwa/install-button";
import { PageHeader } from "@/src/components/layout/page-header";
import { ThemeSelector } from "@/src/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
          <Button asChild className="h-12 w-full rounded-2xl">
            <Link href={href}>{actionLabel}</Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-2xl"
            disabled={disabled}
          >
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function MorePage() {
  return (
    <main className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Menu"
        title="Altro"
        description="Strumenti e impostazioni"
      />

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground dark:text-foreground">
            Gestione quotidiana
          </h2>
          <p className="text-sm text-muted-text dark:text-muted-text">
            Le cose che usi più spesso nella giornata.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ToolCard
            href="/habits"
            label="Abitudini"
            description="Gestisci spese ricorrenti"
            icon={Repeat2}
            actionLabel="Apri abitudini"
          />
          <ToolCard
            href="/presets"
            label="Preset rapidi"
            description="Azioni veloci in un tap"
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
            I riepiloghi che ti aiutano a leggere il mese.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ToolCard
            href="/reports/monthly"
            label="Report mensile"
            description="Vedi il riepilogo del mese"
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
            Preferenze e installazione dell'app.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
                    Chiaro o scuro, salvato su questo dispositivo
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
                    Aggiungi l&apos;app alla schermata Home
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-4 sm:p-5 sm:pt-4">
              <PwaInstallContent />
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

