"use client";

import Link from "next/link";

import { signOutAction } from "@/src/actions/auth";
import { Label, Rule, Serif } from "@/components/crafted";
import { useTranslations } from "@/src/components/language/language-context";
import { CraftedMoreRow, CraftedMoreSection } from "@/src/components/more/crafted-more-row";
import { cn } from "@/lib/utils";

export type CraftedMoreProps = {
  profileLabel: string;
  workspaceName: string | null;
  workspaceLabel: string;
  isAuthenticated: boolean;
  showWorkspaceTools: boolean;
  workspaceSection: React.ReactNode;
  appSection: React.ReactNode;
};

export function CraftedMore({
  profileLabel,
  workspaceName,
  workspaceLabel,
  isAuthenticated,
  showWorkspaceTools,
  workspaceSection,
  appSection,
}: CraftedMoreProps) {
  const t = useTranslations();

  const profileInitials =
    profileLabel
      .split(" ")
      .map((part) => part.trim().charAt(0))
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="-mx-4 pb-6 sm:-mx-6 lg:-mx-8">
      <section className="px-5 py-6">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line text-xs font-semibold tracking-[0.08em]">
            {profileInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[18px] font-semibold tracking-[-0.02em]">{profileLabel}</p>
            {workspaceName ? (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {workspaceName} · {workspaceLabel}
              </p>
            ) : (
              <Serif className="mt-0.5 block text-sm text-ink-3">
                {t.more.syncMessage}
              </Serif>
            )}
          </div>
        </div>
      </section>

      {!isAuthenticated ? (
        <section className="px-5 pb-6">
          <Link
            href="/login"
            className="flex h-[54px] w-full items-center justify-center rounded-2xl bg-accent text-[15.5px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
          >
            {t.more.login}
          </Link>
        </section>
      ) : null}

      <Rule />

      <CraftedMoreSection title={t.more.managementSection}>
        <div className="divide-y divide-line-soft">
          <CraftedMoreRow
            href="/goals"
            label={t.more.goalsLabel}
            detail={t.more.goalsDetail}
            icon="target"
          />
          <CraftedMoreRow
            href="/presets"
            label={t.more.presetsLabel}
            detail={t.more.presetsDetail}
            icon="receipt"
          />
          <CraftedMoreRow
            href="/reports/monthly"
            label={t.more.monthlyReportLabel}
            detail={t.more.monthlyReportDetail}
            icon="arrowUp"
          />
        </div>
      </CraftedMoreSection>

      {showWorkspaceTools ? (
        <>
          <Rule />
          <CraftedMoreSection title={t.more.workspaceSection}>
            <div className="divide-y divide-line-soft">
              {workspaceSection}
              <CraftedMoreRow
                href="/workspace/categories"
                label={t.more.categoriesLabel}
                detail={t.more.categoriesDetail}
                icon="receipt"
              />
              <CraftedMoreRow
                href="/workspace/budgets"
                label="Budget"
                detail="Controlla la spesa reale del workspace e delle categorie."
                icon="target"
              />
              <CraftedMoreRow
                href="/workspace/members"
                label={t.more.membersLabel}
                detail={t.more.membersDetail}
                icon="shield"
              />
              <CraftedMoreRow
                href="/workspace/imports"
                label="Import CSV"
                detail="Carica un estratto conto CSV e conferma solo le righe utili."
                icon="receipt"
              />
              <CraftedMoreRow
                href="/workspace/new"
                label={t.more.newWorkspaceLabel}
                detail={t.more.newWorkspaceDetail}
                icon="target"
              />
            </div>
          </CraftedMoreSection>
        </>
      ) : null}

      <Rule />

      <CraftedMoreSection title={t.more.appSection}>
        <div className="divide-y divide-line-soft">
          {appSection}
        </div>
      </CraftedMoreSection>

      {isAuthenticated ? (
        <>
          <Rule />
          <CraftedMoreSection title={t.more.accountSection}>
            <div>
              <CraftedMoreRow
                href="/account/delete"
                label={t.more.deleteAccountLabel}
                detail={t.more.deleteAccountDetail}
                icon="del"
              />
            </div>
          </CraftedMoreSection>
          <Rule className="mt-5" />
          <form action={signOutAction} className="px-5 py-5">
            <button
              type="submit"
              className={cn(
                "w-full border border-line py-3.5 text-sm font-medium text-muted-foreground",
                "transition-colors hover:text-foreground",
              )}
            >
              {t.more.logout}
            </button>
          </form>
        </>
      ) : null}
    </div>
  );
}
