"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as CraftedLabel, Rule, Serif } from "@/components/crafted";
import { useTranslations } from "@/src/components/language/language-context";
import { CraftedCategoryIconPicker } from "@/src/components/workspace/crafted-category-icon-picker";
import type { Translations } from "@/src/lib/i18n/types";

import type { CategoryManagementItem } from "@/src/actions/categories";
import {
  archiveCategory,
  createCategory,
  deleteCategory,
  resetDefaultCategories,
  restoreCategory,
  updateCategory,
} from "@/src/actions/categories";

// ── helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_INPUT_CLASS =
  "h-10 rounded-[var(--r-control)] border-line bg-surface-muted px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring/50";

const CATEGORY_BUTTON_CLASS =
  "rounded-[var(--r-cta)] border-line px-4";

function usageSummary(item: CategoryManagementItem, tw: Translations["workspace"]): string {
  const parts: string[] = [];
  if (item.entriesCount > 0) parts.push(`${item.entriesCount} ${tw.catUsageMov}`);
  if (item.habitsCount > 0) parts.push(`${item.habitsCount} ${tw.catUsageRic}`);
  return parts.join(" · ");
}

// ── edit form ─────────────────────────────────────────────────────────────────

type EditFormProps = {
  category: CategoryManagementItem;
  onClose: () => void;
  onSaved: () => void;
};

function CategoryEditForm({ category, onClose, onSaved }: EditFormProps) {
  const t = useTranslations();
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon ?? "");
  const [color, setColor] = useState(category.color ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("name", name);
    if (icon) fd.set("icon", icon);
    if (color) fd.set("color", color);
    setError(null);
    startTransition(async () => {
      const result = await updateCategory(category.id, fd);
      if (result.success) {
        onSaved();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 py-[var(--sp-row-y)]">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-cat-name" className="font-num text-[10px] uppercase tracking-[0.22em] text-ink-3">{t.workspace.catNameLabel}</label>
        <Input
          id="edit-cat-name"
          className={CATEGORY_INPUT_CLASS}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.workspace.catNamePlaceholder}
          maxLength={80}
          required
          autoFocus
        />
      </div>
      <CraftedCategoryIconPicker
        id="edit-cat-icon"
        value={icon}
        onChange={setIcon}
      />
      <div className="grid grid-cols-1 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-cat-color" className="font-num text-[10px] uppercase tracking-[0.22em] text-ink-3">{t.workspace.catColorLabel}</label>
          <Input
            id="edit-cat-color"
            className={CATEGORY_INPUT_CLASS}
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="es. #a3e635"
          />
        </div>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending} className={CATEGORY_BUTTON_CLASS}>
          {isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {t.workspace.catSaveChanges}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={isPending}
        >
          {t.workspace.catCancel}
        </Button>
      </div>
    </form>
  );
}

// ── category row ──────────────────────────────────────────────────────────────

type CategoryRowProps = {
  category: CategoryManagementItem;
  isEditing: boolean;
  onEditToggle: (id: string | null) => void;
  onDone: () => void;
};

function CategoryRow({
  category,
  isEditing,
  onEditToggle,
  onDone,
}: CategoryRowProps) {
  const t = useTranslations();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const counts = usageSummary(category, t.workspace);
  const isArchived = category.archivedAt !== null;

  function runAction(fn: () => Promise<{ success: boolean; message: string }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      if (result.success) {
        onDone();
      } else {
        setMessage(result.message);
      }
    });
  }

  function handleArchive() {
    runAction(() => archiveCategory(category.id));
  }

  function handleRestore() {
    runAction(() => restoreCategory(category.id));
  }

  function handleDelete() {
    const confirmed = window.confirm(t.workspace.catDeleteConfirm);
    if (!confirmed) return;
    runAction(() => deleteCategory(category.id));
  }

  if (isEditing) {
    return (
      <CategoryEditForm
        category={category}
        onClose={() => onEditToggle(null)}
        onSaved={() => {
          onEditToggle(null);
          onDone();
        }}
      />
    );
  }

  return (
    <div className={isPending ? "pointer-events-none opacity-60" : undefined}>
      <div className="flex flex-col gap-2 py-[var(--sp-row-y)] sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-[450]">{category.name}</span>
            <span className="rounded-full border border-line px-[9px] py-[3px] font-num text-[9.5px] uppercase leading-none tracking-[0.12em] text-ink-3">
              {category.isDefault ? t.workspace.catDefaultBadge : t.workspace.catCustomBadge}
            </span>
            {isArchived ? (
              <span className="rounded-full border border-warm/25 bg-warm/5 px-[9px] py-[3px] font-num text-[9.5px] uppercase leading-none tracking-[0.12em] text-warm">
                {t.workspace.catArchivedBadge}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-mono text-xs leading-5 text-ink-3">{category.slug}</span>
            {counts ? (
              <span className="text-xs text-ink-3">{counts}</span>
            ) : null}
            {category.color ? (
              <span
                className="inline-block size-3 rounded-full border border-line"
                style={{ backgroundColor: category.color }}
                title={category.color}
              />
            ) : null}
            {category.icon ? (
              <span className="text-xs text-ink-3">{category.icon}</span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {!isArchived ? (
            <button
              type="button"
              onClick={() => onEditToggle(category.id)}
              disabled={isPending}
              aria-label={t.workspace.catEditAriaLabel(category.name)}
              className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground underline-offset-4 transition-opacity hover:underline disabled:opacity-50"
            >
              <Pencil className="size-3.5" aria-hidden />
              {t.workspace.catEditButton}
            </button>
          ) : null}
          {!isArchived ? (
            <button
              type="button"
              onClick={handleArchive}
              disabled={isPending}
              aria-label={t.workspace.catArchiveAriaLabel(category.name)}
              className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground underline-offset-4 transition-opacity hover:underline disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Archive className="size-3.5" aria-hidden />
              )}
              {t.workspace.catArchiveButton}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRestore}
              disabled={isPending}
              aria-label={t.workspace.catRestoreAriaLabel(category.name)}
              className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground underline-offset-4 transition-opacity hover:underline disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <RotateCcw className="size-3.5" aria-hidden />
              )}
              {t.workspace.catRestoreButton}
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            aria-label={t.workspace.catDeleteAriaLabel(category.name)}
            className="inline-flex items-center gap-1.5 text-[13px] text-destructive underline-offset-4 transition-opacity hover:underline disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-3.5" aria-hidden />
            )}
            {t.workspace.catDeleteButton}
          </button>
        </div>
      </div>
      {message ? (
        <p className="pb-2 text-xs leading-5 text-destructive">{message}</p>
      ) : null}
    </div>
  );
}

