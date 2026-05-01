import { PageHeader } from "@/src/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function HabitsPage() {
  return (
    <main className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Abitudini"
        title="Abitudini ricorrenti"
        description="La gestione delle abitudini arriverà nel prossimo step."
      />

      <Card className="border-dashed bg-white/80">
        <CardContent className="p-5 sm:p-6">
          <p className="text-sm leading-6 text-zinc-600">
            Qui potrai tracciare le spese che tornano ogni settimana, come il
            caffè o i piccoli extra del giorno.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
