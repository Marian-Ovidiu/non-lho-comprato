import { getCategories } from "@/src/actions/entries";
import { unstable_rethrow } from "next/navigation";
import { CraftedEntryForm } from "@/src/components/entries/crafted-entry-form";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { DEFAULT_CATEGORIES } from "@/src/lib/categories";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";
import {
  getDefaultBeneficiaryUserIds,
  getDefaultPaidByUserId,
} from "@/src/lib/workspace-members";
import { normalizeEntryPaymentMode } from "@/src/lib/entry-payment-mode";
import {
  getCurrentUser,
  getCurrentWorkspace,
  getCurrentWorkspaceMembers,
} from "@/src/lib/workspace-context";


function getSearchValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getSafeReturnTo(value: string | string[] | undefined): string {
  const returnTo = getSearchValue(value);

  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }

  return "/";
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

  let loadError: string | null = null;
  let categories: CategoryOption[] = [];
  let members: Awaited<ReturnType<typeof getCurrentWorkspaceMembers>> = [];
  let currentUser: Awaited<ReturnType<typeof getCurrentUser>> | null = null;
  let workspace: Awaited<ReturnType<typeof getCurrentWorkspace>> | null = null;

  try {
    const [categoriesResult, loadedMembers, loadedUser, loadedWorkspace] =
      await Promise.all([
        getCategories(),
        getCurrentWorkspaceMembers(),
        getCurrentUser(),
        getCurrentWorkspace(),
      ]);
    categories = categoriesResult;
    members = loadedMembers;
    currentUser = loadedUser;
    workspace = loadedWorkspace;
  } catch (error) {
    unstable_rethrow(error);
    loadError = formatEntryLoadError(error);
    console.error("Failed to load new entry page:", error);
  }

  if (loadError || !currentUser || !workspace) {
    return (
      <main className="pb-6">
        <div className="px-5 pt-5 pb-4">
          <DataLoadErrorBanner
            title="Impossibile aprire il nuovo movimento"
            message={loadError ?? "Sessione non disponibile. Riprova tra poco."}
          />
        </div>
      </main>
    );
  }

  const query = await searchParams;
  const title = getSearchValue(query.title)?.trim();
  const categoryId =
    getSearchValue(query.categoryId) ?? getSearchValue(query.category) ?? "";
  const mode = "spent";
  const savingContext =
    getSearchValue(query.savingContext) === "comparison"
      ? "comparison"
      : "none";
  const amountSpent =
    getSearchValue(query.amountSpent)?.trim() ??
    getSearchValue(query.realCost)?.trim();
  const comparisonAmount =
    getSearchValue(query.comparisonAmount)?.trim() ??
    getSearchValue(query.alternativeCost)?.trim();
  const realCost = getSearchValue(query.realCost)?.trim();
  const alternativeCost = getSearchValue(query.alternativeCost)?.trim();
  const date = getSearchValue(query.date)?.trim();
  const note = getSearchValue(query.note)?.trim();
  const paymentMode = normalizeEntryPaymentMode(getSearchValue(query.paymentMode));
  const returnTo = getSafeReturnTo(query.returnTo);
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
    <CraftedEntryForm
      categories={categories}
      members={members}
      workspaceKind={workspace.kind}
      initialPaidByUserId={paidByUserId}
      initialBeneficiaryUserIds={resolvedBeneficiaryUserIds}
      returnTo={returnTo}
      initialValues={{
        title,
        categoryId,
        mode,
        savingContext,
        amountSpent,
        comparisonAmount,
        realCost,
        alternativeCost,
        date,
        note,
        paymentMode,
        paidByUserId,
        beneficiaryUserIds: resolvedBeneficiaryUserIds,
      }}
    />
  );
}
