CREATE TYPE "EntryPaymentMode" AS ENUM ('single_payer', 'joint_account');

ALTER TABLE "Entry"
  ADD COLUMN "paymentMode" "EntryPaymentMode" NOT NULL DEFAULT 'single_payer';
