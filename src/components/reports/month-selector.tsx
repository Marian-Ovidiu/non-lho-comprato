import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type MonthOption = {
  value: string;
  label: string;
};

type MonthSelectorProps = {
  months: MonthOption[];
  selectedMonth: string;
};

export function MonthSelector({ months, selectedMonth }: MonthSelectorProps) {
  const options =
    months.length > 0
      ? months
      : [{ value: selectedMonth, label: selectedMonth || "Seleziona un mese" }];

  return (
    <form
      action="/reports/monthly"
      method="get"
      className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5"
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="month">Mese</Label>
          <select
            id="month"
            name="month"
            defaultValue={selectedMonth}
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
          >
            {options.map((option) => (
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
