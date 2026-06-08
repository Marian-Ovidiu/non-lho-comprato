import { Label, Mono } from "@/components/crafted";
import { formatCraftedCompact } from "@/src/lib/crafted-money";

type CraftedEntriesHeaderProps = {
  monthLabel: string;
  entriesCount: number;
  totalSaved: number;
};

export function CraftedEntriesHeader({
  monthLabel,
  entriesCount,
  totalSaved,
}: CraftedEntriesHeaderProps) {
  return (
    <section className="-mx-4 px-5 pb-5 pt-7 sm:-mx-6 lg:-mx-8">
      <Label className="mb-4 block">Movimenti — {monthLabel.toLowerCase()}</Label>
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <Mono className="text-[clamp(2.75rem,14vw,3.75rem)] font-semibold leading-[0.85] tracking-[-0.05em]">
            {entriesCount}
          </Mono>
          <span className="text-base text-muted-foreground">segnali</span>
        </div>
        <div className="text-right">
          <Label className="mb-1.5 block">Tenuti</Label>
          <Mono className="text-xl font-medium">
            {formatCraftedCompact(totalSaved)}
            <span className="text-xs text-accent">€</span>
          </Mono>
        </div>
      </div>
    </section>
  );
}
