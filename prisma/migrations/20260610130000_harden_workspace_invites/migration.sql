CREATE TYPE "WorkspaceInviteType" AS ENUM ('email', 'open_link');

ALTER TABLE "WorkspaceInvite"
ADD COLUMN "type" "WorkspaceInviteType" NOT NULL DEFAULT 'email',
ADD COLUMN "role" "WorkspaceMemberRole" NOT NULL DEFAULT 'member',
ADD COLUMN "revokedAt" TIMESTAMP(3),
ADD COLUMN "maxUses" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "usedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastUsedAt" TIMESTAMP(3);

UPDATE "WorkspaceInvite"
SET "type" = 'open_link',
    "maxUses" = 10
WHERE "invitedEmail" = 'open';

UPDATE "WorkspaceInvite"
SET "usedCount" = 1,
    "lastUsedAt" = COALESCE("acceptedAt", "lastUsedAt")
WHERE "acceptedAt" IS NOT NULL
  AND "usedCount" = 0;

CREATE INDEX "WorkspaceInvite_workspaceId_expiresAt_idx" ON "WorkspaceInvite"("workspaceId", "expiresAt");
CREATE INDEX "WorkspaceInvite_workspaceId_revokedAt_idx" ON "WorkspaceInvite"("workspaceId", "revokedAt");
