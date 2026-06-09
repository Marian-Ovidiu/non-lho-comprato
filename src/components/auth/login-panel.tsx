"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { trackPostHogEvent } from "@/src/lib/posthog";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/browser";
import {
  SUPABASE_OAUTH_PROVIDERS,
  type SupabaseOAuthProvider,
} from "@/src/lib/auth/providers";

type LoginPanelProps = {
  providers?: SupabaseOAuthProvider[];
  className?: string;
  redirectPath?: string;
  /**
   * @deprecated Mantenuti per compatibilità con i call-site esistenti.
   * Il pannello renderizza un'unica variante crafted; questi prop non
   * influenzano più il layout.
   */
  compact?: boolean;
  title?: string;
  description?: string;
};

export function LoginPanel({
  providers,
  className,
  redirectPath,
}: LoginPanelProps = {}) {
  const [pendingProvider, setPendingProvider] =
    useState<SupabaseOAuthProvider | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const visibleProviders = providers
    ? SUPABASE_OAUTH_PROVIDERS.filter((provider) =>
        providers.includes(provider.value),
      )
    : SUPABASE_OAUTH_PROVIDERS;

  async function handleLogin(provider: SupabaseOAuthProvider) {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      const message = "Supabase Auth is not configured.";
      console.error("[auth] google login unavailable", message);
      setLoginError(message);
      return;
    }

    setPendingProvider(provider);
    setLoginError(null);
    trackPostHogEvent("onboarding_started");

    const callbackPath =
      redirectPath && redirectPath.startsWith("/") && !redirectPath.startsWith("//")
        ? `/auth/callback?next=${encodeURIComponent(redirectPath)}`
        : "/auth/callback";
    const redirectTo = `${window.location.origin}${callbackPath}`;
    console.info("[auth] google login clicked");
    console.info("[auth] redirectTo", redirectTo);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (error) {
        console.error("[auth] oauth error", error.message);
        setLoginError(error.message);
        setPendingProvider(null);
        return;
      }

      const hasUrl = Boolean(data?.url);
      console.info("[auth] oauth url available", hasUrl);

      if (data?.url) {
        window.location.assign(data.url);
        return;
      }

      const message =
        "Non riesco ad aprire il flusso Google adesso. Riprova tra poco.";
      console.error("[auth] oauth missing url");
      setLoginError(message);
      setPendingProvider(null);
    } catch (thrownError) {
      const message =
        thrownError instanceof Error
          ? thrownError.message
          : "Unable to start OAuth login.";
      console.error("[auth] oauth threw", message);
      setLoginError(message);
      setPendingProvider(null);
    }
  }

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {loginError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive">
          {loginError}
        </div>
      ) : null}

      {visibleProviders.map((provider, index) => {
        const isPending = pendingProvider === provider.value;
        const isPrimary = index === 0;

        return (
          <button
            key={provider.value}
            type="button"
            onClick={() => handleLogin(provider.value)}
            disabled={Boolean(pendingProvider)}
            className={cn(
              "flex h-14 w-full items-center justify-center gap-2 rounded-[18px]",
              "text-[16px] tracking-[-0.01em] transition-[opacity,transform] duration-150",
              "active:scale-[0.98] active:opacity-90 disabled:opacity-60",
              isPrimary
                ? "bg-accent font-bold text-accent-foreground"
                : "border border-[var(--border-strong)] bg-transparent font-semibold text-foreground",
            )}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {provider.label}
            {isPrimary && !isPending ? (
              <ArrowRight className="size-4" aria-hidden="true" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
