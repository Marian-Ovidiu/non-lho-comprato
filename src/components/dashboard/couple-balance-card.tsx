import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";
import type { WorkspaceBalanceCardState } from "@/src/lib/workspace-balance";

type CoupleBalanceCardProps = {
  balance: WorkspaceBalanceCardState;
};

export function CoupleBalanceCard({ balance }: CoupleBalanceCardProps) {
  const headline =
    !balance.supported
      ? "Bilancio disponibile solo per spazi condivisi a 2 persone"
      : balance.status === "balanced"
        ? "Siete in pari"
        : balance.status === "they-owe"
          ? `${balance.counterpartLabel ?? "L'altra persona"} ti deve ${formatMoney(balance.amount)}`
          : `Devi ${formatMoney(balance.amount)} a ${balance.counterpartLabel ?? "l'altra persona"}`;

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
        <p className="text-sm leading-6 text-muted-text">{detail}</p>
      </CardContent>
    </Card>
  );
}
