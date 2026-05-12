export const SUPABASE_OAUTH_PROVIDERS = [
  { value: "google", label: "Continua con Google" },
  { value: "apple", label: "Continua con Apple" },
] as const;

export type SupabaseOAuthProvider = (typeof SUPABASE_OAUTH_PROVIDERS)[number]["value"];
