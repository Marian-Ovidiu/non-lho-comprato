"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CraftedOdometer } from "@/components/crafted/motion";
import type { WorkspaceBalanceCardState } from "@/src/lib/workspace-balance";
import { useTranslations } from "@/src/components/language/language-context";

type CoupleBalanceCardProps = {
  balance: WorkspaceBalanceCardState;
};

export function CoupleBalanceCard({ balance }: CoupleBalanceCardProps) {
  const t = useTranslations();
  const counterpartLabel = balance.counterpartLabel ?? "";
  const headline = !balance.supported
    ? t.coupleBalance.notSupported
    : balance.status === "balanced"
      ? t.coupleBalance.balanced
      : balance.status === "they-owe"
        ? t.coupleBalance.theyOwe(counterpartLabel)
        : t.coupleBalance.youOwe(counterpartLabel);
  const detail = !balance.supported
    ? t.coupleBalance.notSupported
    : t.coupleBalance.sharedOnly;

  return (
    <Card className="overflow-hidden border-border shadow-sm dark:border-border">
      <CardContent className="space-y-2 p-4 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-text">
          {t.dashboard.coupleBalance}
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
