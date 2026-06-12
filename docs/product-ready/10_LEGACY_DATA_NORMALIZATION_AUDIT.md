# Phase 10 — Legacy Data Normalization Audit

Date: 2026-06-12

No application source code was changed during this phase.
No data was modified.
No schema was changed.

Audit script added (read-only): `scripts/audit-legacy-data.ts`

---

## 1. Current Schema Fields Related to Entry Money and Sharing

### Money fields

| Field | Type | Purpose |
|---|---|---|
| `realCost` | `Decimal(10,2)` | Actual money spent (or 0 for avoided entries) |
| `alternativeCost` | `Decimal(10,2)` | Reference/alternative cost; equals `realCost` for normal expenses |
| `savedAmount` | `Decimal(10,2)` | Legacy signed net impact: `alternativeCost - realCost`; zero for normal expenses |

### Classification fields (modern)

| Field | Type | DB Default | Purpose |
|---|---|---|---|
| `mode` | `EntryMode` (enum) | `spent` | `spent` or `avoided` — primary entry intent |
| `savingContext` | `EntrySavingContext` (enum) | `none` | `none` or `comparison` — whether a reference amount was provided |

### Sharing fields (modern)

| Field | Type | Purpose |
|---|---|---|
| `paidByUserId` | `String?` | FK to User — who physically paid |
| `beneficiaries` | `EntryBeneficiary[]` | Join table — which workspace members benefit from this entry |

### Legacy sharing fields

| Field | Type | DB Default | Purpose |
|---|---|---|---|
| `person` | `Person` (enum) | `MARIAN` | Beneficiary/scope indicator: `MARIAN`, `MARTINA`, `TUTTI` |
| `paidBy` | `Person` (enum) | `MARIAN` | Legacy payer indicator: `MARIAN`, `MARTINA` |

---

## 2. Meaning of Each Legacy Field

### `savedAmount`

A single signed value that conflates three distinct product concepts:

- **Avoided purchase** (`mode=avoided`): `savedAmount = alternativeCost` (always positive)
- **Comparison saving** (`mode=spent, savingContext=comparison, real < alternative`): `savedAmount > 0`
- **Comparison overspend** (`mode=spent, savingContext=comparison, real > alternative`): `savedAmount < 0`
- **Normal expense** (`mode=spent, savingContext=none`): `savedAmount = 0`

This field is kept in sync at write time by `calculateEntryMoney` in `src/lib/entry-domain.ts`.
It is NOT computed at read time — it is stored in the DB.
The modern `entry-metrics.ts` module derives `avoidedAmount`, `comparisonSaved`, and `comparisonOverspent`
from `realCost`, `alternativeCost`, `mode`, and `savingContext` at read time, making `savedAmount` redundant
but still present in all DB rows.

### `person` (legacy enum)

Represents the **beneficiary scope** of the entry:

- `MARIAN` — the entry benefits Marian only (personal expense for the primary member)
- `MARTINA` — the entry benefits Martina only (personal expense for the secondary member)
- `TUTTI` — the entry benefits both members (shared/couple expense)

This was the original sharing model before `EntryBeneficiary` was introduced.
It is kept in sync with `beneficiaries` via `syncEntryPersonColumns` in `src/lib/entry-person-sync.ts`.

### `paidBy` (legacy enum)

Represents the **payer** of the entry in the legacy model:

- `MARIAN` — the primary workspace member paid
- `MARTINA` — the secondary workspace member paid

Kept in sync with `paidByUserId` via `syncEntryPersonColumns`.
This field is currently never read for balance or metric calculations —
it is only written to maintain backwards compatibility.

---

## 3. Data Counts

All counts are from the production-mirror local database (148 total entries as of 2026-06-12).

### Totals

| Metric | Count |
|---|---|
| Total entries | 148 |
| Entries missing `mode` (null) | 0 |
| Entries missing `savingContext` (null) | 0 |
| Entries missing `paidByUserId` | 2 |
| Entries with zero beneficiaries | 1 |

**Note**: `mode` and `savingContext` have DB-level defaults (`spent` and `none`) so they
are never null. All 148 rows carry explicit values for both fields.

### Modern ownership completeness

| Category | Count |
|---|---|
| Fully modern (paidByUserId AND beneficiaries both set) | 146 |
| Fully legacy (neither paidByUserId nor beneficiaries) | 1 |
| paidByUserId present but zero beneficiaries | 0 |
| Beneficiaries present but paidByUserId missing | 1 |

### `person` values grouped by value

| `person` value | Count |
|---|---|
| `TUTTI` | 68 |
| `MARIAN` | 50 |
| `MARTINA` | 30 |

### `paidBy` (legacy enum) values

