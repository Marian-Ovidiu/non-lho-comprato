/**
 * Repairs entries that have missing paidByUserId or missing beneficiaries
 * when the legacy person/paidBy enum fields are unambiguous.
 *
 * Usage:
 *   npm run repair:legacy-sharing            # dry-run (no writes)
 *   npm run repair:legacy-sharing -- --apply # execute repairs
 */

import { config } from "dotenv";

config({ path: ".env.local" });

type MemberOption = {
  userId: string;
  label: string;
  name: string | null;
  email: string | null;
};

type RepairPlan = {
  entryId: string;
  workspaceId: string;
  setPaidByUserId?: string;
  createBeneficiaryUserIds?: string[];
  reasons: string[];
};

type SkippedEntry = {
  entryId: string;
  reason: string;
};

function getLabel(m: Pick<MemberOption, "name" | "email" | "userId">): string {
  return m.name?.trim() || m.email?.trim() || "Membro";
}

function sortMembers(members: MemberOption[]): MemberOption[] {
  return [...members].sort((a, b) => {
    const cmp = a.label.localeCompare(b.label, "it");
    return cmp !== 0 ? cmp : a.userId.localeCompare(b.userId);
  });
}

function dedupeMembers(members: MemberOption[]): MemberOption[] {
  const LEGACY_MARIAN = "legacy-marian";
  const LEGACY_MARTINA = "legacy-martina";
  const hasCanonical = members.some(
    (m) => m.userId !== LEGACY_MARIAN && m.userId !== LEGACY_MARTINA,
  );
  return hasCanonical
    ? members.filter((m) => m.userId !== LEGACY_MARIAN)
    : members;
}

