"use client";

import { Amount, CraftedIcon, Serif } from "@/components/crafted";
import { cn } from "@/lib/utils";

export type MoneyRowKind = "income" | "transfer-in" | "transfer-out";

export type CraftedMoneyRowItem = {
  id: string;
  kind: MoneyRowKind;
  title: string;
  /** Riga di dettaglio: chi ha incassato, o chi ha mosso i soldi. */
  detail: string | null;
  note: string | null;
  amount: number;
};

type CraftedMoneyRowProps = {
  item: CraftedMoneyRowItem;
  className?: string;
  showDivider?: boolean;
  onOpen?: (id: string) => void;
  labels: {
    income: string;
    transferIn: string;
    transferOut: string;
  };
};

/**
 * La riga di un'entrata o di un giroconto, nell'elenco dei movimenti.
 *
 * Stessa griglia della riga di spesa — stesse tre colonne, stesse altezze —
 * perché sono lo stesso registro e saltano all'occhio se cambiano ritmo.
 *
 * Due scelte che sembrano mancanze e non lo sono.
 *
 * **Nessun colore.** L'unico inchiostro colorato dell'elenco è quello della
 * spesa evitata, e dice una cosa precisa: quei soldi non sono usciti. Tingere
 * anche l'entrata farebbe leggere le due come la stessa famiglia, e non lo
 * sono — una è denaro arrivato, l'altra è denaro non speso. Il segno davanti
 * al numero basta a dire il verso.
 *
 * **Il giroconto non ha segno.** Non è né più né meno: quei soldi erano già in
 * casa, si sono solo spostati fra due conti. Un `+` o un `−` inviterebbe a
 * sommarlo con le entrate del mese, che è precisamente l'errore da cui questo
 * movimento esiste per proteggere.
 */
export function CraftedMoneyRow({
  item,
  className,
  showDivider = true,
  onOpen,
  labels,
}: CraftedMoneyRowProps) {
  const isTransfer = item.kind !== "income";
  const eyebrow =
    item.kind === "income"
      ? labels.income
      : item.kind === "transfer-in"
        ? labels.transferIn
        : labels.transferOut;

  return (
    <div>
      <button
        type="button"
        onClick={() => onOpen?.(item.id)}
        className={cn(
          "nlc-press grid min-h-16 w-full grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 text-left outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          showDivider && "border-b border-line-soft",
          className,
        )}
      >
        <span className="flex size-[38px] items-center justify-center rounded-[var(--r-control)] border border-line-soft bg-foreground/[0.045] text-muted-foreground">
          <CraftedIcon name={isTransfer ? "users" : "wallet"} size={17} />
        </span>

        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium leading-5 tracking-[-0.01em]">
            {item.title}
          </p>
          <p className="mt-0.5 flex min-w-0 items-baseline gap-1.5 text-[11px] leading-4 text-ink-3">
            <span className="nlc-eyebrow shrink-0 [--eyebrow-ink:var(--ink-3)] [--fs-label:10px]">
              {eyebrow}
            </span>
            {item.detail ? (
              <span className="min-w-0 truncate">{item.detail}</span>
            ) : null}
          </p>
          {item.note ? (
            <Serif className="mt-1 block truncate text-[13px] leading-4 text-muted-foreground">
              &quot;{item.note}&quot;
            </Serif>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          <Amount
            value={item.amount}
            sign={item.kind === "income" ? "plus" : "none"}
            className={cn(
              "block text-[15px] font-semibold",
              isTransfer && "text-muted-foreground",
            )}
          />
        </div>
      </button>
    </div>
  );
}
