import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  getMigrationDatabaseUrl,
  normalizeRuntimeDatabaseUrl,
  shouldUseDatabaseSsl,
} from "@/src/lib/database-config";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalDirectUrl = process.env.DIRECT_URL;

afterEach(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }

  if (originalDirectUrl === undefined) {
    delete process.env.DIRECT_URL;
  } else {
    process.env.DIRECT_URL = originalDirectUrl;
  }
});

function searchParams(value: string): URLSearchParams {
  return new URL(value).searchParams;
}

describe("database URL normalization", () => {
  it("does not force TLS for localhost runtime URLs", () => {
    const localUrl = "postgresql://postgres:postgres@localhost:54322/nlc_clone";

    assert.equal(normalizeRuntimeDatabaseUrl(localUrl), localUrl);
    assert.equal(shouldUseDatabaseSsl(localUrl), false);
  });

  it("respects explicit local sslmode=disable", () => {
    const localUrl =
      "postgresql://postgres:postgres@127.0.0.1:54322/nlc_clone?sslmode=disable";

    const normalized = normalizeRuntimeDatabaseUrl(localUrl);
    const params = searchParams(normalized);

    assert.equal(params.get("sslmode"), "disable");
    assert.equal(params.has("uselibpqcompat"), false);
  });

  it("does not force TLS for IPv6 localhost URLs", () => {
    const localUrl = "postgresql://postgres:postgres@[::1]:54322/nlc_clone";

    assert.equal(normalizeRuntimeDatabaseUrl(localUrl), localUrl);
  });

  it("keeps Supabase transaction pooler normalization", () => {
    const normalized = normalizeRuntimeDatabaseUrl(
      "postgresql://postgres:secret@aws-0-eu-west-1.pooler.supabase.com:6543/postgres",
    );
    const params = searchParams(normalized);

    assert.equal(params.get("uselibpqcompat"), "true");
    assert.equal(params.get("sslmode"), "require");
    assert.equal(params.get("pgbouncer"), "true");
    assert.equal(shouldUseDatabaseSsl(normalized), true);
  });

  it("does not duplicate existing non-local SSL parameters", () => {
    const normalized = normalizeRuntimeDatabaseUrl(
      "postgresql://postgres:secret@db.example.com:5432/app?sslmode=require&uselibpqcompat=true",
    );
    const params = searchParams(normalized);

    assert.deepEqual(params.getAll("sslmode"), ["require"]);
    assert.deepEqual(params.getAll("uselibpqcompat"), ["true"]);
  });

  it("adds only missing non-local SSL parameters", () => {
    const normalized = normalizeRuntimeDatabaseUrl(
      "postgresql://postgres:secret@db.example.com:5432/app?sslmode=require",
    );
    const params = searchParams(normalized);

    assert.deepEqual(params.getAll("sslmode"), ["require"]);
    assert.deepEqual(params.getAll("uselibpqcompat"), ["true"]);
  });

  it("uses local DIRECT_URL for migrations without adding TLS", () => {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:54322/nlc_clone";
    process.env.DIRECT_URL =
      "postgresql://postgres:postgres@localhost:54322/nlc_clone?sslmode=disable";

    assert.equal(
      getMigrationDatabaseUrl(),
      "postgresql://postgres:postgres@localhost:54322/nlc_clone?sslmode=disable",
    );
  });
});
