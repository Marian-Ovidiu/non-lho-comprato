"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { trackPostHogEvent } from "@/src/lib/posthog";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/browser";
import {
  SUPABASE_OAUTH_PROVIDERS,
  type SupabaseOAuthProvider,
} from "@/src/lib/auth/providers";

type LoginPanelProps = {
  providers?: SupabaseOAuthProvider[];
  compact?: boolean;
  className?: string;
  title?: string;
  description?: string;
  redirectPath?: string;
};

export function LoginPanel({
  providers,
  compact = false,
  className,
  title = "Accedi",
  description = "Usa il provider del tuo account Supabase per entrare nel workspace.",
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

  if (compact) {
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

  return (
    <Card className={cn("border-border/80 bg-surface/80 shadow-sm", className)}>
      <CardHeader className="space-y-1 p-4 pb-0 sm:p-5">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription className="max-w-md text-sm leading-5">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-3 sm:p-5 sm:pt-4">
        {loginError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive">
            {loginError}
          </div>
        ) : null}

        <div className="grid gap-2.5 sm:grid-cols-2">
          {visibleProviders.map((provider) => {
            const isPending = pendingProvider === provider.value;

            return (
              <Button
                key={provider.value}
                type="button"
                variant="outline"
                className="h-12 justify-center rounded-2xl border-border bg-background text-foreground hover:bg-surface-muted hover:text-foreground"
                onClick={() => handleLogin(provider.value)}
                disabled={Boolean(pendingProvider)}
              >
                {isPending ? (
                  <Loader2
                    className="mr-2 size-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : null}
                {provider.label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
