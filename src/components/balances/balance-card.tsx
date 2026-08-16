"use client";

import { useState, useTransition } from "react";
import { Plus, Wallet } from "lucide-react";

import { Amount, Eyebrow } from "@/components/crafted";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setBalanceStartAction } from "@/src/actions/balances";
import { createIncomeAction } from "@/src/actions/incomes";
import {
  useTranslations,
  useWorkspaceLanguage,
} from "@/src/components/language/language-context";
import { languageToLocale } from "@/src/lib/i18n";
import type { BalanceState } from "@/src/features/balances/balance";
import { cn } from "@/lib/utils";

type MemberOption = {
  userId: string;
  label: string;
};

type BalanceCardProps = {
  personal: BalanceState;
  joint: BalanceState | null;
  isShared: boolean;
  members: MemberOption[];
  currentUserId: string;
  todayDateKey: string;
};

/* Interfaccia volutamente spoglia: qui c'e' la meccanica, il vestito lo mette
   il direttore artistico. Quello che deve gia' essere giusto e' cosa si vede e
   cosa no — il saldo dell'altra persona non compare da nessuna parte. */
export function BalanceCard({
  personal,
  joint,
  isShared,
  members,
  currentUserId,
  todayDateKey,
}: BalanceCardProps) {
  const t = useTranslations();
  const locale = languageToLocale(useWorkspaceLanguage());
  const [setupTarget, setSetupTarget] = useState<"personal" | "joint" | null>(
    null,
  );
  const [incomeOpen, setIncomeOpen] = useState(false);

  return (
    <section className="px-[var(--sp-page-x)] pb-4">
      <div className="rounded-[var(--r-card)] border border-line-soft bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <Eyebrow>{t.balances.sectionTitle}</Eyebrow>
          <button
            type="button"
            onClick={() => setIncomeOpen(true)}
            className="flex items-center gap-1 text-[12px] font-semibold text-muted-foreground transition-opacity hover:opacity-70"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            {t.balances.addIncome}
          </button>
        </div>

        <BalanceRow
          label={t.balances.yourBalance}
          state={personal}
          onSetUp={() => setSetupTarget("personal")}
          t={t}
          locale={locale}
        />

        {isShared && joint ? (
          <BalanceRow
            label={t.balances.jointBalance}
            state={joint}
            onSetUp={() => setSetupTarget("joint")}
            t={t}
            locale={locale}
          />
        ) : null}
      </div>

      <BalanceSetupDialog
        target={setupTarget}
        todayDateKey={todayDateKey}
        onClose={() => setSetupTarget(null)}
        t={t}
      />

      <IncomeDialog
        open={incomeOpen}
        onClose={() => setIncomeOpen(false)}
        members={members}
        currentUserId={currentUserId}
        isShared={isShared}
        todayDateKey={todayDateKey}
        t={t}
      />
    </section>
  );
}

/* Gli importi della riga vanno scritti come quello grande sopra: il saldo usa
   la virgola decimale, e un "250.00" col punto due righe sotto si legge come
   un numero di un'altra app. */
