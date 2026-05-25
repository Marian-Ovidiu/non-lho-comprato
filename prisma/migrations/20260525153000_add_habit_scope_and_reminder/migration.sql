-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "targetScope" TEXT NOT NULL DEFAULT 'self',
ADD COLUMN     "targetUserId" TEXT,
ADD COLUMN     "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderTime" TEXT;

-- CreateIndex
CREATE INDEX "Habit_targetUserId_idx" ON "Habit"("targetUserId");

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
