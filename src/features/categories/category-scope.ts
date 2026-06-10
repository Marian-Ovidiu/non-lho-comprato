export function getWorkspaceCategorySlugWhere(workspaceId: string, slug: string) {
  return {
    workspaceId_slug: {
      workspaceId,
      slug,
    },
  };
}