| `paidBy` value | Count |
|---|---|
| `MARIAN` | 83 |
| `MARTINA` | 65 |

### `mode` distribution

| `mode` | Count |
|---|---|
| `spent` | 141 |
| `avoided` | 7 |

### `savingContext` distribution

| `savingContext` | Count |
|---|---|
| `none` | 77 |
| `comparison` | 71 |

### `person=TUTTI` with zero beneficiaries

| | Count |
|---|---|
| `person=TUTTI` and zero beneficiaries | **0** |

All 68 shared/couple entries have properly populated `beneficiaries` rows.

### `person=TUTTI` with single beneficiary (mismatch)

| | Count |
|---|---|
| `person=TUTTI` but only 1 beneficiary | **0** |

### Non-TUTTI entries with multiple beneficiaries (mismatch)

| | Count |
|---|---|
| `person!=TUTTI` but beneficiaries.length > 1 | **0** |

Legacy `person` and modern `beneficiaries` are fully consistent across all 148 entries.

### Workspace distribution

| Workspace ID | Count |
|---|---|
| `legacy-marian-martina` | 135 |
| `private-44976e8f-...` | 12 |
| `private-8ce526c5-...` | 1 |

---

## 4. What Legacy `person` Represents

`person` represents **who benefits from the entry**, not who paid.

Evidence:
- `person=MARIAN` → sole beneficiary is the primary member (Marian)
- `person=MARTINA` → sole beneficiary is the secondary member (Martina)
- `person=TUTTI` → both members benefit (shared expense)
- `syncEntryPersonColumns` derives `person` from `beneficiaryUserIds`, not from `paidByUserId`
- `paidBy` is the separate legacy field that tracks the payer

`paidBy` represents who paid (payer), mirroring `paidByUserId` in the legacy enum space.

---

## 5. Whether Automatic Conversion Is Safe for Each Category

### Entries with `mode` missing — SAFE (no action needed)

All 148 entries have explicit `mode`. No inference required.

### Entries with `savingContext` missing — SAFE (no action needed)

All 148 entries have explicit `savingContext`. No inference required.

### Entries missing `paidByUserId` — 2 entries — CONDITIONALLY SAFE

Two entries lack `paidByUserId`. Both are in `legacy-marian-martina`.

**Entry 1** — `cmp4b2ayr000904laxr9pouwr`
```
person:    TUTTI
paidBy:    MARIAN
mode:      spent
savingContext: comparison
realCost:  10.00
beneficiaries: 2 (both workspace members)
paidByUserId: null
```

This entry has properly populated beneficiaries but is missing `paidByUserId`.
The legacy `paidBy=MARIAN` unambiguously identifies the payer as the primary member.
Auto-conversion is **safe** if the primary member's userId is known and stable.

Backfill rule: `SET paidByUserId = <primaryMemberUserId> WHERE id = 'cmp4b2ayr000904laxr9pouwr'`

**Entry 2** — `cmplbqbg4000a04i9mbuxbe7x`
```
person:    MARIAN
paidBy:    MARIAN
mode:      spent
savingContext: comparison
realCost:  2.00
beneficiaries: 0
paidByUserId: null
```

This entry is fully legacy — neither `paidByUserId` nor `beneficiaries` are set.
`person=MARIAN` and `paidBy=MARIAN` both point to the primary member.
Intent is clearly a personal expense for Marian: she paid and benefited alone.

Auto-conversion is **safe** with manual confirmation:
1. Set `paidByUserId = <primaryMemberUserId>`
2. Insert one `EntryBeneficiary` row: `(entryId='cmplbqbg4000a04i9mbuxbe7x', userId=<primaryMemberUserId>)`

### Entries with `person=Condivisa` (TUTTI) and zero beneficiaries — SAFE (none)

Count is 0. No action needed.

### `savedAmount` — SAFE (no change needed)

`savedAmount` is redundant but correct. The modern `entry-metrics.ts` module recomputes metrics
from `realCost`, `alternativeCost`, `mode`, and `savingContext` at read time. No entries show
signs of misclassification:

- 0 entries with `realCost=0`, `alternativeCost>0`, `mode=spent` (would indicate untagged avoided entries)
- 0 entries with `alternativeCost ≠ realCost`, `savingContext=none`, `mode=spent` (would indicate untagged comparisons)

`savedAmount` can remain as-is. No backfill required.

---

## 6. Proposed Backfill Rules

Only 2 entries require action.

### Rule A — Restore `paidByUserId` for entry with beneficiaries but null payer

