import { EmptyState } from "@/src/components/shared/empty-state";

export function StatsEmptyState() {
  return (
    <EmptyState
      title="Ancora nessun dato."
      description="Aggiungi i primi movimenti e qui compariranno le tendenze del mese."
      note="Bastano pochi dati per iniziare a leggere il quadro."
      actionLabel="Aggiungi il primo movimento"
      actionHref="/entries/new"
    />
  );
}
