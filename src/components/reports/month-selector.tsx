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
      className="rounded-2xl border border-border bg-surface p-4 shadow-sm dark:border-border dark:bg-accent sm:p-5"
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="month">Mese</Label>
          <select
            id="month"
            name="month"
            defaultValue={selectedMonth}
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-border focus:ring-2 focus:ring-border/40 dark:border-border dark:bg-accent dark:text-foreground dark:focus:border-border dark:focus:ring-border/40"
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


