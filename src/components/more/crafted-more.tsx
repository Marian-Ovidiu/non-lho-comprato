"use client";

import Link from "next/link";

import { signOutAction } from "@/src/actions/auth";
import { CraftedIcon, Label, Rule, Serif } from "@/components/crafted";
import { useTranslations } from "@/src/components/language/language-context";
import { CraftedMoreRow, CraftedMoreSection } from "@/src/components/more/crafted-more-row";
import { cn } from "@/lib/utils";

type WorkspaceNextStep = {
  title: string;
  description: string;
  actionLabel: string;
  href: string;
};

export type CraftedMoreProps = {
  profileLabel: string;
  workspaceName: string | null;
  workspaceLabel: string;
  workspaceInitials: string;
  isAuthenticated: boolean;
  workspaceNextStep: WorkspaceNextStep | null;
  showWorkspaceTools: boolean;
  workspaceSection: React.ReactNode;
  appSection: React.ReactNode;
};

export function CraftedMore({
  profileLabel,
  workspaceName,
  workspaceLabel,
  workspaceInitials,
  isAuthenticated,
  workspaceNextStep,
  showWorkspaceTools,
  workspaceSection,
  appSection,
}: CraftedMoreProps) {
  const t = useTranslations();
  return (
    <div className="-mx-4 pb-6 sm:-mx-6 lg:-mx-8">
      <section className="px-5 py-6">
        <Label className="mb-4 block">{t.more.profileSection}</Label>
        <div className="flex items-start gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center border border-line text-xs font-semibold tracking-[0.08em]">
            {workspaceInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[22px] font-semibold tracking-[-0.02em]">{profileLabel}</p>
            {workspaceName ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {workspaceName} · {workspaceLabel}
              </p>
            ) : (
              <Serif className="mt-1 block text-sm text-ink-3">
                {t.more.syncMessage}
              </Serif>
            )}
          </div>
          <CraftedIcon name="flame" size={18} className="mt-1 shrink-0 text-accent" />
        </div>
      </section>

      {!isAuthenticated ? (
        <section className="px-5 py-6">
          <Link
            href="/login"
            className="flex h-[54px] w-full items-center justify-center rounded-2xl bg-accent text-[15.5px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
          >
            {t.more.login}
          </Link>
        </section>
      ) : null}

      {workspaceNextStep ? (
        <>
          <CraftedMoreSection title={t.more.nextStepSection}>
            <div className="border-y border-line py-4">
              <p className="text-[15px] font-medium">{workspaceNextStep.title}</p>
              <Serif className="mt-1 block text-sm text-ink-3">
                {workspaceNextStep.description}
              </Serif>
              <Link
                href={workspaceNextStep.href}
                className="mt-3 inline-flex text-sm font-semibold text-accent"
              >
                {workspaceNextStep.actionLabel}
              </Link>
            </div>
          </CraftedMoreSection>
          <Rule />
        </>
      ) : null}

      {showWorkspaceTools ? (
        <>
          <CraftedMoreSection title={t.more.workspaceSection}>
            <div className="divide-y divide-line-soft border-y border-line">
              <CraftedMoreRow
                href="/workspace/members"
                label={t.more.membersLabel}
                detail={t.more.membersDetail}
                icon="shield"
              />
              <CraftedMoreRow
                href="/workspace/categories"
                label={t.more.categoriesLabel}
                detail={t.more.categoriesDetail}
                icon="receipt"
              />
              <CraftedMoreRow
                href="/workspace/new"
                label={t.more.newWorkspaceLabel}
                detail={t.more.newWorkspaceDetail}
                icon="target"
              />
              <div className="py-3.5">{workspaceSection}</div>
            </div>
          </CraftedMoreSection>
          <Rule />
        </>
      ) : null}

      <CraftedMoreSection title={t.more.managementSection}>
        <div className="divide-y divide-line-soft border-y border-line">
          <CraftedMoreRow
            href="/habits"
            label={t.more.habitsLabel}
            detail={t.more.habitsDetail}
            icon="coffee"
          />
          <CraftedMoreRow
            href="/presets"
            label={t.more.presetsLabel}
            detail={t.more.presetsDetail}
            icon="receipt"
          />
          <CraftedMoreRow
            href="/goals"
            label={t.more.goalsLabel}
            detail={t.more.goalsDetail}
            icon="target"
          />
        </div>
      </CraftedMoreSection>
      <Rule />

      <CraftedMoreSection title={t.more.analyticsSection}>
        <div className="border-y border-line">
          <CraftedMoreRow
            href="/reports/monthly"
            label={t.more.monthlyReportLabel}
            detail={t.more.monthlyReportDetail}
            icon="arrowUp"
          />
        </div>
      </CraftedMoreSection>
      <Rule />

      <CraftedMoreSection title={t.more.appSection}>{appSection}</CraftedMoreSection>

      {isAuthenticated ? (
        <>
          <Rule />
          <CraftedMoreSection title={t.more.accountSection}>
            <div className="border-y border-line">
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
