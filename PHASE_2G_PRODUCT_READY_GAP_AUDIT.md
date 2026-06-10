# Phase 2G — Product-Ready Gap Audit

Date: 2026-06-10

Scope: final product-readiness gap audit after Phase 2A-2F planning/hardening work.

This is a read-only audit plus documentation. No code, schema, env, database, provider, Vercel, Supabase, or Production changes were made in this phase.

## Executive Summary

The project is substantially safer than the original product-ready audit baseline:

- Repository and release artifact hygiene are now documented and improved.
- Secret rotation has an explicit checklist.
- Splash hydration mismatch has a targeted code fix.
- Local/Preview/Production smoke and cutover runbooks exist.
- `npm run prisma:validate`, `npm run lint`, `npm run typecheck`, and `npm run test` pass in this environment.

The app is still not public-product-ready. The main remaining blockers are not basic build health; they are runtime/domain maturity and operational proof:

- Vercel Preview was prepared but not executed.
- Local `nlc-v2` smoke results are not filled as pass.
- Production cutover is a runbook only and has not been executed.
- Runtime still contains legacy `Person` / Marian / Martina assumptions.
- Core workspace references are still nullable in Prisma schema.
- Rate limiting, audit log, privacy lifecycle, and e2e access-control tests are missing.
- Several server actions remain very large and combine auth, validation, DB, domain logic, and serialization.

## Readiness Percentages

| Dimension | Percent | Rationale |
|---|---:|---|
| Deploy readiness | 78% | Quality gates pass and release archive hygiene is in place. Still blocked by unexecuted Preview smoke, dirty/uncommitted working tree, and no confirmed Vercel Preview logs. |
| Production beta readiness | 62% | `nlc-v2` DB rehearsal passed and runbooks are strong, but production beta requires green Preview, final old-prod freshness decision, rollback env capture, and post-cutover smoke proof. Legacy runtime and nullable workspace fields are acceptable only for a controlled beta with known users and tight rollback. |
| Public product readiness | 38% | Public launch needs stronger multi-tenant guarantees, rate limiting, audit logging, privacy/export/delete lifecycle, e2e/integration tests, performance work, and accessibility/mobile validation. |

## Go / No-Go Recommendation

| Target | Recommendation | Reason |
|---|---|---|
| Vercel Preview | Conditional go | Go only after committing/intentionally packaging the exact Phase 2 changes, configuring Preview env safely, adding Supabase Preview redirect URL, and running the Preview smoke checklist. |
| Production beta | No-go today | Requires successful Preview, final DB freshness decision, rollback env capture, Production env update window, and post-deploy smoke/log verification. |
| Public launch | No-go | Multi-tenant hardening, privacy lifecycle, rate limiting, audit log, e2e coverage, and accessibility/performance validation are not complete. |

## Evidence Summary

### Checks Run In Phase 2G