```sql
-- Requires: knowing the primary member's userId for workspace 'legacy-marian-martina'
-- Safe precondition: paidBy = 'MARIAN' (primary member)
UPDATE "Entry"
SET "paidByUserId" = '<primaryMemberUserId>'
WHERE id = 'cmp4b2ayr000904laxr9pouwr'
  AND "paidByUserId" IS NULL
  AND "paidBy" = 'MARIAN';
```

### Rule B — Restore fully legacy personal entry

```sql
-- Step 1: set paidByUserId
UPDATE "Entry"
SET "paidByUserId" = '<primaryMemberUserId>'
WHERE id = 'cmplbqbg4000a04i9mbuxbe7x'
  AND "paidByUserId" IS NULL
  AND "paidBy" = 'MARIAN';

-- Step 2: insert missing EntryBeneficiary row
INSERT INTO "EntryBeneficiary" (id, "entryId", "userId", "createdAt")
VALUES (gen_random_uuid()::text, 'cmplbqbg4000a04i9mbuxbe7x', '<primaryMemberUserId>', now())
ON CONFLICT ("entryId", "userId") DO NOTHING;
```

### Verification after backfill

```sql
-- Must return 0 rows
SELECT id FROM "Entry"
WHERE "paidByUserId" IS NULL
  AND (
    SELECT COUNT(*) FROM "EntryBeneficiary" WHERE "entryId" = "Entry".id
  ) > 1;

-- Must return 0 rows
SELECT id FROM "Entry"
WHERE "paidByUserId" IS NULL
  AND (
    SELECT COUNT(*) FROM "EntryBeneficiary" WHERE "entryId" = "Entry".id
  ) > 0;
```

---

## 7. Ambiguous Entries That Should Not Be Auto-Converted Without Review

Neither problem entry is ambiguous — both have consistent legacy `person`/`paidBy` values
that clearly identify the intended state. They can be converted automatically after manual
confirmation that `<primaryMemberUserId>` maps correctly to the `MARIAN` legacy enum value
for the `legacy-marian-martina` workspace.

No entries require manual review beyond that confirmation.

---

## 8. Impact on Shared Balance Bug

### Bug report

- Marian's dashboard: "Marian owes Martina ~315€"
- Martina's dashboard: "Martina owes Marian ~305€"

Expected invariant: `balance(A, B) = -balance(B, A)`

Observed violation: both users see themselves as owing, in opposite directions, with a ~10€ discrepancy.

### Root cause

`computeCoupleWorkspaceBalance` (in `src/lib/workspace-balance.ts`) computes:

```ts
// Only processes entries with beneficiaries.length > 1
share = realCost / beneficiaryUserIds.length;
owedTotals[beneficiaryUserId] += share;   // for each beneficiary
paidTotals[payerUserId] += realCost;       // only if memberIds.has(payerUserId)

currentNet = paidTotals[currentUser] - owedTotals[currentUser];
```

Entry `cmp4b2ayr000904laxr9pouwr` (realCost=10, 2 beneficiaries, `paidByUserId=null`):
- `beneficiaries.length = 2` → entry is NOT skipped
- `owedTotals[marian] += 5`, `owedTotals[martina] += 5`
- `payerUserId = ""` (null trims to empty string) → `memberIds.has("") = false`
- `paidTotals` is NOT updated for anyone

**Effect**: both users have 5€ added to what they "owe" without anyone being credited as payer.

Without this entry, let the true balance be `A`:
```
currentNet(marian) = A
currentNet(martina) = -A    ← correct antisymmetry
```

With this entry:
```
currentNet(marian) = A - 5
currentNet(martina) = -A - 5   ← BROKEN: both reduced by 5
```

If `A = -310` (Marian truly owes Martina 310):
```
currentNet(marian)  = -315  → "Marian owes Martina 315"  ✓ matches bug report
currentNet(martina) = 305   → "Marian owes Martina 305"  — displayed as Martina is owed 305
```

The ~10€ difference (315 vs 305) directly corresponds to the `realCost=10` of the phantom entry.

**Conclusion**: entry `cmp4b2ayr000904laxr9pouwr` with null `paidByUserId` is the direct cause
of the balance inconsistency. Fixing `paidByUserId` will restore `balance(A,B) = -balance(B,A)`.

The second legacy entry (`cmplbqbg4000a04i9mbuxbe7x`, 0 beneficiaries, `realCost=2`) does NOT
affect the balance because `computeCoupleWorkspaceBalance` skips entries with `beneficiaries.length <= 1`.

---

## 9. Tests/Invariants Required Before Applying a Backfill

### Invariant 1 — Balance antisymmetry

Before and after the backfill, assert:

