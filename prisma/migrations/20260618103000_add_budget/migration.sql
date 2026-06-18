CREATE TYPE "BudgetPeriod" AS ENUM ('weekly', 'monthly');

CREATE TYPE "BudgetScope" AS ENUM ('workspace', 'category');

CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "scope" "BudgetScope" NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "categoryId" TEXT,
    "period" "BudgetPeriod" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Budget_workspaceId_period_scope_scopeKey_key" ON "Budget"("workspaceId", "period", "scope", "scopeKey");
CREATE INDEX "Budget_workspaceId_period_idx" ON "Budget"("workspaceId", "period");
CREATE INDEX "Budget_workspaceId_categoryId_idx" ON "Budget"("workspaceId", "categoryId");

ALTER TABLE "Budget" ADD CONSTRAINT "Budget_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
