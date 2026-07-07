-- CreateTable
CREATE TABLE "WorkspaceSettlement" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceSettlement_workspaceId_date_idx" ON "WorkspaceSettlement"("workspaceId", "date");

-- CreateIndex
CREATE INDEX "WorkspaceSettlement_workspaceId_fromUserId_idx" ON "WorkspaceSettlement"("workspaceId", "fromUserId");

-- CreateIndex
CREATE INDEX "WorkspaceSettlement_workspaceId_toUserId_idx" ON "WorkspaceSettlement"("workspaceId", "toUserId");

-- CreateIndex
CREATE INDEX "WorkspaceSettlement_createdByUserId_idx" ON "WorkspaceSettlement"("createdByUserId");

-- AddForeignKey
ALTER TABLE "WorkspaceSettlement" ADD CONSTRAINT "WorkspaceSettlement_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSettlement" ADD CONSTRAINT "WorkspaceSettlement_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSettlement" ADD CONSTRAINT "WorkspaceSettlement_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSettlement" ADD CONSTRAINT "WorkspaceSettlement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
