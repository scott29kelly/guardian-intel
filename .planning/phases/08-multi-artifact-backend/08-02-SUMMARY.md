---
phase: 08-multi-artifact-backend
plan: 02
subsystem: infra
tags: [supabase, storage, typescript, refactor, notebooklm]

# Dependency graph
requires:
  - phase: 07-cleanup-data-integrity-bugs-security-hardening-and-notebookl
    provides: "recoverStuckDecks sweep, assertCustomerAccess rep-ownership guard, deck-pdfs bucket context (Phase 7 D-06 deferral)"
provides:
  - "Generalized uploadToSupabase helper with required prefix parameter"
  - "Per-type Supabase path routing: decks/, infographics/, audio/"
  - "Bug fix: infographic uploads now land under infographics/ (previously landed under decks/)"
  - "Foundation for Plan 05 (D-09) to migrate slide-deck PDF inline upload into the helper"
affects: [08-03-orchestrator, 08-05-slide-deck-refactor, 08-06-status-route, 09-multi-artifact-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "String-literal union parameter for compile-time path prefix safety"
    - "Caller-owned prefix policy (no implicit prefix defaults in helper)"

key-files:
  created:
    - ".planning/phases/08-multi-artifact-backend/08-02-SUMMARY.md"
  modified:
    - "src/lib/services/deck-processing.ts"

key-decisions:
  - "Rename first parameter deckId -> jobId to reflect multi-artifact semantics (value unchanged — still the ScheduledDeck row id)"
  - "prefix parameter is required (no default) — callers must be explicit to prevent silent mis-routing"
  - "String literal union 'decks' | 'infographics' | 'audio' enforces compile-time exhaustiveness, no runtime validation needed"
  - "Slide-deck PDF inline upload block (lines 386-417) left untouched per plan — Plan 05 (D-09 refactor) owns that migration"
  - "No reports/ prefix created — reports stay inline in reportMarkdown DB column per D-17"

patterns-established:
  - "Per-artifact-type Supabase path prefix: ${prefix}/${jobId}/${storageName}"
  - "TypeScript literal union parameters as compile-time validation for small closed sets"

requirements-completed: [NLMA-05]

# Metrics
duration: 2m 23s
completed: 2026-04-10
---

# Phase 08 Plan 02: Supabase Path Prefix Generalization Summary

**Generalized `uploadToSupabase` helper with a required `prefix: "decks" | "infographics" | "audio"` parameter, fixing the silent bug where infographic-only uploads were landing under `decks/` instead of `infographics/`.**

## Performance

- **Duration:** 2m 23s (143s)
- **Started:** 2026-04-10T01:34:22Z
- **Completed:** 2026-04-10T01:36:45Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- `uploadToSupabase` helper signature now accepts explicit `prefix` as its second parameter, forcing every caller to declare which Supabase top-level path segment their artifact belongs under.
- Three existing call sites in `deck-processing.ts` updated with literal prefixes:
  - Infographic-only path (line 312) — `"infographics"` **(bug fix — previously routed under `decks/`)**
  - Multi-artifact audio path (line 451) — `"audio"`
  - Multi-artifact infographic path (line 481) — `"infographics"` **(bug fix — previously routed under `decks/`)**
- Path construction changed from hardcoded `` `decks/${deckId}/${storageName}` `` to `` `${prefix}/${jobId}/${storageName}` `` — enables the Phase 8 per-type lifecycle policies described in D-18 (e.g., delete audio >30d without touching decks).
- Slide-deck PDF inline upload block intentionally left untouched — Plan 05 (D-09 orchestrator refactor) owns that migration and will use the generalized helper once extracted.
- `npx tsc --noEmit` exits 0 — all call sites type-check under the new 5-parameter signature.

## Task Commits

Each task was committed atomically (with `--no-verify` per parallel executor protocol):

1. **Task 1: Generalize uploadToSupabase with prefix parameter + update all call sites** — `7f2c33d` (feat)

_Note: The plan orchestrator will create the final metadata commit for STATE.md / ROADMAP.md after all wave 1 worktree agents complete. This executor only committed its own source changes and SUMMARY.md._

## Files Created/Modified

- `src/lib/services/deck-processing.ts` — Generalized `uploadToSupabase` helper signature; updated three call sites with literal prefix arguments. Slide-deck PDF inline upload block preserved for Plan 05 migration.
- `.planning/phases/08-multi-artifact-backend/08-02-SUMMARY.md` — This summary (created).

## Decisions Made

- **Parameter position:** Placed `prefix` as the second parameter (after `jobId`) so the mental model reads "what identifies this upload" (job id) → "where does it go" (prefix) → "what are we uploading" (filePath, name, contentType). Matches the natural S3-style path hierarchy.
- **Rename deckId → jobId:** The first parameter is still the `ScheduledDeck.id` today but naming it `deckId` would mislead future readers once multi-artifact jobs land in Plan 03. The semantic is "this row's id, which may represent a deck or a multi-artifact job".
- **Required, not optional:** Making `prefix` required forces every caller to think about routing. An optional default of `"decks"` would have preserved the pre-existing bug for infographic-only uploads.
- **String literal union, not enum:** TypeScript union types give the same compile-time safety as an enum at zero runtime cost, and match the existing codebase convention (`type ArtifactStatus = 'pending' | 'processing' | ...` per 08-CONTEXT §D-03).

## Deviations from Plan

None — plan executed exactly as written. Every STEP (helper rewrite, three call-site updates, verification, slide-deck PDF block preservation) was performed in order without any deviation triggers.

## Issues Encountered

None. The plan's line numbers matched the current file state exactly (117-147 helper, 311-316 infographic-only, 449-454 audio, 478-483 multi-infographic). Post-edit positions shifted by +1 line due to the added `prefix` parameter on line 119.

## User Setup Required

None — this plan is a pure code refactor with no new environment variables, no new services, and no new permissions. Existing `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_STORAGE_BUCKET` variables continue to work unchanged.

## Threat Model Compliance

The plan's threat register (T-08-04, T-08-05, T-08-06) is fully satisfied:

- **T-08-04 (Tampering via prefix parameter)** — Mitigated: parameter is a TypeScript string literal union; no user input reaches this parameter; all three call sites pass hardcoded literals (`"infographics"`, `"audio"`, `"infographics"`).
- **T-08-05 (Path traversal via storage path construction)** — Mitigated: `jobId` is a Prisma CUID (no slashes); `storageName` derives from `customerName.replace(/\s+/g, "-")` (normalized whitespace); no path component contains `..` or leading `/`.
- **T-08-06 (Info disclosure via public Supabase URLs)** — Accepted: bucket remains public per Phase 7 D-06 deferral (tracked in STATE.md "Discovered TODOs"). Not in scope for this plan.

No new threat flags. This plan reuses the existing path-construction pattern verbatim apart from the prefix parameterization.

## Scope Boundary Confirmation

- No other files modified. `uploadToSupabase` is module-local (not exported), so the refactor is fully self-contained.
- Repo-wide `grep uploadToSupabase` across `src/` confirmed only `deck-processing.ts` references the symbol.
- Other matches (in `.planning/phases/07-*/*.md`) are historical planning docs — read-only.

## Next Phase Readiness

- **Plan 03 (orchestrator) unblocked** — `generateCustomerArtifacts` can now call `uploadToSupabase` with the correct per-artifact prefix from day one.
- **Plan 05 (D-09 slide-deck refactor) unblocked** — the inline PDF upload block at lines 386-417 can now be migrated to `uploadToSupabase(jobId, "decks", ...)` without any helper changes.
- **No blockers introduced.** Wave 1 companion plan 08-01 (schema) touches `prisma/schema.prisma` and `notebooklm/types.ts`, neither of which overlaps with this plan's single-file diff.
- **Verification posture:** `npx tsc --noEmit` green. No new lint warnings. No behavior change for the slide-deck PDF inline path (still writes to `decks/${deckId}/${name}.pdf`).

## Self-Check

Verification run after SUMMARY.md write:

- FOUND: `src/lib/services/deck-processing.ts` (modified — 6 insertions, 2 deletions)
- FOUND: `.planning/phases/08-multi-artifact-backend/08-02-SUMMARY.md` (created)
- FOUND: commit `7f2c33d` (`feat(08-02): generalize uploadToSupabase with prefix parameter`)
- VERIFIED: `grep -c 'async function uploadToSupabase' src/lib/services/deck-processing.ts` = 1
- VERIFIED: `grep -c '"decks" | "infographics" | "audio"' src/lib/services/deck-processing.ts` = 1
- VERIFIED: `grep -c '"infographics",' src/lib/services/deck-processing.ts` = 2 (both infographic call sites)
- VERIFIED: `grep -c '"audio",' src/lib/services/deck-processing.ts` = 2 (union type + audio call site)
- VERIFIED: `grep -c 'uploadToSupabase(' src/lib/services/deck-processing.ts` = 4 (1 definition + 3 call sites)
- VERIFIED: `grep -c 'decks/\${deckId}/\${storageName}' src/lib/services/deck-processing.ts` = 0 (old hardcoded path gone from helper)
- VERIFIED: slide-deck PDF inline upload at lines 386-417 unchanged (still contains `decks/${deckId}/${deck.customerName...}.pdf`)
- VERIFIED: `npx tsc --noEmit` exit code 0

## Self-Check: PASSED

---
*Phase: 08-multi-artifact-backend*
*Completed: 2026-04-10*
