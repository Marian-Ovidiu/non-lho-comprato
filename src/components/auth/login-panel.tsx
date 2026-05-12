"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/browser";
import {
  SUPABASE_OAUTH_PROVIDERS,
  type SupabaseOAuthProvider,
} from "@/src/lib/auth/providers";

type LoginPanelProps = {
  providers?: SupabaseOAuthProvider[];
};

export function LoginPanel({ providers }: LoginPanelProps = {}) {
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

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="space-y-2 p-5 pb-0 sm:p-6">
        <CardTitle>Accedi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-5 sm:p-6">
        <p className="text-sm leading-6 text-muted-text">
          Usa il provider del tuo account Supabase per entrare nel workspace.
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {visibleProviders.map((provider) => {
            const isPending = pendingProvider === provider.value;

            return (
              <Button
                key={provider.value}
                type="button"
                variant="outline"
                className="justify-center"
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
