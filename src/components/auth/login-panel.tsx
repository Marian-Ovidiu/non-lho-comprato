"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
};

export function LoginPanel({
  providers,
  compact = false,
  className,
  title = "Accedi",
  description = "Usa il provider del tuo account Supabase per entrare nel workspace.",
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

    const redirectTo = `${window.location.origin}/auth/callback`;
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
      <div className={cn("space-y-3", className)}>
        {loginError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive">
            {loginError}
          </div>
        ) : null}

        <div
          className={cn(
            "grid gap-2.5 rounded-3xl border border-border/80 bg-surface/80 p-3 shadow-sm sm:p-4",
            visibleProviders.length > 1 ? "sm:grid-cols-2" : undefined,
          )}
        >
        {visibleProviders.map((provider) => {
          const isPending = pendingProvider === provider.value;

          return (
            <Button
              key={provider.value}
              type="button"
              variant="default"
              className="h-12 w-full justify-center rounded-2xl px-4"
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
