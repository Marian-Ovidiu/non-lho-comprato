import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { getSupabaseEnvironment } from "@/src/lib/supabase/config";

const mutableEnv = process.env as Record<string, string | undefined>;
const originalEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    mutableEnv[key] = value;
  }
});

describe("getSupabaseEnvironment", () => {
  it("returns only public Supabase configuration", () => {
    mutableEnv.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    mutableEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key";
    mutableEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = undefined;
    mutableEnv.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    const environment = getSupabaseEnvironment();

    assert.deepEqual(environment, {
      url: "https://example.supabase.co",
      anonKey: "public-anon-key",
    });
    assert.equal(
      "serviceRoleKey" in (environment as Record<string, unknown>),
      false,
    );
  });
});
