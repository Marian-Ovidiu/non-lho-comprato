CREATE TABLE "RateLimitBucket" (
    "key"          TEXT NOT NULL,
    "scope"        TEXT NOT NULL,
    "windowStart"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "count"        INTEGER NOT NULL DEFAULT 0,
    "blockedUntil" TIMESTAMP(3),
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "RateLimitBucket_scope_idx" ON "RateLimitBucket" ("scope");
CREATE INDEX "RateLimitBucket_blockedUntil_idx" ON "RateLimitBucket" ("blockedUntil");
CREATE INDEX "RateLimitBucket_updatedAt_idx" ON "RateLimitBucket" ("updatedAt");
