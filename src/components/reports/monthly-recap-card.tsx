"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MonthlyRecapCardProps = {
  recapText?: string | null;
};

export function MonthlyRecapCard({ recapText }: MonthlyRecapCardProps) {
  return (
    <Card className="border-border shadow-sm dark:border-border">
      <CardHeader className="space-y-1 p-4 pb-2.5 sm:p-5">
        <CardTitle className="text-base text-foreground dark:text-foreground">
          Recap mensile
        </CardTitle>
        <p className="text-sm text-muted-text dark:text-muted-text">
          Un testo pronto da leggere o condividere.
        </p>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-5">
        <p className="text-sm leading-6 text-foreground dark:text-muted-text">
          {recapText?.trim()
            ? recapText
            : "Nessun recap disponibile per questo mese."}
        </p>
      </CardContent>
    </Card>
  );
}
