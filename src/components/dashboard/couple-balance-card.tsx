import { Card, CardContent } from "@/components/ui/card";
import { CraftedOdometer } from "@/components/crafted/motion";
import type { WorkspaceBalanceCardState } from "@/src/lib/workspace-balance";

type CoupleBalanceCardProps = {
  balance: WorkspaceBalanceCardState;
};

export function CoupleBalanceCard({ balance }: CoupleBalanceCardProps) {
  const counterpartLabel = balance.counterpartLabel ?? "l'altra persona";
  const headline = !balance.supported
    ? "Bilancio disponibile solo per spazi condivisi a 2 persone"
    : balance.status === "balanced"
      ? "Siete in pari"
      : balance.status === "they-owe"
        ? `${counterpartLabel} ti deve`
        : `Devi a ${counterpartLabel}`;
  const detail = !balance.supported
    ? "La card si attiva solo quando il workspace ha esattamente due persone."
    : "Calcolato solo sulle spese condivise.";

  return (
    <Card className="overflow-hidden border-border shadow-sm dark:border-border">
      <CardContent className="space-y-2 p-4 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-text">
          Bilancio coppia
        </p>
        <p className="text-lg font-semibold tracking-tight text-foreground">
          {headline}
        </p>
        {balance.supported && balance.status !== "balanced" ? (
          <CraftedOdometer
            value={balance.amount}
            integerClassName="text-[34px] font-semibold leading-none tracking-[-0.05em]"
            fractionWrapperClassName="mt-0.5"
            fractionClassName="text-base font-medium text-muted-text"
            suffixClassName="text-base font-medium text-accent"
          />
        ) : null}
        <p className="text-sm leading-6 text-muted-text">{detail}</p>
      </CardContent>
    </Card>
  );
}
