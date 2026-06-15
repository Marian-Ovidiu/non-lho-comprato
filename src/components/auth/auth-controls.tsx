"use client";

import Link from "next/link";

import { signOutAction } from "@/src/actions/auth";
import { Button } from "@/components/ui/button";
import { resetPostHog } from "@/src/lib/posthog";
import { useTranslations } from "@/src/components/language/language-context";

type AuthControlsProps = {
  isAuthenticated: boolean;
  userLabel?: string | null;
};

export function AuthControls({
  isAuthenticated,
  userLabel,
}: AuthControlsProps) {
  const t = useTranslations();

  if (!isAuthenticated) {
    return (
      <Button asChild variant="outline" size="sm" className="rounded-full">
        <Link href="/login">{t.auth.loginButton}</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {userLabel ? (
        <span className="hidden rounded-full border border-border px-3 py-1 text-xs text-muted-text sm:inline">
          {userLabel}
        </span>
      ) : null}
      <form
        action={signOutAction}
        onSubmit={() => {
          resetPostHog();
        }}
      >
        <Button type="submit" variant="outline" size="sm" className="rounded-full">
          {t.auth.logoutButton}
        </Button>
      </form>
    </div>
  );
}
