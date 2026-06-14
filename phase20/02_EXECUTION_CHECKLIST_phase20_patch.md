# 02_EXECUTION_CHECKLIST.md — Phase 20 patch (paste-ready)

This is the block to apply to `docs/product-ready/02_EXECUTION_CHECKLIST.md`.

> **Why `[~]` and not `[x]`:** the design spec + pixel targets are complete, but Phase 20 is
> only "complete" once Codex applies the edits and the four validation commands pass. Flip to
> `[x]` after `lint` + `typecheck` + `test` + `build` are green. Marking `[x]` now would claim
> code that hasn't been written.

---

### 1) Update the top "Current recommended next step" block

Replace:

```
## Current recommended next step

**Phase 20 — Design / visual polish pass.**
```

with:

```
## Current recommended next step

**Phase 20 — Design / visual polish pass.** Design spec + pixel targets delivered
(`20_DESIGN_POLISH_NOTES.md`). Implementation in progress — flip to complete after the four
validation commands pass.
```

### 2) Append this Phase 20 entry at the end of the file

```
## Phase 20 — Design / visual polish pass

Status: `[~]`  (spec + pixel targets delivered; code implementation pending validation)

Output required:

- Create `docs/product-ready/20_DESIGN_POLISH_NOTES.md`.
- Apply presentational polish to the 5 priority areas + 6 light-pass surfaces.
- Run full validation.

Completion notes (spec phase):

- Authored `docs/product-ready/20_DESIGN_POLISH_NOTES.md` — additive token layer
  (`--sp-*`, `--r-*`, `--shadow-*`), per-area before→after, Codex do/don't list.
- Pixel targets produced in the design project:
  `Phase 20 - Visual Polish Reference.html` (tokens + 5 priority before→after),
  `Phase 20 - Light Pass Screens.html` (6 connected surfaces).
- Thesis: reconcile the two visual dialects (editorial-divided vs card-filled) onto one
  spacing rhythm, radius logic, and state model. No redesign.
- One genuine fix flagged: entry-form large-comparison warning moves off `amber-700/300`
  (off-palette) to an in-palette warm note.
- Hard rules preserved by construction: no schema, no server actions, no metric formulas,
  no Phase 18 a11y-semantic removal, no Phase 14 IA change, no concept renames, no new deps.

Completion notes (implementation — fill in when done):

- Files changed: …
- Validation: `npm run lint` ☐, `npm run typecheck` ☐, `npm run test` ☐ (golden metric tests green), `npm run build` ☐.
- Then set Status to `[x]`.
```
