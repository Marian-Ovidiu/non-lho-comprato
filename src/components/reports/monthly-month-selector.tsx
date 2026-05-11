import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import type { MonthlyReportMonthOption } from "@/src/actions/reports";

type MonthlyMonthSelectorProps = {
  selectedMonth: string;
  monthOptions: MonthlyReportMonthOption[];
};

export function MonthlyMonthSelector({
  selectedMonth,
  monthOptions,
}: MonthlyMonthSelectorProps) {
  return (
    <form
      action="/reports/monthly"
      method="get"
      className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="month">Mese</Label>
          <select
            id="month"
            name="month"
            defaultValue={selectedMonth}
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" className="w-full sm:w-auto">
          Mostra
        </Button>
      </div>
    </form>
  );
}
