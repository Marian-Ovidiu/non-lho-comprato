"use client";

import Link from "next/link";

import { signOutAction } from "@/src/actions/auth";
import { CraftedIcon, Eyebrow, Serif } from "@/components/crafted";
import { useTranslations } from "@/src/components/language/language-context";
import { CraftedMoreRow, CraftedMoreSection } from "@/src/components/more/crafted-more-row";
import {
  CraftedMoreAnalysisExport,
  CraftedMoreAppPreferences,
  CraftedMoreWorkspaceAccessTools,
  CraftedMoreWorkspacePreferences,
} from "@/src/components/more/crafted-more-tools";

export type CraftedMoreProps = {
  profileLabel: string;
  workspaceName: string | null;
  workspaceLabel: string;
  isAuthenticated: boolean;
  showWorkspaceTools: boolean;
};

const ROW_GROUP_CLASS_NAME = "divide-y divide-line-soft";

export function CraftedMore({
  profileLabel,
  workspaceName,
  workspaceLabel,
  isAuthenticated,
  showWorkspaceTools,
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
    <div className="-mx-4 pb-8 sm:-mx-6 lg:-mx-8">
      <header className="px-[var(--sp-page-x)] pb-5 pt-2">
        <Eyebrow className="block">{t.more.profileSection}</Eyebrow>
        <div className="mt-3.5 flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold tracking-[0.08em]">
            {profileInitials}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[21px] font-semibold leading-6 tracking-[-0.025em]">
              {profileLabel}
            </h1>
            {workspaceName ? (
              <Serif className="mt-1 block truncate text-[14px] text-muted-foreground">
                {workspaceName} · {workspaceLabel}
              </Serif>
            ) : (
              <Serif className="mt-1 block text-[14px] text-muted-foreground">
                {t.more.syncMessage}
              </Serif>
            )}
          </div>
        </div>
      </header>

      {!isAuthenticated ? (
        <section className="px-[var(--sp-page-x)] pb-2">
          <Link
            href="/login"
            className="nlc-press flex h-[52px] w-full items-center justify-center rounded-[var(--r-cta)] bg-accent text-[15px] font-bold text-accent-foreground outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t.more.login}
          </Link>
        </section>
      ) : null}

      <CraftedMoreSection title={t.more.managementSection}>
        <div className={ROW_GROUP_CLASS_NAME}>
          {/* Congelata: il progresso era alimentato dalle spese evitate, che
              in tre mesi valgono 19 euro su 320 movimenti. Resta annunciata
              perché torni, non perché sia sparita. */}
          <CraftedMoreRow
            label={t.more.goalsLabel}
            detail={t.more.goalsDetail}
            icon="target"
            comingSoon={t.more.comingSoon}
          />
          {showWorkspaceTools ? (
            <CraftedMoreRow
              href="/budget"
              label={t.more.budgetLabel}
              detail={t.more.budgetDetail}
              icon="wallet"
            />
          ) : null}
          <CraftedMoreRow
            href="/presets"
            label={t.more.presetsLabel}
            detail={t.more.presetsDetail}
            icon="bookmark"
          />
          {showWorkspaceTools ? (
            <CraftedMoreRow
              href="/workspace/categories"
              label={t.more.categoriesLabel}
              detail={t.more.categoriesDetail}
              icon="tags"
            />
          ) : null}
        </div>
      </CraftedMoreSection>

      <CraftedMoreSection title={t.more.analyticsSection}>
        <div className={ROW_GROUP_CLASS_NAME}>
          <CraftedMoreRow
            href="/reports/monthly"
            label={t.more.monthlyReportLabel}
            detail={t.more.monthlyReportDetail}
            icon="chart"
          />
          <CraftedMoreRow
            href="/stats"
            label={t.more.statsLabel}
            detail={t.more.statsDetail}
            icon="chart"
          />
          <CraftedMoreRow
            href="/insights"
            label={t.more.patternLabel}
            detail={t.more.patternDetail}
            icon="brain"
          />
        </div>
        <div className="mt-3 rounded-[var(--r-card)] bg-surface-muted p-4">
          <CraftedMoreAnalysisExport />
        </div>
      </CraftedMoreSection>

      {showWorkspaceTools ? (
        <CraftedMoreSection title={t.more.workspaceSection}>
          <div className={ROW_GROUP_CLASS_NAME}>
            <CraftedMoreRow
              href="/workspace/members"
              label={t.more.membersLabel}
              detail={t.more.membersDetail}
              icon="users"
            />
            <CraftedMoreRow
              href="/workspace/new"
              label={t.more.newWorkspaceLabel}
              detail={t.more.newWorkspaceDetail}
              icon="folderPlus"
            />
          </div>
          <div className={`mt-2 ${ROW_GROUP_CLASS_NAME}`}>
            <CraftedMoreWorkspaceAccessTools />
          </div>
        </CraftedMoreSection>
      ) : null}

      <CraftedMoreSection title={t.more.dataSection}>
        <div className={ROW_GROUP_CLASS_NAME}>
          {showWorkspaceTools ? (
            <CraftedMoreRow
              href="/workspace/imports"
              label={t.more.importLabel}
              detail={t.more.importDetail}
              icon="fileUp"
            />
          ) : null}
          <CraftedMoreRow
            href="/privacy"
            label={t.more.privacyLabel}
            detail={t.more.privacyDetail}
            icon="shield"
          />
        </div>
      </CraftedMoreSection>

      <CraftedMoreSection title={t.more.appSection}>
        <div className={ROW_GROUP_CLASS_NAME}>
          {showWorkspaceTools ? <CraftedMoreWorkspacePreferences /> : null}
          <CraftedMoreAppPreferences />
        </div>
      </CraftedMoreSection>

      {isAuthenticated ? (
        <CraftedMoreSection title={t.more.accountSection} className="pb-2">
          <div className={ROW_GROUP_CLASS_NAME}>
            <CraftedMoreRow
              href="/account/delete"
              label={t.more.deleteAccountLabel}
              detail={t.more.deleteAccountDetail}
              icon="del"
            />
            <form action={signOutAction}>
              <button
                type="submit"
                className="nlc-press -mx-2 flex min-h-16 w-[calc(100%+1rem)] items-center gap-3 px-2 py-2.5 text-left outline-none transition-colors hover:bg-surface-muted/45 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-surface-muted text-muted-foreground">
                  <CraftedIcon name="logOut" size={17} />
                </span>
                <span className="text-[15px] font-medium leading-5 tracking-[-0.01em]">
                  {t.more.logout}
                </span>
              </button>
            </form>
          </div>
        </CraftedMoreSection>
      ) : null}
    </div>
  );
}
