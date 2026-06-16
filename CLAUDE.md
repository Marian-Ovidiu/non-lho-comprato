# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # start dev server
npm run check        # full gate: prisma:validate → lint → typecheck → test → build
npm run test         # unit tests only (tsx --test "src/**/*.test.ts")
npm run typecheck    # tsc --noEmit
npm run lint         # eslint

# Run a single test file
tsx --test src/lib/rate-limit.test.ts

# E2E (requires .env.e2e + running dev:e2e server)
npm run dev:e2e                  # dev server wired for E2E auth bypass
npm run test:e2e                 # playwright headless
npm run test:e2e:seed            # seed E2E DB
npm run test:e2e:migrate         # run migrations on E2E DB

# DB helpers
npm run db:target                # print which DB DATABASE_URL points to
npx prisma migrate deploy        # apply pending migrations (use instead of migrate dev — see below)
npx prisma generate              # regenerate client after schema change
```

## Architecture

### Stack
Next.js 16 App Router, React 19, Prisma 7 + `@prisma/adapter-pg` (direct Pool, not PrismaAccelerate), Supabase for auth only (SSR cookie adapter), Tailwind 4, Radix UI / shadcn, PostHog analytics, Sentry errors.

### Multi-workspace data model
Every user-owned record (Entry, Habit, Goal, QuickPreset, Category) has `workspaceId String` (NOT NULL, `onDelete: Cascade`). There is no global data; everything is workspace-scoped.

**Accessing the current workspace in server actions:**
```ts
import { getCurrentWorkspaceScopedWhere } from "@/src/lib/workspace-context";
const where = await getCurrentWorkspaceScopedWhere(); // { workspaceId: "..." }
```

**Verifying a fetched record belongs to the current workspace:**
```ts
import { assertWorkspaceRecord } from "@/src/lib/workspace-isolation";
assertWorkspaceRecord(record, workspaceId, "Entry"); // throws "Entry not found" on mismatch
```
Always use `findUnique({ where: { id, workspaceId } })` for single-record lookups — this is the DB-level enforcement layer. `assertWorkspaceRecord` is the application-level safety net for models without a direct `workspaceId` (e.g. HabitOccurrence via `habit.workspaceId`).

### Auth flow
Supabase handles authentication. `src/lib/auth/session.ts` exports `getAuthenticatedUser()`, `getCurrentUser()`, `getCurrentWorkspace()`, `getCurrentWorkspaceId()` — all cached with React `cache()`. The session resolves: Supabase JWT → Prisma `User` → active workspace (from cookie `workspace-selection` or auto-assigned).

E2E tests bypass Supabase via a cookie (`nlc-e2e-user-id`) when `E2E_TEST_AUTH_ENABLED=true` and `NODE_ENV !== production`.

Legacy auth bridge (`src/lib/auth/legacy-auth.ts`) is hard-blocked in production via `process.env.NODE_ENV !== "production"`.

### Server actions
All mutations live in `src/actions/`. Every action must:
1. Call `getCurrentWorkspaceScopedWhere()` to get the scoped `where` clause
2. Pass `workspaceId` into every write/findUnique
3. Return typed result objects (no raw throws to client)

### i18n
Custom dual-language system in `src/lib/i18n/`. `Translations` type in `types.ts` is the single source of truth — both `it.ts` and `en.ts` must satisfy it fully.

- Server components: `import { getTranslations } from "@/src/lib/i18n"; const t = getTranslations(language);`
- Client components: `useTranslations()` hook (receives translations as prop from parent server component)
- Language comes from `workspace.language` (currently `"it"` or `"en"`), resolved in `AppShell`
- `languageToLocale()` maps language → locale string for `Intl` formatters

### Rate limiting
DB-backed via `RateLimitBucket` table. No Redis required. Use `checkRateLimit(rule, identifiers)` from `src/lib/rate-limit.ts`. Cleanup old buckets with `cleanupRateLimitBuckets()`.

### Prisma migration caveat
`prisma migrate dev` fails on this codebase because an old migration references the `Person` enum (since removed). **Always use `prisma migrate deploy`** to apply migrations, and create new migration SQL files manually in `prisma/migrations/`.

### Generated Prisma client
Client is generated into `src/lib/generated/prisma/client` (not the default location). Import from there or via the `prisma` singleton in `src/lib/prisma.ts`.
