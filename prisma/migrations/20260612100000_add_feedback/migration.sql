CREATE TABLE "Feedback" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT,
    "workspaceId" TEXT,
    "type"        TEXT NOT NULL,
    "message"     TEXT NOT NULL,
    "route"       TEXT,
    "userAgent"   TEXT,
    "viewport"    TEXT,
    "timezone"    TEXT,
    "locale"      TEXT,
    "displayMode" TEXT,
    "appVersion"  TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Feedback_userId_idx"      ON "Feedback" ("userId");
CREATE INDEX "Feedback_workspaceId_idx" ON "Feedback" ("workspaceId");
CREATE INDEX "Feedback_createdAt_idx"   ON "Feedback" ("createdAt");
CREATE INDEX "Feedback_type_idx"        ON "Feedback" ("type");

ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
