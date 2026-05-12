type SupabaseEnvironment = {
  url: string;
  anonKey: string;
  serviceRoleKey: string | null;
};

function getPublicKey(): string | null {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    null
  );
}

export function getSupabaseEnvironment(): SupabaseEnvironment | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
  const anonKey = getPublicKey();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;

  if (!url || !anonKey) {
    return null;
  }

  return {
    url,
    anonKey,
    serviceRoleKey,
  };
}

export function hasSupabaseEnvironment(): boolean {
  return Boolean(getSupabaseEnvironment());
}