- `npm run prisma:validate`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test`: passed, 73 tests passed / 0 failed.

### Release Hygiene

Evidence:

- `PHASE_2A_REPO_ARTIFACT_HYGIENE.md` documents archive hygiene and denylist verification.
- `PHASE_2E_VERCEL_PREVIEW_CUTOVER.md` documents Preview archive verification.
- `.env.example` is tracked and sanitized.
- `.env.local`, `.env-backup/`, `backups/`, `.agents/`, `.idea/`, `release/`, `.DS_Store`, and `tsconfig.tsbuildinfo` are ignored/local.

Remaining gap:

- Current working tree has many staged/modified/untracked files. Vercel deploy from git requires an intentional branch/commit that includes exactly the desired changes.
- Generated release archive is clean, but it is based on `HEAD` plus `.env.example`; uncommitted changes are not automatically represented unless committed or otherwise intentionally packaged.

### Runtime Legacy

Evidence:

- `prisma/schema.prisma` still defines `enum Person` with `MARIAN`, `MARTINA`, `TUTTI`.
- `Entry.person`, `Entry.paidBy`, `Goal.person`, and `QuickPreset.person` still exist.
- `src/lib/auth/legacy-auth.ts` defines default IDs for `legacy-marian`, `legacy-martina`, and `legacy-marian-martina`.
- `ENABLE_LEGACY_AUTH_BRIDGE` can enable legacy email mapping.
- `src/lib/entry-person-sync.ts` projects current member ownership back into legacy `Person` columns.
- `src/actions/entries.ts` writes `person` and `paidBy` during create/update.
- `src/actions/goals.ts` still computes progress through legacy `entry.person` totals.
- `src/actions/presets.ts` still maps preset ownership through `MARIAN` / `MARTINA` / `TUTTI`.

Risk:

- Runtime semantics are still tied to a two-person legacy model. This is survivable for a private/known-user beta but not for a general multi-user product.

### Workspace Isolation

Evidence:

- `src/lib/workspace-context.ts` has helpers such as `assertWorkspaceMember`, `getCurrentWorkspaceScopedWhere`, and `requireWorkspaceAccessForRecord`.
- Core queries increasingly use workspace scoping.
- Category schema is workspace-scoped with unique `[workspaceId, slug]` and `[workspaceId, name]`.
- Tests cover category slug scoping and workspace member removal policy.

Remaining gap:

- There are no DB-backed integration/e2e tests proving user A cannot read/write/delete/export workspace B data.
- Cookie workspace manipulation is not covered by automated integration tests.
- Core schema still permits orphaned/invisible records through nullable workspace fields.

### Nullable Workspace Schema

Evidence:

- `Entry.workspaceId String?` with `onDelete: SetNull`.
- `Habit.workspaceId String?` with `onDelete: SetNull`.
- `Goal.workspaceId String?` with `onDelete: SetNull`.
- `QuickPreset.workspaceId String?` with `onDelete: SetNull`.

Risk:

- App-level scoping is doing most of the work. The DB still allows records without a workspace, so a bug or partial write can create records that are invisible, orphaned, or inconsistently scoped.

Recommendation:

- Do not fix this casually. Create a dedicated migration plan with backup, clone rehearsal, preflight, backfill, NOT NULL migration, and postflight checks.

### Invite Security

Evidence:

- Invite tokens are generated with `crypto.randomBytes(32)` and stored as SHA-256 hashes.
- Invites have TTL, revoked state, max uses, used count, and open-link constraints.
- Accept flow claims invite usage with `updateMany` under transaction conditions.
- Tests cover expired, revoked, max-used, and available invite cases.

Remaining gap:

- No rate limiting on invite creation or acceptance.
- No audit log for invite creation, acceptance, revocation, or failed attempts.
- Open-link abuse controls are limited to max uses and TTL, not request rate or anomaly detection.

### Rate Limiting

Evidence:

- Searches did not find rate-limit/throttle middleware or action-level rate limiting.

Risk:

- Invite endpoints/actions, auth-adjacent flows, export route, and write actions can be abused or spammed if exposed publicly.

### Audit / Error Logging

Evidence:

- Sentry integration exists for global/client error boundaries and sanitized Sentry options.
- PostHog event tracking exists for selected UX events.
- Many actions/pages use `console.error` / `console.warn` directly.
- No `AuditLog` model or central audit event writer was found.

Risk:

- Critical mutations are not durably traceable.
- Console logs may contain detailed errors without consistent redaction/structure.
- Security-relevant events such as invite creation, membership changes, exports, deletes, and workspace switches are not auditable.

### Privacy / Export / Delete Account

Evidence:

- AI CSV export route exists and is workspace-scoped, batched, and `Cache-Control: no-store`.
- Export includes user-entered titles and notes.
- No complete user data export, delete account, workspace deletion, anonymization, retention policy, or privacy request workflow was found.

Risk:

- The app is not ready for public users who may request export/delete/account lifecycle controls.

### PWA / Cache / Service Worker

Evidence:

- `app/manifest.ts` provides install metadata and icons.
- `RegisterSW` registers `/sw.js` only in production.
- `public/sw.js` has install/activate and an intentional no-op fetch handler.

Risk:

- PWA installability is present, but offline/cache behavior is intentionally not implemented. That is acceptable if the product does not promise offline support.
- No cache strategy or update UX exists.

### Performance

Evidence:

- Entry list has pagination paths and export batches at 1000 rows.
- Some stats/report/dashboard functions still use broad `findMany` calls and in-memory aggregation.
- Large server action files remain: entries 1541 lines, habits 1362, stats 1274, reports 866, presets 733.

Risk:

- Current scale may be fine for private beta, but public usage will hit TTFB/memory and maintainability issues.

### Mobile UX

Evidence:

- UI is mobile-first in many crafted components and PWA install components exist.
- Phase 2D/2E checklists include mobile/manual smoke expectations.

Remaining gap:

- No completed manual mobile smoke report is checked in.
- No automated visual regression or mobile viewport e2e suite exists.

### Accessibility

Evidence:

- Some components use labels/ARIA patterns.
- No automated accessibility test suite or completed manual accessibility audit was found.

Remaining gap:

- Keyboard navigation, focus management, dialogs/sheets, chart accessibility, color contrast, and screen-reader flows are not certified.

## Prioritized Gaps

### P0 — Required Before Production Beta Cutover

1. **Run and document Vercel Preview smoke test**
   - Why: Phase 2E is prepared only; no Preview login/log evidence exists.
   - Acceptance: Preview login, callback, dashboard, entries, stats, habits, goals, workspace members, create/edit/delete entry, logout/login all pass; logs show no DB/auth errors.

2. **Commit or intentionally package exact release state**
   - Why: working tree is dirty and release archive from `HEAD` may not include all intended Phase 2 changes.
   - Acceptance: deploy branch/commit is explicit; archive regenerated; denylist clean.

3. **Make final DB freshness decision**
   - Why: old production may have changed since the dump restored into `nlc-v2`.
   - Acceptance: documented decision to use current `nlc-v2` or run a fresh restore/migrate/repair/check cycle.

4. **Capture rollback env securely before Production env changes**
   - Why: rollback depends on old env values, but they must not be printed in reports.
   - Acceptance: secure store metadata recorded; no values in markdown.

5. **Run Production cutover only through Phase 2F**
   - Why: Production env shape and rollback sequencing must be followed exactly.
   - Acceptance: all Phase 2F go gates checked; old Supabase retained.

### P1 — Required Before Public Launch / Strong Beta

1. **Workspace NOT NULL migration plan for core models**
   - Scope: `Entry`, `Habit`, `Goal`, `QuickPreset`.
   - Acceptance: clone rehearsal, backfill, `NOT NULL`, FK/onDelete policy, postflight.

2. **Remove legacy `Person` runtime from write/read paths**
   - Scope: entries, goals, presets, reports/stats filters, auth bridge.
   - Acceptance: runtime uses `WorkspaceMember`, `paidByUserId`, `EntryBeneficiary`; legacy remains only in migration compatibility scripts until dropped.

3. **Add DB-backed workspace isolation integration tests**
   - Scope: two users, two workspaces, manipulated selected workspace cookie.
   - Acceptance: user A cannot read/write/delete/export user B workspace data.

4. **Rate limiting for invite/export/write-sensitive paths**
   - Scope: invite creation/acceptance, export route, possibly create/delete mutation bursts.
   - Acceptance: tested limits and clear user-facing errors.

5. **Audit log for critical mutations**
   - Scope: workspace membership, invite lifecycle, exports, deletes, account/workspace changes.
   - Acceptance: durable audit events with actor, workspace, action, target, timestamp, and redacted metadata.

6. **Privacy lifecycle**
   - Scope: user data export, delete account, anonymization/retention, workspace ownership transfer/delete.
   - Acceptance: documented policy and tested workflows.

7. **Performance hardening of stats/reports/dashboard**
   - Scope: broad `findMany` + in-memory aggregation.
   - Acceptance: SQL aggregates/materialized summaries or measured budgets on large synthetic datasets.

### P2 — Product Polish / Scale Readiness

1. **PWA strategy decision**
   - Decide no-offline vs real offline/cache strategy.
   - Acceptance: product copy and service worker behavior align.

2. **Accessibility audit**
   - Scope: keyboard, focus, dialogs/sheets, charts, color contrast, screen reader paths.
   - Acceptance: manual audit and/or automated axe checks.

3. **Mobile UX pass**
   - Scope: iOS/Android Safari/Chrome, PWA install, forms, sheets, charts.
   - Acceptance: completed checklist with screenshots/issues.

4. **Server action decomposition**
   - Scope: entries, habits, stats, reports, presets.
   - Acceptance: thinner actions, repositories/domain/schema modules, characterization tests.

5. **Structured logging cleanup**
   - Scope: direct `console.error/warn/info`, perf logs, auth logs.
   - Acceptance: central logger with redaction policy.

## Testing Gaps

Current tests cover:

- Money domain and form parsing.
- Category workspace slug scoping.
- Workspace RBAC member removal policy.
- Auth provisioning/email mapping.
- Legacy auth bridge behavior.
- Database URL normalization.
- Invite availability policy.
- AI export row formatting.
- Rome date helpers.

Missing tests:

- End-to-end login on local/Preview/Production.
- DB-backed multi-workspace isolation.
- Server action integration tests for entries/habits/goals/presets/reports.
- Export route authorization and privacy behavior.
- Invite brute-force/rate-limit behavior.
- Account deletion/export/privacy workflows.
- Accessibility checks.
- Mobile viewport visual regression.
- Performance benchmarks on large datasets.
- Production-like Vercel runtime smoke tests.

## Next Prompts Recommended

### Prompt 1 — Preview Execution

```text
Execute Phase 2E Preview deployment only. Confirm exact branch/commit, configure Vercel Preview env with redacted shape, add Supabase Preview redirect URL, deploy Preview, run the Phase 2E smoke checklist, inspect redacted logs, and update PHASE_2E_VERCEL_PREVIEW_CUTOVER.md with results. Do not touch Production.
```

### Prompt 2 — Final DB Freshness Decision

```text
Prepare a document-only final DB freshness decision for nlc-v2. Compare old production write activity since the last dump using approved non-mutative metadata only if available, decide current nlc-v2 vs fresh restore, and update PHASE_2F_PRODUCTION_CUTOVER_RUNBOOK.md. Do not run DB commands unless separately approved.
```

### Prompt 3 — Workspace NOT NULL Migration Plan

```text
Create a dedicated migration plan for making Entry.workspaceId, Habit.workspaceId, Goal.workspaceId, and QuickPreset.workspaceId non-null. Include backup, clone rehearsal, preflight, backfill rules, Prisma migration outline, postflight, rollback, and acceptance criteria. Do not execute migration.
```

### Prompt 4 — Legacy Runtime Removal Plan

```text
Audit and plan removal of runtime Person/Marian/Martina dependencies from entries, goals, presets, stats, reports, and auth bridge. Produce a staged plan with characterization tests first, no schema drop until after stable deployment.
```

### Prompt 5 — Workspace Isolation Integration Tests

```text
Add DB-backed integration tests for two users and two workspaces proving read/write/delete/export isolation and manipulated workspace cookie rejection. Use a test database only; do not touch Supabase production.
```

### Prompt 6 — Rate Limit and Audit Log Design

```text
Design rate limiting and audit logging for invite creation/acceptance, export, delete, membership changes, and workspace switching. Produce schema/API plan first, then implementation prompt. Do not migrate until approved.
```

## Final Recommendation

- **Preview:** conditional go after exact deploy state is selected and Preview env/redirects are configured.
- **Production beta:** no-go until Preview is green, rollback env is saved, and DB freshness decision is documented.
- **Public launch:** no-go until P1 privacy/security/multi-tenant hardening is complete.
