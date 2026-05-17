import "dotenv/config";

import {
  getLegacyWorkspaceId,
  resolveWorkspaceForAuthenticatedUser,
} from "../src/lib/auth/provisioning";
import { prisma } from "../src/lib/prisma";

async function main() {
  const productionWorkspaceId = getLegacyWorkspaceId();
  const marianAuthUser = await prisma.user.findUnique({
    where: {
      id: "9af7ba6f-6d31-4374-b1b7-dfd90dfc15df",
    },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
    },
  });

  if (!marianAuthUser) {
    throw new Error("Supabase Marian user not found for validation");
  }

  const emptyPrivateCookie = `private-${marianAuthUser.id}`;
  const resolved = await resolveWorkspaceForAuthenticatedUser(
    {
      id: marianAuthUser.id,
      email: marianAuthUser.email,
      name: marianAuthUser.name,
      image: marianAuthUser.image,
    },
    emptyPrivateCookie,
  );

  const entries = await prisma.entry.count({
    where: {
      workspaceId: resolved.workspace.id,
    },
  });

  console.log(
    JSON.stringify(
      {
        authUserId: marianAuthUser.id,
        resolvedWorkspaceId: resolved.workspace.id,
        resolvedWorkspaceName: resolved.workspace.name,
        accessibleWorkspaceIds: resolved.accessibleWorkspaces.map(
          (workspace) => workspace.id,
        ),
        entriesInResolvedWorkspace: entries,
        productionWorkspaceId,
        cookieIgnored:
          emptyPrivateCookie !== resolved.workspace.id &&
          resolved.workspace.id === productionWorkspaceId,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("Workspace adoption validation failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
