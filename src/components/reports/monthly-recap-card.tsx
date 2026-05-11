import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MonthlyRecapCardProps = {
  recapText?: string | null;
};

export function MonthlyRecapCard({ recapText }: MonthlyRecapCardProps) {
  return (
    <Card className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
      <CardHeader className="space-y-1 p-5 pb-3">
        <CardTitle className="text-base text-zinc-950 dark:text-zinc-50">
          Recap mensile
        </CardTitle>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Un testo pronto da leggere o condividere.
        </p>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <p className="text-sm leading-7 text-zinc-700 dark:text-zinc-300">
          {recapText?.trim()
            ? recapText
            : "Nessun recap disponibile per questo mese."}
        </p>
      </CardContent>
    </Card>
  );
}
