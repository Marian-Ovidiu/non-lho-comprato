import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { prisma } = await import("../src/lib/prisma");

  const allEntries = await prisma.entry.findMany({
    select: {
      id: true,
      person: true,
      paidBy: true,
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

  // entries missing modern fields
  // mode has a DB default of "spent", so "missing" means never explicitly set —
  // we can identify these by checking whether mode still matches the legacy inferred value.
  // But since the DB enforces a default, ALL rows have mode. We count them as present.
  // We report entries per mode/savingContext value distribution instead.

  const missingMode = allEntries.filter((e) => !e.mode).length;
  const missingSavingContext = allEntries.filter((e) => !e.savingContext).length;
  const missingPaidByUserId = allEntries.filter((e) => !e.paidByUserId).length;
  const zeroBeneficiaries = allEntries.filter(
    (e) => e.beneficiaries.length === 0,
  ).length;

  // mode distribution
  const modeDistribution: Record<string, number> = {};
  for (const e of allEntries) {
    const key = e.mode ?? "(null)";
    modeDistribution[key] = (modeDistribution[key] ?? 0) + 1;
  }

  // savingContext distribution
  const savingContextDistribution: Record<string, number> = {};
  for (const e of allEntries) {
    const key = e.savingContext ?? "(null)";
    savingContextDistribution[key] = (savingContextDistribution[key] ?? 0) + 1;
  }

  // person distribution
  const personDistribution: Record<string, number> = {};
  for (const e of allEntries) {
    const key = e.person ?? "(null)";
    personDistribution[key] = (personDistribution[key] ?? 0) + 1;
  }

  // paidBy (legacy enum) distribution
  const paidByDistribution: Record<string, number> = {};
  for (const e of allEntries) {
    const key = e.paidBy ?? "(null)";
    paidByDistribution[key] = (paidByDistribution[key] ?? 0) + 1;
  }

  // TUTTI entries with zero beneficiaries
  const tuttiZeroBeneficiaries = allEntries.filter(
    (e) => e.person === "TUTTI" && e.beneficiaries.length === 0,
  ).length;

  // paidByUserId present but zero beneficiaries
  const paidByUserIdPresentZeroBeneficiaries = allEntries.filter(
    (e) => !!e.paidByUserId && e.beneficiaries.length === 0,
  ).length;

  // beneficiaries present but paidByUserId missing
  const beneficiariesPresentMissingPaidBy = allEntries.filter(
    (e) => e.beneficiaries.length > 0 && !e.paidByUserId,
  ).length;

  // both paidByUserId and beneficiaries present (modern)
  const fullyModern = allEntries.filter(
    (e) => !!e.paidByUserId && e.beneficiaries.length > 0,
  ).length;

  // both missing (legacy only)
  const fullyLegacy = allEntries.filter(
    (e) => !e.paidByUserId && e.beneficiaries.length === 0,
  ).length;

  // paidByUserId disagrees with legacy paidBy enum
  // (both present, but paidBy enum cannot be verified without user mapping — report counts)
  const hasPaidByUserId = allEntries.filter((e) => !!e.paidByUserId).length;
  const hasBeneficiaries = allEntries.filter(
    (e) => e.beneficiaries.length > 0,
  ).length;
  const sharedEntries = allEntries.filter(
    (e) => e.beneficiaries.length > 1,
  ).length;
  const personalEntries = allEntries.filter(
    (e) => e.beneficiaries.length === 1,
  ).length;

  // entries where person=TUTTI but beneficiaries count is 1 (mismatch)
  const tuttiButSingleBeneficiary = allEntries.filter(
    (e) => e.person === "TUTTI" && e.beneficiaries.length === 1,
  ).length;

  // entries where person != TUTTI but beneficiaries count > 1 (mismatch)
  const notTuttiButSharedBeneficiaries = allEntries.filter(
    (e) => e.person !== "TUTTI" && e.beneficiaries.length > 1,
  ).length;

  // savedAmount distribution: nonzero, zero
  const savedAmountNonzero = allEntries.filter(
    (e) => Number(e.savedAmount) !== 0,
  ).length;
  const savedAmountZero = allEntries.filter(
    (e) => Number(e.savedAmount) === 0,
  ).length;

  // entries where realCost=0 and alternativeCost>0 but mode=spent (legacy avoided)
  const likelyMisclassifiedAvoided = allEntries.filter(
    (e) =>
      Number(e.realCost) === 0 &&
      Number(e.alternativeCost) > 0 &&
      e.mode === "spent",
  ).length;

  // entries where alternativeCost != realCost but savingContext=none (legacy comparison)
  const likelyMisclassifiedComparison = allEntries.filter(
    (e) =>
      Number(e.alternativeCost) !== Number(e.realCost) &&
      e.savingContext === "none" &&
      e.mode === "spent",
  ).length;

  // workspace distribution
  const workspaceDistribution: Record<string, number> = {};
  for (const e of allEntries) {
    const key = e.workspaceId ?? "(null)";
    workspaceDistribution[key] = (workspaceDistribution[key] ?? 0) + 1;
  }

  const result = {
    total,
    missingMode,
    missingSavingContext,
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
    tuttiZeroBeneficiaries,
    tuttiButSingleBeneficiary,
    notTuttiButSharedBeneficiaries,
    savedAmountNonzero,
    savedAmountZero,
    likelyMisclassifiedAvoided,
    likelyMisclassifiedComparison,
    modeDistribution,
    savingContextDistribution,
    personDistribution,
    paidByDistribution,
    workspaceDistribution,
  };

  // detail: entries missing paidByUserId
  const missingPaidByDetail = allEntries
    .filter((e) => !e.paidByUserId)
    .map((e) => ({
      id: e.id,
      person: e.person,
      paidBy: e.paidBy,
      mode: e.mode,
      savingContext: e.savingContext,
      realCost: Number(e.realCost),
      beneficiaryCount: e.beneficiaries.length,
      workspaceId: e.workspaceId,
    }));

  // detail: entries with zero beneficiaries
  const zeroBeneficiaryDetail = allEntries
    .filter((e) => e.beneficiaries.length === 0)
    .map((e) => ({
      id: e.id,
      person: e.person,
      paidBy: e.paidBy,
      paidByUserId: e.paidByUserId,
      mode: e.mode,
      realCost: Number(e.realCost),
      workspaceId: e.workspaceId,
    }));

  console.log(JSON.stringify({ ...result, missingPaidByDetail, zeroBeneficiaryDetail }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/prisma");
    await prisma.$disconnect();
  });