/**
 * Audits entry ownership data (paidByUserId + EntryBeneficiary rows).
 * The legacy `person` and `paidBy` columns were dropped in Step 3.
 */

import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { prisma } = await import("../src/lib/prisma");

  const allEntries = await prisma.entry.findMany({
    select: {
      id: true,
      paidByUserId: true,
      mode: true,
      savingContext: true,
      realCost: true,
      alternativeCost: true,
      savedAmount: true,
      workspaceId: true,
      beneficiaries: { select: { userId: true } },
    },
  });

  const total = allEntries.length;
  const missingPaidByUserId = allEntries.filter((e) => !e.paidByUserId).length;
  const zeroBeneficiaries = allEntries.filter((e) => e.beneficiaries.length === 0).length;
  const hasPaidByUserId = allEntries.filter((e) => !!e.paidByUserId).length;
  const hasBeneficiaries = allEntries.filter((e) => e.beneficiaries.length > 0).length;
  const sharedEntries = allEntries.filter((e) => e.beneficiaries.length > 1).length;
  const personalEntries = allEntries.filter((e) => e.beneficiaries.length === 1).length;
  const fullyModern = allEntries.filter((e) => !!e.paidByUserId && e.beneficiaries.length > 0).length;
  const fullyLegacy = allEntries.filter((e) => !e.paidByUserId && e.beneficiaries.length === 0).length;
  const paidByUserIdPresentZeroBeneficiaries = allEntries.filter((e) => !!e.paidByUserId && e.beneficiaries.length === 0).length;
  const beneficiariesPresentMissingPaidBy = allEntries.filter((e) => e.beneficiaries.length > 0 && !e.paidByUserId).length;
  const savedAmountNonzero = allEntries.filter((e) => Number(e.savedAmount) !== 0).length;
  const savedAmountZero = allEntries.filter((e) => Number(e.savedAmount) === 0).length;
  const likelyMisclassifiedAvoided = allEntries.filter(
    (e) => Number(e.realCost) === 0 && Number(e.alternativeCost) > 0 && e.mode === "spent",
  ).length;
  const likelyMisclassifiedComparison = allEntries.filter(
    (e) => Number(e.alternativeCost) !== Number(e.realCost) && e.savingContext === "none" && e.mode === "spent",
  ).length;

  const modeDistribution: Record<string, number> = {};
  const savingContextDistribution: Record<string, number> = {};
  const workspaceDistribution: Record<string, number> = {};

  for (const e of allEntries) {
    const mk = e.mode ?? "(null)";
    modeDistribution[mk] = (modeDistribution[mk] ?? 0) + 1;
    const sk = e.savingContext ?? "(null)";
    savingContextDistribution[sk] = (savingContextDistribution[sk] ?? 0) + 1;
    const wk = e.workspaceId ?? "(null)";
    workspaceDistribution[wk] = (workspaceDistribution[wk] ?? 0) + 1;
  }

  const result = {
    total,
    missingPaidByUserId,
    zeroBeneficiaries,
    hasPaidByUserId,
    hasBeneficiaries,
    sharedEntries,
    personalEntries,
    fullyModern,
    fullyLegacy,
    paidByUserIdPresentZeroBeneficiaries,
    beneficiariesPresentMissingPaidBy,
    savedAmountNonzero,
    savedAmountZero,
    likelyMisclassifiedAvoided,
    likelyMisclassifiedComparison,
    modeDistribution,
    savingContextDistribution,
    workspaceDistribution,
  };

  const missingPaidByDetail = allEntries
    .filter((e) => !e.paidByUserId)
    .map((e) => ({
      id: e.id,
      mode: e.mode,
      savingContext: e.savingContext,
      realCost: Number(e.realCost),
      beneficiaryCount: e.beneficiaries.length,
      workspaceId: e.workspaceId,
    }));

  const zeroBeneficiaryDetail = allEntries
    .filter((e) => e.beneficiaries.length === 0)
    .map((e) => ({
      id: e.id,
      paidByUserId: e.paidByUserId,
      mode: e.mode,
      realCost: Number(e.realCost),
      workspaceId: e.workspaceId,
    }));

  console.log(JSON.stringify({ ...result, missingPaidByDetail, zeroBeneficiaryDetail }, null, 2));

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
