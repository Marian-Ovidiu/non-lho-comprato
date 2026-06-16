import { createHash } from "node:crypto";

import { headers } from "next/headers";

export type RateLimitRule = {
  scope: string;
  limit: number;
  windowSeconds: number;
  blockSeconds?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  limit: number;
  remaining: number;
  resetAt: Date;
};

type RateLimitRow = {
  count: number;
  windowStart: Date;
  blockedUntil: Date | null;
};

const UNKNOWN_IP = "unknown";

function clampPositiveInteger(value: number, fallback: number) {
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

export function getClientIpFromHeaders(headerList: Headers) {
  const forwardedFor = headerList.get("x-forwarded-for");
  const firstForwardedIp = forwardedFor?.split(",")[0]?.trim();

  return (
    firstForwardedIp ||
    headerList.get("x-real-ip")?.trim() ||
    headerList.get("cf-connecting-ip")?.trim() ||
    headerList.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    UNKNOWN_IP
  );
}

export async function getClientIpFromRequestHeaders() {
  return getClientIpFromHeaders(await headers());
}

export function createRateLimitKey(scope: string, identifiers: Array<string | null | undefined>) {
  const normalizedIdentifiers = identifiers
    .map((identifier) => identifier?.trim().toLowerCase())
    .filter((identifier): identifier is string => Boolean(identifier));
  const rawKey = [scope, ...normalizedIdentifiers].join(":");
  const digest = createHash("sha256").update(rawKey).digest("hex");

  return `${scope}:${digest}`;
}

export function getRateLimitRetryAfter(result: RateLimitResult) {
  return Math.max(1, result.retryAfterSeconds);
}

export function createRateLimitResponse(result: RateLimitResult) {
  return new Response("Too Many Requests", {
    status: 429,
    headers: {
      "Retry-After": String(getRateLimitRetryAfter(result)),
      "Cache-Control": "no-store",
    },
  });
}

export async function checkRateLimit(
  rule: RateLimitRule,
  identifiers: Array<string | null | undefined>,
): Promise<RateLimitResult> {
  const [{ Prisma }, { prisma }] = await Promise.all([
    import("@/src/lib/generated/prisma/client"),
    import("@/src/lib/prisma"),
  ]);
  const limit = clampPositiveInteger(rule.limit, 1);
  const windowSeconds = clampPositiveInteger(rule.windowSeconds, 60);
  const blockSeconds = clampPositiveInteger(rule.blockSeconds ?? rule.windowSeconds, windowSeconds);
  const key = createRateLimitKey(rule.scope, identifiers);
  const rows = await prisma.$queryRaw<RateLimitRow[]>(Prisma.sql`
    WITH upserted AS (
      INSERT INTO "RateLimitBucket" (
        "key",
        "scope",
        "windowStart",
        "count",
        "blockedUntil",
        "updatedAt"
      )
      VALUES (
        ${key},
        ${rule.scope},
        NOW(),
        1,
        NULL,
        NOW()
      )
      ON CONFLICT ("key") DO UPDATE
      SET
        "windowStart" = CASE
          WHEN "RateLimitBucket"."blockedUntil" IS NOT NULL
            AND "RateLimitBucket"."blockedUntil" > NOW()
            THEN "RateLimitBucket"."windowStart"
          WHEN "RateLimitBucket"."windowStart" <= NOW() - (${windowSeconds} * INTERVAL '1 second')
            THEN NOW()
          ELSE "RateLimitBucket"."windowStart"
        END,
        "count" = CASE
          WHEN "RateLimitBucket"."blockedUntil" IS NOT NULL
            AND "RateLimitBucket"."blockedUntil" > NOW()
            THEN "RateLimitBucket"."count"
          WHEN "RateLimitBucket"."windowStart" <= NOW() - (${windowSeconds} * INTERVAL '1 second')
            THEN 1
          ELSE "RateLimitBucket"."count" + 1
        END,
        "blockedUntil" = CASE
          WHEN "RateLimitBucket"."blockedUntil" IS NOT NULL
            AND "RateLimitBucket"."blockedUntil" > NOW()
            THEN "RateLimitBucket"."blockedUntil"
          WHEN "RateLimitBucket"."windowStart" <= NOW() - (${windowSeconds} * INTERVAL '1 second')
            THEN NULL
          WHEN "RateLimitBucket"."count" + 1 > ${limit}
            THEN NOW() + (${blockSeconds} * INTERVAL '1 second')
          ELSE NULL
        END,
        "updatedAt" = NOW()
      RETURNING
        "count",
        "windowStart",
        "blockedUntil"
    )
    SELECT
      "count",
      "windowStart",
      "blockedUntil"
    FROM upserted
  `);
  const row = rows[0];

  if (!row) {
    throw new Error("Rate limit check did not return a bucket.");
  }

  const now = Date.now();
  const blockedUntilMs = row.blockedUntil?.getTime() ?? 0;
  const windowResetMs = row.windowStart.getTime() + windowSeconds * 1000;
  const resetAt = new Date(Math.max(blockedUntilMs, windowResetMs));
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt.getTime() - now) / 1000));
  const allowed = !row.blockedUntil || row.blockedUntil.getTime() <= now;

  return {
    allowed,
    retryAfterSeconds: allowed ? 0 : retryAfterSeconds,
    limit,
    remaining: allowed ? Math.max(0, limit - row.count) : 0,
    resetAt,
  };
}

export async function cleanupRateLimitBuckets(maxAgeHours = 48) {
  const [{ Prisma }, { prisma }] = await Promise.all([
    import("@/src/lib/generated/prisma/client"),
    import("@/src/lib/prisma"),
  ]);
  const safeMaxAgeHours = clampPositiveInteger(maxAgeHours, 48);

  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM "RateLimitBucket"
    WHERE "updatedAt" < NOW() - (${safeMaxAgeHours} * INTERVAL '1 hour')
      AND ("blockedUntil" IS NULL OR "blockedUntil" < NOW())
  `);
}
