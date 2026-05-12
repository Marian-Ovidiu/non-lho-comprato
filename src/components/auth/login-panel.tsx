"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const router = useRouter();
  const [pendingProvider, setPendingProvider] =
    useState<SupabaseOAuthProvider | null>(null);
  const visibleProviders = providers
    ? SUPABASE_OAUTH_PROVIDERS.filter((provider) =>
        providers.includes(provider.value),
      )
    : SUPABASE_OAUTH_PROVIDERS;

  async function handleLogin(provider: SupabaseOAuthProvider) {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      window.alert("Supabase Auth non è configurato.");
      return;
    }

    setPendingProvider(provider);

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });

    if (error) {
      window.alert(error.message);
      setPendingProvider(null);
      return;
    }

    router.refresh();
  }

  if (compact) {
    return (
      <div
        className={cn(
          "grid gap-2",
          visibleProviders.length > 1 ? "sm:grid-cols-2" : undefined,
          className,
        )}
      >
        {visibleProviders.map((provider) => {
          const isPending = pendingProvider === provider.value;

          return (
            <Button
              key={provider.value}
              type="button"
              variant="outline"
              className="h-12 w-full justify-center rounded-full border-border bg-surface/80 text-foreground hover:bg-surface-muted hover:text-foreground"
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
    );
  }

  return (
    <Card
      className={cn("border-border/80 bg-surface/80 shadow-sm", className)}
    >
      <CardHeader className="space-y-2 p-5 pb-0 sm:p-6">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-5 sm:p-6">
        <p className="text-sm leading-6 text-muted-text">
          {description}
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {visibleProviders.map((provider) => {
            const isPending = pendingProvider === provider.value;

            return (
              <Button
                key={provider.value}
                type="button"
                variant="outline"
                className="h-11 justify-center rounded-2xl border-border bg-background text-foreground hover:bg-surface-muted hover:text-foreground"
                onClick={() => handleLogin(provider.value)}
                disabled={Boolean(pendingProvider)}
              >
                {isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
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