// ── create form ───────────────────────────────────────────────────────────────

type CreateFormProps = {
  onCreated: () => void;
  onCancel: () => void;
};

function CategoryCreateForm({ onCreated, onCancel }: CreateFormProps) {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("name", name);
    if (icon) fd.set("icon", icon);
    if (color) fd.set("color", color);
    setError(null);
    startTransition(async () => {
      const result = await createCategory(fd);
      if (result.success) {
        onCreated();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 border-y border-line py-[var(--sp-section-y)]"
    >
      <CraftedLabel className="block">{t.workspace.catNewTitle}</CraftedLabel>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="create-cat-name" className="font-num text-[10px] uppercase tracking-[0.22em] text-ink-3">{t.workspace.catNameLabel}</label>
        <Input
          id="create-cat-name"
          className={CATEGORY_INPUT_CLASS}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.workspace.catCreatePlaceholder}
          maxLength={80}
          required
          autoFocus
        />
      </div>
      <CraftedCategoryIconPicker
        id="create-cat-icon"
        value={icon}
        onChange={setIcon}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="create-cat-color" className="font-num text-[10px] uppercase tracking-[0.22em] text-ink-3">
          {t.workspace.catColorOptionalLabel}
        </label>
        <Input
          id="create-cat-color"
          className={CATEGORY_INPUT_CLASS}
          value={color}
          onChange={(e) => setColor(e.target.value)}
          placeholder="es. #a3e635"
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending} className={CATEGORY_BUTTON_CLASS}>
          {isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {t.workspace.catCreateButton}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
        >
          {t.workspace.catCancel}
        </Button>
      </div>
    </form>
  );
}

// ── main component ────────────────────────────────────────────────────────────

type Props = {
  initialCategories: CategoryManagementItem[];
};

export function CraftedCategoryManagement({ initialCategories }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetIsPending, startResetTransition] = useTransition();

  const activeCategories = initialCategories.filter((c) => c.archivedAt === null);
  const archivedCategories = initialCategories.filter(
    (c) => c.archivedAt !== null,
  );

  function handleDone() {
    router.refresh();
  }

  function handleReset() {
    const confirmed = window.confirm(t.workspace.catResetConfirm);
    if (!confirmed) return;
    setResetMessage(null);
    startResetTransition(async () => {
      const result = await resetDefaultCategories();
      setResetMessage(result.message);
      if (result.success) router.refresh();
    });
  }

  return (
    <div>
      {/* Create */}
      <section className="-mx-4 px-[var(--sp-page-x)] pb-4 pt-5 sm:-mx-6 lg:-mx-8">
        {showCreate ? (
          <CategoryCreateForm
            onCreated={() => {
              setShowCreate(false);
              router.refresh();
            }}
            onCancel={() => setShowCreate(false)}
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreate(true)}
            className="w-full rounded-[var(--r-cta)] border-line"
          >
            {t.workspace.catCreateCta}
          </Button>
        )}
      </section>

      <Rule />

      {/* Active */}
      <section className="-mx-4 px-[var(--sp-page-x)] py-[var(--sp-section-y)] sm:-mx-6 lg:-mx-8">
        <CraftedLabel className="mb-4 block">{t.workspace.catActiveTitle}</CraftedLabel>
        {activeCategories.length === 0 ? (
          <Serif className="text-sm text-ink-3">
            {t.workspace.catEmptyActive}
          </Serif>
        ) : (
          <div>
            {activeCategories.map((cat, index) => (
              <div key={cat.id}>
                <CategoryRow
                  category={cat}
                  isEditing={editingId === cat.id}
                  onEditToggle={setEditingId}
                  onDone={handleDone}
                />
                {index < activeCategories.length - 1 ? <Rule soft /> : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Archived */}
      {archivedCategories.length > 0 ? (
        <>
          <Rule />
          <section className="-mx-4 px-[var(--sp-page-x)] py-[var(--sp-section-y)] sm:-mx-6 lg:-mx-8">
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className="flex w-full items-center justify-between"
            >
              <CraftedLabel>
                {t.workspace.catArchivedTitle(archivedCategories.length)}
              </CraftedLabel>
              {showArchived ? (
                <ChevronUp className="size-4 text-ink-3" aria-hidden />
              ) : (
                <ChevronDown className="size-4 text-ink-3" aria-hidden />
              )}
            </button>
            {showArchived ? (
              <div className="mt-4">
                {archivedCategories.map((cat, index) => (
                  <div key={cat.id}>
                    <CategoryRow
                      category={cat}
                      isEditing={editingId === cat.id}
                      onEditToggle={setEditingId}
                      onDone={handleDone}
                    />
                    {index < archivedCategories.length - 1 ? (
                      <Rule soft />
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      <Rule />

      {/* Reset */}
      <section className="-mx-4 px-[var(--sp-page-x)] py-[var(--sp-section-y)] sm:-mx-6 lg:-mx-8">
        <CraftedLabel className="mb-2 block">
          {t.workspace.catResetTitle}
        </CraftedLabel>
        <Serif className="mb-4 block text-sm text-ink-3">
          {t.workspace.catResetDesc}
        </Serif>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={resetIsPending}
          className="rounded-[var(--r-cta)] border-line"
        >
          {resetIsPending ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : null}
          {t.workspace.catResetButton}
        </Button>
        {resetMessage ? (
          <p className="mt-2 text-xs text-muted-foreground">{resetMessage}</p>
        ) : null}
      </section>
    </div>
  );
}
