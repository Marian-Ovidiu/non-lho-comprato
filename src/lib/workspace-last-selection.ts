import { prisma } from "@/src/lib/prisma";

export async function markWorkspaceSelectedForUser(
  userId: string,
  workspaceId: string,
  selectedAt = new Date(),
) {
  await prisma.workspaceMember.updateMany({
    where: {
      userId,
      workspaceId,
    },
    data: {
      lastSelectedAt: selectedAt,
    },
  });
}
