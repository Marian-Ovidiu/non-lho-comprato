# docs/product-ready

This folder tracks the structured product-readiness initiative for **Non l'ho comprato** — a personal/couple expense tracking PWA.

The initiative ran from Phase 0 (June 2026) through Phase 19 (June 2026) and brought the app from a private beta at approximately 7.5/10 to a product-ready state at approximately 9/10 for private beta and approximately 7/10 for external users.

---

## How to continue work safely

1. Read `CURRENT_STATUS.md` to understand what is done and what the known limitations are.
2. Read `NEXT_STEPS.md` for the recommended next phase and the rules that must not be broken.
3. Check `02_EXECUTION_CHECKLIST.md` — one phase at a time, no skipping.
4. Read the relevant phase notes doc before touching any area of the codebase.
5. Never change metric formulas, category slug logic, or shared balance logic without re-reading `03_ACCEPTANCE_CRITERIA.md` and `12_SHARED_BALANCE_CLOSURE_NOTES.md`.

---

## Phase index

### Setup and planning

| File | Phase | Description |
|---|---|---|
| `00_CONTEXT.md` | — | Product background, real data signal, non-goals, date rule |
| `01_METRICS_REFACTOR_PLAN.md` | — | Original plan for the metrics refactor initiative |
| `02_EXECUTION_CHECKLIST.md` | — | **Primary operational doc.** Phase-by-phase status tracker. |
| `03_ACCEPTANCE_CRITERIA.md` | — | Formal acceptance criteria for metrics, sharing, forms, UX wording |

### Historical phase docs — audit and analysis (no code changes)

| File | Phase | Description |
|---|---|---|
| `04_METRICS_AUDIT.md` | 1 | Full audit of metric calculation and display locations before the refactor |
| `05_LEGACY_METRICS_CLEANUP.md` | 4E | Classification of remaining legacy metric usages after Phase 4 migration |
| `13_INFORMATION_ARCHITECTURE_RECOMMENDATIONS.md` | 13 | Page-by-page data distribution audit and restructuring recommendations |
| `15A_HABIT_NOTIFICATIONS_AUDIT.md` | 15A | Full audit of notification delivery (found: no Web Push, open-app only) |
| `15B_CATEGORY_CUSTOMIZATION_AUDIT.md` | 15B | Category model audit, identified critical upsert bug, recommended schema additions |
| `17_ACCESSIBILITY_WCAG_AUDIT.md` | 17 | WCAG 2.2 AA audit across all pages — 3 critical blockers + 10 medium issues |

### Historical phase docs — implementation notes

| File | Phase | Description |
|---|---|---|
| `06_UX_WORDING_NOTES.md` | 6 | Approved product labels; replaced ambiguous saved/risparmio wording |
| `07_FORM_CLARITY_NOTES.md` | 7 | Three explicit entry intents (Ho speso / Speso+confronto / Non l'ho comprato) |
| `08_FEEDBACK_BETA_DEBUGGING_NOTES.md` | 8 | Floating feedback button, Feedback DB model, submitFeedback action |
| `09_PRIVATE_DEBUG_PAGE_NOTES.md` | 9 | Private /debug page for developer health checks |
| `10_LEGACY_DATA_NORMALIZATION_AUDIT.md` | 10 | Legacy data audit — found 2 missing paidByUserId, 1 orphan beneficiary |
| `11_LEGACY_SHARING_REPAIR_NOTES.md` | 11 | Repair script, cross-field guard, balance invariant tests |
| `12_SHARED_BALANCE_CLOSURE_NOTES.md` | 12 | Repair applied, post-repair audit clean, balance symmetric confirmed |
| `14_DATA_DISTRIBUTION_CLEANUP_NOTES.md` | 14 | 7 UI-only moves: couple balance promoted, cognitive clutter removed |
| `15A1_NOTIFICATION_QUICK_FIX_NOTES.md` | 15A.1 | SW-backed notification, notificationclick handler, Rome timezone fix |
| `16A_CATEGORY_LIFECYCLE_FOUNDATION_NOTES.md` | 16A | Schema: isDefault + archivedAt; upsert bug fix; mergeCategoryOptions |
| `16B_CATEGORY_MANAGEMENT_ACTIONS_NOTES.md` | 16B | 7 category server actions; slug generation; owner-only mutations |
| `16C_CATEGORY_MANAGEMENT_UI_NOTES.md` | 16C | /workspace/categories management page and CraftedCategoryManagement |
| `18_ACCESSIBILITY_HARDENING_NOTES.md` | 18 | P1 accessibility fixes: real labels, aria-pressed, focus ring, aria-describedby |

### Current operational docs

| File | Description |
|---|---|
| `CURRENT_STATUS.md` | What is done, what the stability rating is, known limitations, key invariants |
| `NEXT_STEPS.md` | Recommended next phase (Phase 20), rules for the design pass, later roadmap |
| `02_EXECUTION_CHECKLIST.md` | Phase gate tracker — always update after each accepted phase |

---

## Key invariants — never break these

- **Metric formulas** are in `src/lib/entry-metrics.ts` and tested in `src/lib/entry-metrics.test.ts`. Do not inline or duplicate them.
- **Category slugs** are stable once written. Do not rename slugs in code or data without a migration and tests.
- **Shared balance** must be antisymmetric. See `src/lib/workspace-balance.ts` and Phase 12 notes.
- **Date rule**: financial reporting uses entry `date`, not `createdAt`. See `00_CONTEXT.md`.
- **Accessibility**: Phase 18 added real `<label>` associations and `aria-pressed` states. Do not remove them.