async function main() {
  const { prisma } = await import("../src/lib/prisma");

  const apply = process.argv.includes("--apply");

  console.log(
    apply
      ? "[APPLY] Changes will be written to the database."
      : "[DRY-RUN] No changes will be written. Pass --apply to execute.",
  );
  console.log("");

  const problemEntries = await prisma.entry.findMany({
    where: {
      OR: [{ paidByUserId: null }, { beneficiaries: { none: {} } }],
    },
    select: {
      id: true,
      workspaceId: true,
      person: true,
      paidBy: true,
      paidByUserId: true,
      realCost: true,
      mode: true,
      savingContext: true,
      beneficiaries: { select: { userId: true } },
    },
  });

  console.log(`Entries scanned with ownership gaps: ${problemEntries.length}`);

  if (problemEntries.length === 0) {
    console.log("Nothing to repair.");
    return;
  }

  console.log("");

  const memberCache = new Map<string, MemberOption[]>();

  const getMembers = async (workspaceId: string): Promise<MemberOption[]> => {
    if (memberCache.has(workspaceId)) return memberCache.get(workspaceId)!;

    const rows = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });

    const members = dedupeMembers(
      rows.map((r) => ({
        userId: r.userId,
        name: r.user.name,
        email: r.user.email,
        label: getLabel({ userId: r.userId, name: r.user.name, email: r.user.email }),
      })),
    );

    memberCache.set(workspaceId, members);
    return members;
  };

  const repairs: RepairPlan[] = [];
  const skipped: SkippedEntry[] = [];

  for (const entry of problemEntries) {
    if (!entry.workspaceId) {
      skipped.push({
        entryId: entry.id,
        reason: "no workspaceId — cannot resolve member mapping",
      });
      continue;
    }

    const members = await getMembers(entry.workspaceId);
    const sorted = sortMembers(members);

    if (sorted.length < 2) {
      skipped.push({
        entryId: entry.id,
        reason: `workspace ${entry.workspaceId} has ${sorted.length} member(s) — cannot resolve MARIAN/MARTINA slots`,
      });
      continue;
    }

    const primaryUserId = sorted[0]!.userId;
    const secondaryUserId = sorted[1]!.userId;

    const reasons: string[] = [];
    const plan: RepairPlan = {
      entryId: entry.id,
      workspaceId: entry.workspaceId,
      reasons,
    };

    if (!entry.paidByUserId) {
      const legacyPaidBy = entry.paidBy;

      if (legacyPaidBy === "MARIAN") {
        plan.setPaidByUserId = primaryUserId;
        reasons.push(
          `paidByUserId ← primary member ${primaryUserId} (paidBy=MARIAN)`,
        );
      } else if (legacyPaidBy === "MARTINA") {
        plan.setPaidByUserId = secondaryUserId;
        reasons.push(
          `paidByUserId ← secondary member ${secondaryUserId} (paidBy=MARTINA)`,
        );
      } else {
        skipped.push({
          entryId: entry.id,
          reason: `paidBy=${legacyPaidBy} is not MARIAN or MARTINA — ambiguous`,
        });
        continue;
      }
    }

    if (entry.beneficiaries.length === 0) {
      const legacyPerson = entry.person;

      if (legacyPerson === "MARIAN") {
        plan.createBeneficiaryUserIds = [primaryUserId];
        reasons.push(
          `beneficiary ← primary member ${primaryUserId} (person=MARIAN)`,
        );
      } else if (legacyPerson === "MARTINA") {
        plan.createBeneficiaryUserIds = [secondaryUserId];
        reasons.push(
          `beneficiary ← secondary member ${secondaryUserId} (person=MARTINA)`,
        );
      } else if (legacyPerson === "TUTTI") {
        if (sorted.length === 2) {
          plan.createBeneficiaryUserIds = [primaryUserId, secondaryUserId];
          reasons.push(
            `beneficiaries ← both members [${primaryUserId}, ${secondaryUserId}] (person=TUTTI, 2-member workspace)`,
          );
        } else {
          skipped.push({
            entryId: entry.id,
            reason: `person=TUTTI but workspace ${entry.workspaceId} has ${sorted.length} members — ambiguous`,
          });
          continue;
        }
      } else {
        skipped.push({
          entryId: entry.id,
          reason: `person=${legacyPerson} — unrecognised legacy value`,
        });
        continue;
      }
    }

    if (reasons.length > 0) {
      repairs.push(plan);
    }
  }

  console.log(`Repairs planned: ${repairs.length}`);
  console.log(`Entries skipped: ${skipped.length}`);
  console.log("");

  if (repairs.length > 0) {
    console.log("=== PLANNED REPAIRS ===");
    for (const r of repairs) {
      console.log(`  Entry ${r.entryId}  workspace=${r.workspaceId}`);
      if (r.setPaidByUserId) {
        console.log(`    SET  paidByUserId = ${r.setPaidByUserId}`);
      }
      if (r.createBeneficiaryUserIds) {
        for (const uid of r.createBeneficiaryUserIds) {
          console.log(`    CREATE EntryBeneficiary userId=${uid}`);
        }
      }
      for (const reason of r.reasons) {
        console.log(`    →  ${reason}`);
      }
    }
    console.log("");
  }

  if (skipped.length > 0) {
    console.log("=== SKIPPED (ambiguous or unresolvable) ===");
    for (const s of skipped) {
      console.log(`  Entry ${s.entryId}: ${s.reason}`);
    }
    console.log("");
  }

  if (!apply) {
    console.log(
      "[DRY-RUN COMPLETE] Run with --apply to write these changes to the database.",
    );
    return;
  }

  let paidByBackfilled = 0;
  let beneficiariesCreated = 0;

  for (const repair of repairs) {
    await prisma.$transaction(async (tx) => {
      if (repair.setPaidByUserId) {
        await tx.entry.update({
          where: { id: repair.entryId },
          data: { paidByUserId: repair.setPaidByUserId },
        });
        paidByBackfilled++;
      }

      for (const userId of repair.createBeneficiaryUserIds ?? []) {
        await tx.entryBeneficiary.upsert({
          where: { entryId_userId: { entryId: repair.entryId, userId } },
          create: { entryId: repair.entryId, userId },
          update: {},
        });
        beneficiariesCreated++;
      }
    });

    console.log(`  Repaired entry ${repair.entryId}`);
  }

  console.log("");
  console.log("=== SUMMARY ===");
  console.log(`  Entries scanned with ownership gaps : ${problemEntries.length}`);
  console.log(`  Entries repaired                    : ${repairs.length}`);
  console.log(`  paidByUserId backfilled             : ${paidByBackfilled}`);
  console.log(`  EntryBeneficiary rows created       : ${beneficiariesCreated}`);
  console.log(`  Entries skipped                     : ${skipped.length}`);
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