function formatMoney(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDay(dateKey: string, locale: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function BalanceRow({
  label,
  state,
  onSetUp,
  t,
  locale,
}: {
  label: string;
  state: BalanceState;
  onSetUp: () => void;
  t: ReturnType<typeof useTranslations>;
  locale: string;
}) {
  if (!state.configured) {
    return (
      <div className="mt-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold">{label}</p>
          <p className="text-[12px] text-muted-foreground">
            {t.balances.notSet}
          </p>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={onSetUp}>
          <Wallet className="mr-1.5 size-3.5" aria-hidden="true" />
          {t.balances.setUpCta}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <p className="text-[13px] font-semibold">{label}</p>
      {/* Il rosso non è un allarme: un saldo sotto zero è un fatto, e va detto
          senza drammi ma senza nasconderlo. */}
      <Amount
        value={state.current}
        className={cn(
          "text-[26px]",
          state.current < 0 && "text-[var(--nlc-over)]",
        )}
      />
      <p className="text-[12px] text-muted-foreground">
        {t.balances.sinceLine(
          formatDay(state.start.dateKey, locale),
          `+${formatMoney(state.incoming, locale)}`,
          `−${formatMoney(state.outgoing, locale)}`,
        )}
      </p>
    </div>
  );
}

function BalanceSetupDialog({
  target,
  todayDateKey,
  onClose,
  t,
}: {
  target: "personal" | "joint" | null;
  todayDateKey: string;
  onClose: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [dateKey, setDateKey] = useState(todayDateKey);
  const [error, setError] = useState<string | null>(null);

  function save() {
    const parsed = Number(amount.replace(",", "."));

    if (!Number.isFinite(parsed)) {
      setError(t.validation.invalidNumber);
      return;
    }

    startTransition(async () => {
      const result = await setBalanceStartAction(
        target === "joint" ? "joint" : "personal",
        parsed,
        dateKey,
      );

      if (!result.success) {
        setError(result.message);
        return;
      }

      setAmount("");
      setError(null);
      onClose();
    });
  }

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t.balances.setUpTitle}</DialogTitle>
        </DialogHeader>

        <p className="text-[13px] text-muted-foreground">
          {t.balances.setUpDesc}
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="balance-amount">{t.balances.amountLabel}</Label>
            <Input
              id="balance-amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0,00"
            />
          </div>

          <div>
            <Label htmlFor="balance-date">{t.balances.fromDateLabel}</Label>
            <Input
              id="balance-date"
              type="date"
              value={dateKey}
              onChange={(event) => setDateKey(event.target.value)}
            />
          </div>

          {error ? (
            <p className="text-[13px] text-[var(--nlc-over)]">{error}</p>
          ) : null}
        </div>

        <div className="mt-4 flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.balances.skipButton}
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={pending || amount.trim() === ""}
            onClick={save}
          >
            {t.balances.saveButton}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IncomeDialog({
  open,
  onClose,
  members,
  currentUserId,
  isShared,
  todayDateKey,
  t,
}: {
  open: boolean;
  onClose: () => void;
  members: MemberOption[];
  currentUserId: string;
  isShared: boolean;
  todayDateKey: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await createIncomeAction(formData);

      if (!result.success) {
        setErrors(result.errors ?? {});
        return;
      }

      setErrors({});
      onClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t.balances.incomeTitle}</DialogTitle>
        </DialogHeader>

        <form action={submit} className="mt-3 space-y-3">
          <div>
            <Label htmlFor="income-title">{t.balances.incomeTitleLabel}</Label>
            <Input
              id="income-title"
              name="title"
              placeholder={t.balances.incomeTitlePlaceholder}
              required
            />
            {errors.title ? (
              <p className="text-[13px] text-[var(--nlc-over)]">{errors.title}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="income-amount">{t.balances.incomeAmountLabel}</Label>
              <Input
                id="income-amount"
                name="amount"
                inputMode="decimal"
                placeholder="0,00"
                required
              />
            </div>
            <div>
              <Label htmlFor="income-date">{t.balances.incomeDateLabel}</Label>
              <Input
                id="income-date"
                name="date"
                type="date"
                defaultValue={todayDateKey}
              />
            </div>
          </div>
          {errors.amount ? (
            <p className="text-[13px] text-[var(--nlc-over)]">{errors.amount}</p>
          ) : null}

          {isShared ? (
            <div>
              <Label htmlFor="income-who">{t.balances.incomeWhoLabel}</Label>
              <select
                id="income-who"
                name="receivedByUserId"
                defaultValue={currentUserId}
                className="h-11 w-full rounded-[var(--r-control)] border border-line-soft bg-background px-3 text-[15px]"
              >
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.label}
                  </option>
                ))}
                <option value="">{t.balances.incomeJointOption}</option>
              </select>
            </div>
          ) : (
            <input type="hidden" name="receivedByUserId" value={currentUserId} />
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {t.balances.incomeSaveButton}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
