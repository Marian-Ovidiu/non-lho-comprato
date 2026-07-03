import {
  toEntryMoneyView,
  type EntryMode,
  type EntrySavingContext,
} from "@/src/lib/entry-domain";
import { decryptOptionalText } from "@/src/lib/field-encryption";
import {
  normalizeEntryPaymentMode,
  type EntryPaymentModeValue,
} from "@/src/lib/entry-payment-mode";
import {
  getMemberLabel,
  resolveEntryPeopleFromRecord,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";

export type EntryWithCategory = {
  id: string;
  title: string;
  categoryId: string;
  realCost: unknown;
  alternativeCost: unknown;
  savedAmount: unknown;
  mode: unknown;
  savingContext: unknown;
  paymentMode: unknown;
  date: Date;
  note: string | null;
  source: string;
  beneficiaries: { userId: string }[];
  paidByUserId: string | null;
  habitOccurrenceId: string | null;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
    slug: string;
    color: string | null;
    icon: string | null;
  };
};

export type EntryEditRecord = {
  id: string;
  title: string;
  categoryId: string;
  realCost: unknown;
  alternativeCost: unknown;
  savedAmount: unknown;
  mode: unknown;
  savingContext: unknown;
  paymentMode: unknown;
  date: Date;
  note: string | null;
  source: string;
  paidByUserId: string | null;
  beneficiaries: { userId: string }[];
};

export type SerializableEntry = {
  id: string;
  title: string;
  categoryId: string;
  mode: EntryMode;
  savingContext: EntrySavingContext;
  paymentMode: EntryPaymentModeValue;
  realCost: number;
  alternativeCost: number;
  savedAmount: number;
  amountSpent: number;
  comparisonAmount: number;
  savingImpact: number;
  date: string;
  note: string | null;
  source: string;
  paidByUserId: string;
  paidByLabel: string | null;
  beneficiaryUserIds: string[];
  habitOccurrenceId: string | null;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
    color: string | null;
    icon: string | null;
  };
};

export type SerializableEntryEdit = {
  id: string;
  title: string;
  categoryId: string;
  mode: EntryMode;
  savingContext: EntrySavingContext;
  paymentMode: EntryPaymentModeValue;
  realCost: number;
  alternativeCost: number;
  savedAmount: number;
  amountSpent: number;
  comparisonAmount: number;
  savingImpact: number;
  date: string;
  note: string | null;
  source: string;
  paidByUserId: string;
  beneficiaryUserIds: string[];
};

// Fields shared by the list and edit DTOs, so the money view, people
// resolution and note decryption stay defined in one place.
function serializeEntryCore(
  entry: EntryEditRecord,
  members: WorkspaceMemberOption[],
): SerializableEntryEdit {
  const people = resolveEntryPeopleFromRecord(entry, members);
  const money = toEntryMoneyView(entry);

  return {
    id: entry.id,
    title: entry.title,
    categoryId: entry.categoryId,
    mode: money.mode,
    savingContext: money.savingContext,
    paymentMode: normalizeEntryPaymentMode(entry.paymentMode),
    realCost: money.realCost,
    alternativeCost: money.alternativeCost,
    savedAmount: money.savedAmount,
    amountSpent: money.amountSpent,
    comparisonAmount: money.comparisonAmount,
    savingImpact: money.savingImpact,
    date: entry.date.toISOString(),
    note: decryptOptionalText(entry.note),
    source: entry.source,
    paidByUserId: people.paidByUserId,
    beneficiaryUserIds: people.beneficiaryUserIds,
  };
}

export function serializeEntryEdit(
  entry: EntryEditRecord,
  members: WorkspaceMemberOption[],
): SerializableEntryEdit {
  return serializeEntryCore(entry, members);
}

export function serializeEntry(
  entry: EntryWithCategory,
  members: WorkspaceMemberOption[],
): SerializableEntry {
  const core = serializeEntryCore(entry, members);

  return {
    ...core,
    paidByLabel: getMemberLabel(members, core.paidByUserId),
    habitOccurrenceId: entry.habitOccurrenceId,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    category: {
      id: entry.category.id,
      name: entry.category.name,
      slug: entry.category.slug,
      color: entry.category.color,
      icon: entry.category.icon,
    },
  };
}
