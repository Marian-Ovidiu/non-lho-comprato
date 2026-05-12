import { loadEnvConfig } from "@next/env";
import { prisma } from "@/src/lib/prisma";
import { getLegacyAuthMapping, getLegacyWorkspaceId } from "@/src/lib/auth/provisioning";

loadEnvConfig(process.cwd());

type MembershipRow = {
  workspaceId: string;
  userId: string;
};

function log(message: string) {
  console.log(`[auth-provisioning] ${message}`);
}

function fail(message: string): never {
  throw new Error(`[auth-provisioning] ${message}`);
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? null;
}

async function main() {
  const legacyWorkspaceId = getLegacyWorkspaceId();
  const memberships = await prisma.workspaceMember.findMany({
    select: {
      workspaceId: true,
      userId: true,
    },
  });

  const seen = new Set<string>();
  const duplicates: MembershipRow[] = [];

  for (const membership of memberships) {
    const key = `${membership.workspaceId}:${membership.userId}`;
    if (seen.has(key)) {
      duplicates.push(membership);
      continue;
    }

    seen.add(key);
  }

  if (duplicates.length > 0) {
    fail(`duplicate workspace memberships found: ${duplicates.length}`);
  }

  const legacyWorkspace = await prisma.workspace.findUnique({
    where: {
      id: legacyWorkspaceId,
    },
    select: {
      id: true,
      kind: true,
      ownerUserId: true,
    },
  });

  if (!legacyWorkspace) {
    fail(`legacy workspace missing: ${legacyWorkspaceId}`);
  }

  const legacyEmails = [
    normalizeEmail(process.env.LEGACY_MARIAN_EMAIL),
    normalizeEmail(process.env.LEGACY_MARTINA_EMAIL),
  ].filter((email): email is string => Boolean(email));

  for (const email of legacyEmails) {
    const mapping = getLegacyAuthMapping(email);

    if (!mapping) {
      fail(`legacy mapping missing for configured email: ${email}`);
    }

    const user = await prisma.user.findUnique({
      where: {
        id: mapping.userId,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      fail(`legacy mapped user missing: ${mapping.userId}`);
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId: mapping.userId,
        workspaceId: legacyWorkspaceId,
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      fail(
        `legacy mapped user is not a member of legacy workspace: ${mapping.userId} -> ${legacyWorkspaceId}`,
      );
    }
  }

  const privateWorkspaces = await prisma.workspace.findMany({
    where: {
      kind: "private",
    },
    select: {
      id: true,
      ownerUserId: true,
    },
  });

  const byOwner = new Map<string, number>();
  for (const workspace of privateWorkspaces) {
    byOwner.set(workspace.ownerUserId, (byOwner.get(workspace.ownerUserId) ?? 0) + 1);
  }

  for (const [ownerUserId, count] of byOwner.entries()) {
    if (count > 1) {
      fail(`duplicate private workspaces found for owner ${ownerUserId}: ${count}`);
    }
  }

  log(`legacy workspace verified: ${legacyWorkspace.id}`);
  log(`workspace memberships checked: ${memberships.length}`);
  log(`private workspace owners checked: ${byOwner.size}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
