# Phase 11 — Legacy Sharing Repair

Date: 2026-06-12

---

## Root Cause

`computeCoupleWorkspaceBalance` (in `src/lib/workspace-balance.ts`) calculates the debt between
two workspace members by iterating shared entries (beneficiaries > 1) and:

1. Adding each beneficiary's share to `owedTotals[beneficiary]`.
2. Crediting the full `realCost` to `paidTotals[payer]` — **only when `paidByUserId` is set and
   the payer is a known workspace member**.

When `paidByUserId` is `null`, step 2 is skipped. The entry still adds to `owedTotals` for both
beneficiaries, but credits nobody as payer.

Result: both users' `currentNet` is reduced by their share, so **both see themselves as owing**.
This is the direct cause of the reported `balance(A,B) ≠ -balance(B,A)` bug.

---

## Affected Entries

Two entries in the `legacy-marian-martina` workspace were created before `paidByUserId` was
enforced at the application layer:

| Entry ID | Problem | Legacy hint | Impact on balance |
|---|---|---|---|
| `cmp4b2ayr000904laxr9pouwr` | `paidByUserId=null`, 2 beneficiaries | `paidBy=MARIAN` | Direct cause of asymmetry — adds 5€ phantom debt to both users |
| `cmplbqbg4000a04i9mbuxbe7x` | `paidByUserId=null`, 0 beneficiaries | `person=MARIAN`, `paidBy=MARIAN` | Not counted by balance (0 beneficiaries → skipped), but fully legacy |

---

## Repair Rules

The repair script maps legacy enum values to modern user IDs using the workspace member sort order:

- `paidBy=MARIAN` → `paidByUserId` = primary member (sorted alphabetically by label, index 0)
- `paidBy=MARTINA` → `paidByUserId` = secondary member (index 1)
- `person=MARIAN` → create one `EntryBeneficiary` for the primary member
- `person=MARTINA` → create one `EntryBeneficiary` for the secondary member
- `person=TUTTI` → create `EntryBeneficiary` for both members (only if workspace has exactly 2 members)

Entries are skipped and reported if:
- The workspace has no `workspaceId`
- The workspace has fewer than 2 members
- `paidBy` is not `MARIAN` or `MARTINA`
- `person` is unrecognised
- `person=TUTTI` and workspace has more than 2 members

---

## Commands

### Dry-run (safe — reads only)

```sh
npm run repair:legacy-sharing
```

Expected output for the current dataset:

```
[DRY-RUN] No changes will be written. Pass --apply to execute.

Entries scanned with ownership gaps: 2

Repairs planned: 2
Entries skipped: 0

=== PLANNED REPAIRS ===
  Entry cmp4b2ayr000904laxr9pouwr  workspace=legacy-marian-martina
    SET  paidByUserId = <primaryMemberUserId>
    →  paidByUserId ← primary member <primaryMemberUserId> (paidBy=MARIAN)
  Entry cmplbqbg4000a04i9mbuxbe7x  workspace=legacy-marian-martina
    SET  paidByUserId = <primaryMemberUserId>
    CREATE EntryBeneficiary userId=<primaryMemberUserId>
    →  paidByUserId ← primary member <primaryMemberUserId> (paidBy=MARIAN)
    →  beneficiary ← primary member <primaryMemberUserId> (person=MARIAN)

[DRY-RUN COMPLETE] Run with --apply to write these changes to the database.
```

### Apply (writes to DB)

```sh
npm run repair:legacy-sharing -- --apply
```

### Verify after apply

Run the audit script to confirm zero ownership gaps remain:

```sh
tsx scripts/audit-legacy-data.ts
```

Expected: `missingPaidByUserId: 0`, `zeroBeneficiaries: 0`, `fullyLegacy: 0`.

---

## Server-side Guard Added

File: `src/lib/entry-ownership.ts`

A cross-field invariant check was added to `validateEntryOwnership`:

