"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
            "rounded-3xl border border-border/80 bg-surface/80 p-3.5 shadow-sm sm:p-4",
            "grid gap-2.5",
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
    );
  }

  return (
      <Card
        className={cn("border-border/80 bg-surface/80 shadow-sm", className)}
      >
      <CardHeader className="space-y-1.5 p-5 pb-0 sm:p-5">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <CardDescription className="max-w-md text-sm leading-6">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-4 sm:p-6 sm:pt-5">
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
