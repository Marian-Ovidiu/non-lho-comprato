import { Label, Mono, Rule, Serif, StatTrio } from "@/components/crafted";
import { CraftedMonthSelector } from "@/src/components/reports/crafted-month-selector";
import { formatCraftedCompact, splitCraftedAmount } from "@/src/lib/crafted-money";
import type { MonthlyReportData } from "@/src/actions/reports";

type CraftedMonthlyReportHeaderProps = {
  report: MonthlyReportData;
  months: Array<{ value: string; label: string }>;
  selectedMonth: string;
};

export function CraftedMonthlyReportHeader({
  report,
  months,
  selectedMonth,
}: CraftedMonthlyReportHeaderProps) {
  const hero = splitCraftedAmount(report.overview?.totalRealSpent ?? 0);
  const monthLabel =
    months.find((month) => month.value === selectedMonth)?.label ?? "Mese";

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <section className="px-[var(--sp-page-x)] pb-4 pt-[var(--sp-section-y)]">
        <Label className="mb-4 block">Report — {monthLabel.toLowerCase()}</Label>
        <CraftedMonthSelector months={months} selectedMonth={selectedMonth} />
      </section>
      <Rule />

      {report.hasData ? (
        <>
          <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
            <Label className="mb-3 block">Speso nel mese</Label>
            <div className="flex items-start gap-1.5">
              <Mono className="text-[clamp(2.5rem,12vw,3.75rem)] font-semibold leading-[0.85] tracking-[-0.05em]">
                {hero.whole}
              </Mono>
              <Mono className="mt-1.5 text-2xl text-muted-foreground">,{hero.decimals}€</Mono>
            </div>
          </section>
          <details>
            <summary className="flex cursor-pointer list-none items-center justify-between border-t border-line-soft px-[var(--sp-page-x)] py-[var(--sp-row-y)] font-num text-[10px] uppercase tracking-[0.22em] text-ink-3 hover:text-foreground [&::-webkit-details-marker]:hidden">
              <span>Riepilogo del mese</span>
              <span className="text-sm leading-none text-ink-3" aria-hidden="true">⌄</span>
            </summary>
            <StatTrio
              items={[
                {
                  label: "Impatto netto",
                  value: formatCraftedCompact(report.overview?.totalSaved ?? 0),
                  suffix: "€",
                },
                {
                  label: "Movimenti",
                  value: report.overview?.entriesCount ?? 0,
                },
                {
                  label: "Indice netto",
                  value: `${Math.round(report.overview?.savingRatePercent ?? 0)}%`,
                },
              ]}
            />
          </details>
          <Rule />
        </>
      ) : (
        <section className="px-[var(--sp-page-x)] py-16 text-center">
          <Serif className="text-lg text-muted-foreground">Nessun report disponibile.</Serif>
          <p className="mt-2 text-sm text-ink-3">
            Appena ci saranno movimenti nel mese selezionato, il riepilogo comparirà qui.
          </p>
        </section>
      )}
    </div>
  );
}