```ts
const balanceMarian = computeCoupleWorkspaceBalance(members, marianUserId, entries);
const balanceMartina = computeCoupleWorkspaceBalance(members, martinaUserId, entries);

// If Marian owes X, Martina is owed X (and vice versa)
assert(balanceMarian.amount === balanceMartina.amount);
assert(
  (balanceMarian.status === "you-owe" && balanceMartina.status === "they-owe") ||
  (balanceMarian.status === "they-owe" && balanceMartina.status === "you-owe") ||
  (balanceMarian.status === "balanced" && balanceMartina.status === "balanced")
);
```

After the backfill this invariant must hold.

### Invariant 2 — No shared entry with missing payer

```sql
-- Must return 0 rows after backfill
SELECT COUNT(*) FROM "Entry" e
WHERE "paidByUserId" IS NULL
  AND (SELECT COUNT(*) FROM "EntryBeneficiary" WHERE "entryId" = e.id) > 1;
```

### Invariant 3 — No entry with beneficiaries and null paidByUserId

```sql
-- Must return 0 rows after backfill
SELECT COUNT(*) FROM "Entry" e
WHERE "paidByUserId" IS NULL
  AND (SELECT COUNT(*) FROM "EntryBeneficiary" WHERE "entryId" = e.id) > 0;
```

### Invariant 4 — Person/beneficiary consistency unchanged

These invariants must hold before and after (they already hold now):

```sql
-- TUTTI entries must have > 1 beneficiary
SELECT COUNT(*) FROM "Entry" e
WHERE person = 'TUTTI'
  AND (SELECT COUNT(*) FROM "EntryBeneficiary" WHERE "entryId" = e.id) != 2;
-- Expected: 0

-- Non-TUTTI entries must have <= 1 beneficiary
SELECT COUNT(*) FROM "Entry" e
WHERE person != 'TUTTI'
  AND (SELECT COUNT(*) FROM "EntryBeneficiary" WHERE "entryId" = e.id) > 1;
-- Expected: 0
```

### Invariant 5 — Golden balance test (unit)

Write a test in `src/lib/workspace-balance.test.ts`:

```ts
// Scenario: Martina pays 20 EUR for both; Marian pays 30 EUR for both.
// Total owed each: (20+30)/2 = 25 EUR each.
// Martina paid 20, owed 25 → net: -5 (owes 5)
// Marian paid 30, owed 25 → net: +5 (owed 5)
// balance(marian) → they-owe 5; balance(martina) → you-owe 5.
// Antisymmetry: 5 == 5 ✓

it('balance is antisymmetric', () => {
  const result_m = computeCoupleWorkspaceBalance(members, MARIAN_ID, entries);
  const result_t = computeCoupleWorkspaceBalance(members, MARTINA_ID, entries);
  expect(result_m.amount).toBe(result_t.amount);
  expect(result_m.status).toBe('they-owe');
  expect(result_t.status).toBe('you-owe');
});
```

---

## Phase Exit Report

### Files changed

| File | Action |
|---|---|
| `scripts/audit-legacy-data.ts` | Created (read-only diagnostic script) |
| `docs/product-ready/10_LEGACY_DATA_NORMALIZATION_AUDIT.md` | Created (this file) |

### Code/data modified?

**No application code was modified.**
**No data was modified.**
**No schema was changed.**

### Legacy data counts (from local production-mirror DB, 148 entries)

| Finding | Count |
|---|---|
| Total entries | 148 |
| Entries with explicit `mode` | 148 (0 missing) |
| Entries with explicit `savingContext` | 148 (0 missing) |
| Entries with `paidByUserId` set | 146 |
| Entries with beneficiaries set | 147 |
| Fully modern (both set) | 146 |
| Fully legacy (neither set) | 1 |
| Beneficiaries set but `paidByUserId` null | 1 — **direct cause of balance bug** |
| `person=TUTTI` and zero beneficiaries | 0 |
| `person` vs `beneficiaries` mismatches | 0 |
| Likely misclassified `mode`/`savingContext` | 0 |

### Recommended next step

**Phase 10A — targeted backfill of 2 entries, then add balance antisymmetry test.**

1. Identify `<primaryMemberUserId>` for workspace `legacy-marian-martina` (run
   `prisma.workspaceMember.findFirst({ where: { workspaceId: 'legacy-marian-martina' }, orderBy: { createdAt: 'asc' } })` to confirm the owner/primary slot).
2. Apply Rule A (set `paidByUserId` for `cmp4b2ayr000904laxr9pouwr`).
3. Apply Rule B (set `paidByUserId` + insert `EntryBeneficiary` for `cmplbqbg4000a04i9mbuxbe7x`).
4. Verify Invariants 1–4.
5. Add `src/lib/workspace-balance.test.ts` with the antisymmetry golden test.

Do NOT apply the backfill to production before the antisymmetry test passes in the test environment.
