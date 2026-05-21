import { getCategories } from "@/src/actions/entries";
import { EntryForm } from "@/src/components/entries/entry-form";
import { PageHeader } from "@/src/components/layout/page-header";
import { DEFAULT_CATEGORIES } from "@/src/lib/categories";
import {
  getDefaultBeneficiaryUserIds,
  getDefaultPaidByUserId,
} from "@/src/lib/workspace-members";
import {
  getCurrentUser,
  getCurrentWorkspaceMembers,
  getCurrentWorkspaceUiContext,
} from "@/src/lib/workspace-context";
import { spacing } from "@/src/lib/spacing";

export const dynamic = "force-dynamic";

function getSearchValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getSearchUserIds(
  value: string | string[] | undefined,
  members: Awaited<ReturnType<typeof getCurrentWorkspaceMembers>>,
): string[] {
  const memberIds = new Set(members.map((member) => member.userId));

  return (Array.isArray(value) ? value : value?.split(",") ?? [])
    .map((item) => item.trim())
    .filter((item) => memberIds.has(item));
}

export default async function NewEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  type CategoryOption = Awaited<ReturnType<typeof getCategories>>[number];
  const [categoriesResult, workspace, members, currentUser] = await Promise.all([
    getCategories().catch(() => [] as CategoryOption[]),
    getCurrentWorkspaceUiContext(),
    getCurrentWorkspaceMembers(),
    getCurrentUser(),
  ]);

  let categories: CategoryOption[] = categoriesResult;
  const query = await searchParams;
  const title = getSearchValue(query.title)?.trim();
  const categoryId =
    getSearchValue(query.categoryId) ?? getSearchValue(query.category) ?? "";
  const realCost = getSearchValue(query.realCost)?.trim();
  const alternativeCost = getSearchValue(query.alternativeCost)?.trim();
  const date = getSearchValue(query.date)?.trim();
  const paidByUserIdRaw = getSearchValue(query.paidByUserId);
  const paidByUserId =
    paidByUserIdRaw && members.some((member) => member.userId === paidByUserIdRaw)
      ? paidByUserIdRaw
      : getDefaultPaidByUserId(members, currentUser.id);
  const beneficiaryUserIds = getSearchUserIds(
    getSearchValue(query.beneficiaryUserIds) ?? getSearchValue(query.beneficiaries),
    members,
  );
  const resolvedBeneficiaryUserIds =
    beneficiaryUserIds.length > 0
      ? beneficiaryUserIds
      : getDefaultBeneficiaryUserIds(members, paidByUserId);

  if (categories.length === 0) {
    categories = DEFAULT_CATEGORIES.map((category) => ({
      id: category.slug,
      name: category.name,
      slug: category.slug,
      color: category.color,
      icon: category.icon,
    })) as CategoryOption[];
  }

  return (
    <main className={spacing.pageStack}>
      <PageHeader
        backHref="/entries"
        title="Nuovo movimento"
        context={`Salva in ${workspace.name}.`}
        chips={[
          {
            label: workspace.isShared ? "Condiviso" : "Privato",
            tone: workspace.isShared ? "premium" : "default",
          },
        ]}
      />

      <EntryForm
        categories={categories}
        members={members}
        currentUserId={currentUser.id}
        workspaceId={workspace.id}
        initialValues={{
          title,
          categoryId,
          realCost,
          alternativeCost,
          paidByUserId,
          beneficiaryUserIds: resolvedBeneficiaryUserIds,
          date,
        }}
      />
    </main>
  );
}
