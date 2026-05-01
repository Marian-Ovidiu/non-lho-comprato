import { PageHeader } from "@/src/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function StatsPage() {
  return (
    <main className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Statistiche"
        title="Analisi dei risparmi"
        description="Grafici e riepiloghi arriveranno nel prossimo step."
      />

      <Card className="border-dashed bg-white/80">
        <CardContent className="p-5 sm:p-6">
          <p className="text-sm leading-6 text-zinc-600">
            Per ora la parte analitica è in arrivo. Intanto puoi continuare a
            inserire movimenti e vedere il totale in dashboard.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
