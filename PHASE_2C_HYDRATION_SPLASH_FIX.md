# Phase 2C — Hydration Splash Fix

Date: 2026-06-10

Scope: targeted hydration fix for the splash stack:

- `FlameSplash`
- `AppSplash`
- `SplashGate`
- `RootLayout`

No database, migration, query, env mutation, Vercel, Supabase, or Production command was executed in this phase.

## Next.js Docs Availability

Required local docs path checked:

```text
node_modules/next/dist/docs/
```

Result:

```text
NEXT_DOCS_NOT_AVAILABLE
```

The local Next.js docs directory was not available in this checkout/environment. The fix was based on the project code and the hydration requirement that server render and first client render must be deterministic.

## Cause

`src/components/brand/flame-splash.tsx` initialized viewport state with a function that read `window.innerWidth` and `window.innerHeight` during the first client render.

That made the server render and first client render differ:

- Server render: no `window`, viewport defaults to zero, viewport-dependent SVG omitted.
- First client render: `window` exists, viewport has real dimensions, viewport-dependent SVG can be rendered immediately.

This is a classic hydration mismatch trigger because React expects the first client render to match the HTML produced by the server.

## Fix

Changed `FlameSplash` so the first render is deterministic:

- Initial viewport state is now `null` on both server and first client render.
- Viewport measurement happens only after mount in `useEffect`.
- `window.matchMedia("(prefers-reduced-motion: reduce)")` is evaluated only after mount in `useEffect`.
- The viewport-dependent SVG border/comet is rendered only after viewport dimensions are measured.
- The central `FlameMark` and splash overlay remain stable on the initial render.
- Animation is preserved after mount for users without reduced-motion enabled.

Also changed `AppSplash` from `useLayoutEffect` to `useEffect` for clearing the bootstrap shell. The same double `requestAnimationFrame` behavior is preserved, but the effect is no longer a layout effect.

## Files Modified

- `src/components/brand/flame-splash.tsx`
- `src/components/splash/app-splash.tsx`
- `PHASE_2C_HYDRATION_SPLASH_FIX.md`

## Implementation Details

### `src/components/brand/flame-splash.tsx`

Before:

- `useState(getInitialViewport)` could read `window` during first client render.
- `useLayoutEffect` started the animation and read `matchMedia`.

After:

- `useState<ViewportSize | null>(null)` makes the initial render stable.
- The first viewport read is performed in `useEffect` after mount.
- Animation setup uses `useEffect` after the SVG/path exists.
- SVG renders only when `w > 0`.

### `src/components/splash/app-splash.tsx`

Before:

- Used `useLayoutEffect` for bootstrap shell clearing.

After:

- Uses `useEffect` with the same deferred clearing behavior.

## Manual Hydration Check

Not completed in this environment because the local app cannot build or run without missing npm binaries/dependencies.

Expected manual check after dependencies are available:

1. Start the app with the existing local env.
2. Open a route that renders `RootLayout` and `SplashGate`.
3. Hard refresh.
4. Confirm the console has no hydration mismatch warning for `FlameSplash`, `AppSplash`, `SplashGate`, or `RootLayout`.
5. Confirm the flame mark appears immediately and the border/comet animation starts after mount.
6. Confirm reduced-motion users do not get the comet animation.

## Validation Results

### `npm run lint`

Status: failed due to missing local binary.

```text
sh: eslint: command not found
```

### `npm run typecheck`

Status: failed due to missing local binary.

```text
sh: tsc: command not found
```

### `npm run test`

Status: failed due to missing local binary.

```text
sh: tsx: command not found
```

### `npm run build`

Status: failed due to missing local binary.

```text
sh: next: command not found
```

Interpretation: the required npm checks could not run because project dependencies/binaries are not available in the local environment. No dependency installation was performed in this phase.

## Acceptance Criteria Status

- First render server/client stable for `FlameSplash`: implemented.
- No viewport/window/randomness during initial render: implemented.
- Viewport and `matchMedia` measured only after mount: implemented.
- Animation preserved after mount: implemented.
- `useLayoutEffect` removed from the touched splash components: implemented.
- No hydration error on local refresh: not manually verifiable in this environment because dependencies are missing.
- `npm run lint`: blocked by missing binary.
- `npm run typecheck`: blocked by missing binary.
- `npm run test`: blocked by missing binary.
- `npm run build`: blocked by missing binary.

## Follow-Up

After restoring dependencies in a controlled way, rerun:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Then perform the manual refresh check in dev or Preview to confirm no hydration warning remains.
