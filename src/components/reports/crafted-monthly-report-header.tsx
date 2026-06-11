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
      <section className="px-5 pt-5 pb-4">
        <Label className="mb-4 block">Report — {monthLabel.toLowerCase()}</Label>
        <CraftedMonthSelector months={months} selectedMonth={selectedMonth} />
      </section>
      <Rule />

      {report.hasData ? (
        <>
          <section className="px-5 py-6">
            <Label className="mb-3 block">Speso nel mese</Label>
            <div className="flex items-start gap-1.5">
              <Mono className="text-[clamp(2.5rem,12vw,3.75rem)] font-semibold leading-[0.85] tracking-[-0.05em]">
                {hero.whole}
              </Mono>
              <Mono className="mt-1.5 text-2xl text-muted-foreground">,{hero.decimals}€</Mono>
            </div>
          </section>
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
                label: "Efficienza",
                value: `${Math.round(report.overview?.savingRatePercent ?? 0)}%`,
              },
            ]}
          />
          <Rule />
        </>
      ) : (
        <section className="px-5 py-10 text-center">
          <Serif className="text-lg text-muted-foreground">Nessun report disponibile.</Serif>
          <p className="mt-2 text-sm text-ink-3">
            Appena ci saranno movimenti nel mese selezionato, il riepilogo comparirà qui.
          </p>
        </section>
      )}
    </div>
  );
}
