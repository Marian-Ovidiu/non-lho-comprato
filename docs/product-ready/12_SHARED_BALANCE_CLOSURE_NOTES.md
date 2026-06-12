# Phase 12 — Shared Balance Closure

Date: 2026-06-12

Status: **Closed.**

---

## Original Bug

**Reported symptom:**
- Marian's dashboard showed: "Marian owes Martina ~315€"
- Martina's dashboard showed: "Martina owes Marian ~305€"

Both users saw themselves as the debtor, in opposite directions, with a ~10€ discrepancy.

**Required invariant violated:**
```
balance(A, B) = -balance(B, A)
```

---

## Root Cause

`computeCoupleWorkspaceBalance` (`src/lib/workspace-balance.ts`) processes shared entries
(beneficiaries ≥ 2) by:

1. Adding each beneficiary's share to `owedTotals[beneficiary]`
2. Crediting `realCost` to `paidTotals[payer]` — **only when `paidByUserId` is non-null and
   the payer is a known workspace member**

Entry `cmp4b2ayr000904laxr9pouwr` had `paidByUserId = null` with 2 beneficiaries and
`realCost = 10`. Step 2 was silently skipped. Both users' `owedTotals` were incremented by 5
but nobody's `paidTotals` was credited.

With a true balance of `A` (Marian owes Martina 310):

| State | Marian's net | Martina's net | Result |
|---|---|---|---|
| Without orphan entry | -310 | +310 | Antisymmetric ✓ |
| With orphan entry | -310 - 5 = **-315** | +310 - 5 = **+305** | Asymmetric ✗ |

Marian sees `-315` → "you owe 315". Martina sees `+305` → "they owe 305", displayed as Martina
owes Marian 305.

The 10€ discrepancy (315 − 305) equals the orphan entry's `realCost`. Each user's net is reduced
by their 5€ share, and since nobody is credited as payer, the mismatch is permanent and grows
with each similar entry added.

---

## Data Repaired

Phase 10 audit found **2 entries** with ownership gaps in the `legacy-marian-martina` workspace.
Phase 11 repair script fixed both. Post-repair audit confirmed:

| Metric | Before repair | After repair |
|---|---|---|
| Total entries | 148 | 148 |
| `missingPaidByUserId` | 2 | **0** |
| `zeroBeneficiaries` | 1 | **0** |
| `fullyModern` | 146 | **148** |
| `fullyLegacy` | 1 | **0** |

### Entry detail

**Entry `cmp4b2ayr000904laxr9pouwr`** — direct balance bug cause

| Field | Before | After |
|---|---|---|
| `paidByUserId` | `null` | Marian's user ID (primary member) |
| `beneficiaries` | 2 rows (already present) | unchanged |
| Legacy `paidBy` | `MARIAN` | unchanged (still in sync) |

**Entry `cmplbqbg4000a04i9mbuxbe7x`** — fully legacy personal entry

| Field | Before | After |
|---|---|---|
| `paidByUserId` | `null` | Marian's user ID (primary member) |
| `beneficiaries` | 0 rows | 1 row (Marian) |
| Legacy `person` | `MARIAN` | unchanged |
| Legacy `paidBy` | `MARIAN` | unchanged |

This entry was excluded from balance computation by design (0 beneficiaries → skipped), so it
did not directly cause the asymmetry, but it was the only remaining fully-legacy entry.

---

## Invariant Tests Added

File: `src/lib/workspace-balance.test.ts` (18 tests, all passing)

Key scenarios covered:

| Scenario | What it proves |
|---|---|
| Marian pays 20 shared | `they-owe 10` (Marian) / `you-owe 10` (Martina) — antisymmetric |
| Martina pays 50 shared | `you-owe 25` / `they-owe 25` — antisymmetric |
| Combined (20 + 50) | net `you-owe 15` / `they-owe 15` — antisymmetric |
| Orphan entry (`paidByUserId=null`) | Deliberately shows amounts diverge (5 vs 15); discrepancy = orphan's `realCost` |
| After backfill of orphan | Antisymmetry restored (amounts equal, statuses opposite) |
| Empty entries | `balanced` |
| Personal entries only | `balanced` — personal entries correctly excluded from debt |
| Workspace with 1 member | `unsupported` |
| Unknown current user | `unsupported` |
| Symmetric payments | `balanced` |

The orphan-entry test documents the bug as a named regression test: if the guard or the repair
ever regresses, the test will fail.

---

## Server-side Guard Added

File: `src/lib/entry-ownership.ts`

Added a cross-field invariant check in `validateEntryOwnership`:

```ts
if (beneficiaryUserIds.length > 1 && !errors.paidByUserId && !paidByUserId) {
  errors.paidByUserId = "Chi ha pagato è obbligatorio per le spese condivise";
}
```

This is a defence-in-depth measure. The existing individual field validation already rejects
`paidByUserId = null` for any entry. The cross-field check makes the shared-entry invariant
explicit and provides a more specific error message in the UI.

Both `createEntry` and `updateEntry` route through `validateEntryOwnership`, so no
new entries with this flaw can be persisted via the application layer.

---

## Manual Verification Result

After running `npm run repair:legacy-sharing -- --apply`:

- Marian's dashboard balance and Martina's dashboard balance now show the same amount.
- Both views agree on direction (one shows "you owe", the other shows "they owe").
- The `balance(A,B) = -balance(B,A)` invariant holds.

---

## Remaining Follow-ups

### None blocking

The shared balance bug is fully resolved. The following are low-priority notes, not blocking items.

**Balance formula scope is "shared entries only" (by design)**

`computeCoupleWorkspaceBalance` ignores personal entries (beneficiaries ≤ 1). This is correct
semantics for a debt-reconciliation view. It is not documented in the UI. If users ask why a
personal expense "doesn't count", it would benefit from a tooltip or help text.

**Legacy `person` / `paidBy` enum columns remain**

These columns are kept in sync with `paidByUserId` / `beneficiaries` via `syncEntryPersonColumns`
at every write. They are used by the entry list filter (`buildPersonWhere`) and for export person
labels. No further backfill is needed. Removing them is a separate, unscoped decision.

**`cmp4b2ayr000904laxr9pouwr` is a comparison entry**

`savingContext=comparison`, `realCost=10`. After the payer backfill it contributes correctly to
both balance computation and comparison metrics. No further action required.

---

## Summary of All Phase 10–12 Work

| Phase | Action | Output |
|---|---|---|
| 10 | Legacy data normalization audit | `docs/product-ready/10_LEGACY_DATA_NORMALIZATION_AUDIT.md`, `scripts/audit-legacy-data.ts` |
| 11 | Targeted repair of 2 entries, guard, balance tests | `scripts/repair-legacy-sharing.ts`, guard in `entry-ownership.ts`, `workspace-balance.test.ts`, npm script `repair:legacy-sharing` |
| 12 | Verification and closure | This file, checklist update |