```ts
// Cross-field invariant: shared entries (multiple beneficiaries) must always
// have a payer. Catches the case where beneficiaryUserIds are set but
// paidByUserId is absent — which would break balance antisymmetry.
if (beneficiaryUserIds.length > 1 && !errors.paidByUserId && !paidByUserId) {
  errors.paidByUserId = PAID_BY_REQUIRED_FOR_SHARED_MESSAGE;
}
```

The Italian error message is: `"Chi ha pagato è obbligatorio per le spese condivise"`.

This is a defence-in-depth guard. The existing `paidByUserId` required check already prevents
null payers for ALL entries (personal and shared). The cross-field check makes the shared-entry
invariant explicit and gives a clearer user-facing message.

Both `createEntry` and `updateEntry` in `src/actions/entries.ts` already route through
`validateEntryOwnership`, so no changes to those actions were needed.

---

## Balance Invariant Tests

File: `src/lib/workspace-balance.test.ts` (18 new tests)

### Test coverage

| Test | What it verifies |
|---|---|
| Marian pays 20 shared | `they-owe 10` from Marian's view, `you-owe 10` from Martina's view |
| Martina pays 50 shared | `you-owe 25` from Marian, `they-owe 25` from Martina |
| Combined (20+50) | net `you-owe 15` / `they-owe 15` |
| Orphan entry (paidByUserId=null) | Demonstrates asymmetry: 5 vs 15 — amounts differ by orphan's realCost |
| After backfill of orphan | Restores antisymmetry |
| Empty entries | Returns `balanced` |
| Personal entries | Ignored — no effect on couple balance |
| 1-member workspace | Returns `unsupported` |
| Unknown currentUserId | Returns `unsupported` |
| Both pay same amount | Returns `balanced` |

### Key invariant (green after repair)

```ts
assert.equal(
  computeCoupleWorkspaceBalance(members, MARIAN_ID, entries).amount,
  computeCoupleWorkspaceBalance(members, MARTINA_ID, entries).amount,
);
```

The orphan-entry test intentionally shows this invariant failing before the backfill, and
passing after.

---

## Files Changed

| File | Action |
|---|---|
| `scripts/repair-legacy-sharing.ts` | Created — safe repair script with dry-run default |
| `src/lib/entry-ownership.ts` | Modified — added cross-field shared-entry guard |
| `src/lib/workspace-balance.test.ts` | Created — 18 balance invariant tests |
| `package.json` | Modified — added `repair:legacy-sharing` npm script |
| `docs/product-ready/11_LEGACY_SHARING_REPAIR_NOTES.md` | Created — this file |

No application data was modified.
No schema was changed.

---

## Validation Commands Run

```
npx prisma validate   ✓
npm run lint          ✓
npm run typecheck     ✓
npm run test          ✓  142 pass (18 added)
npm run build         ✓
```

---

## Risks and Follow-ups

### Apply the repair to production

The dry-run output shows exactly which userId will be set (`paidByUserId = <primaryMemberUserId>`).

Before applying on production:
1. Run `npm run repair:legacy-sharing` (dry-run) on the production DB to confirm the planned
   repairs match expectations.
2. Verify the primary member UserId shown in the output is Marian's canonical account.
3. Run `npm run repair:legacy-sharing -- --apply`.
4. Verify the dashboard balance is now consistent for both users.

### Balance formula only covers shared entries

`computeCoupleWorkspaceBalance` ignores personal entries (beneficiaries ≤ 1) by design.
If a user wants a "who has spent more overall" view (not just debt reconciliation), that
is a separate metric and is out of scope for this repair.

### `cmp4b2ayr000904laxr9pouwr` is a comparison entry

`savingContext=comparison` — it contributes to comparison metrics in addition to being a
shared entry. The repair only fixes `paidByUserId`. Metric values (`realCost`, `savedAmount`,
`alternativeCost`) are unchanged.

### Legacy `person`/`paidBy` columns remain

After the repair, `person` and `paidBy` remain in sync with the modern fields (they were
already correct — the legacy data agreed with the intended state). No further sync is needed.
