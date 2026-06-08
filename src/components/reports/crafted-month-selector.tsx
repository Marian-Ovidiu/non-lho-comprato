import { Label } from "@/components/crafted";

type MonthOption = {
  value: string;
  label: string;
};

type CraftedMonthSelectorProps = {
  months: MonthOption[];
  selectedMonth: string;
};

export function CraftedMonthSelector({ months, selectedMonth }: CraftedMonthSelectorProps) {
  const options =
    months.length > 0
      ? months
      : [{ value: selectedMonth, label: selectedMonth || "Seleziona un mese" }];

  return (
    <form action="/reports/monthly" method="get" className="flex items-end gap-4 border-y border-line py-3">
      <div className="min-w-0 flex-1">
        <select
          id="month"
          name="month"
          defaultValue={selectedMonth}
          className="w-full bg-transparent text-[15px] outline-none"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="rounded-full border border-line px-4 py-2 text-[13px] font-semibold"
      >
        Mostra
      </button>
      <Label className="sr-only">Mese</Label>
    </form>
  );
}
