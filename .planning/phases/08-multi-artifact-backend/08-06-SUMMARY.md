---
phase: 08-multi-artifact-backend
plan: 06
subsystem: backend-services
tags: [notebooklm, stuck-job-recovery, multi-artifact, prisma, sweep, refactor]

# Dependency graph
requires:
  - phase: 08-multi-artifact-backend
    plan: 01
    provides: "ScheduledDeck per-artifact status columns (deck/infographic/audio/reportStatus, Error, CompletedAt) + notebookId column"
  - phase: 08-multi-artifact-backend
    plan: 05
    provides: "Refactored deck-processing.ts (recoverStuckDecks was left byte-for-byte unchanged by Plan 05; this plan owns the rewrite)"

provides:
  - "Per-artifact recoverStuckDecks sweep: four updateMany calls (one per ArtifactType), each scoped to {type}Status = 'processing' AND updatedAt < cutoff"
  - "Sibling-preserving sweep: only the stalled artifact's {type}Status / {type}Error / {type}CompletedAt columns flip on recovery; completed/ready/skipped siblings in the same row are untouched"
  - "D-22 best-effort orphaned-notebook cleanup: findMany for rows with notebookId set + all four per-artifact statuses terminal, bounded by take: 20, then deleteNotebook inside nested try/catch, nulling notebookId on success"
  - "Stable signature (staleMinutes?) -> Promise<number> with the return value now representing the summed count across all four sweeps"
  - "Orphan query failure is swallowed + logged (never blocks the sweep's main return)"
  - "Re-added deleteNotebook import in deck-processing.ts (removed during Plan 05 dead-import cleanup; needed again for the D-22 cleanup path)"

affects: [09, 10, 11]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-artifact updateMany loop: one call per member of the ArtifactType union, scoped by ${type}Status = 'processing' + updatedAt < cutoff, accumulating counts into a local totalRecovered"
    - "Bounded orphan-cleanup query (take: 20) + nested try/catch pattern to ensure best-effort remote cleanup never blocks a hot path like the status poll"
    - "Terminal status detection via `notIn: ['pending', 'processing']` — includes nulls, so an artifact that was never requested (skipped or never written) correctly counts as terminal"

key-files:
  created:
    - ".planning/phases/08-multi-artifact-backend/08-06-SUMMARY.md"
  modified:
    - "src/lib/services/deck-processing.ts (net +101 lines: +109 insertions, -8 deletions; 673 -> 774 lines)"

key-decisions:
  - "Terminal status detection uses `notIn: ['pending', 'processing']` so null values count as terminal (an unrequested or never-written artifact should not block orphan cleanup)"
  - "Orphan query bounded at take: 20 per plan D-24 — caps status-poll cost even if many orphans accumulate"
  - "Orphan cleanup nulls notebookId only on successful deleteNotebook — preserves debug trail on failure"
  - "Outer try/catch around the orphan query swallows failures; inner try/catch around each deleteNotebook swallows individual cleanup failures — sweep always returns the artifact-sweep count"
  - "Re-added `deleteNotebook` to the notebooklm/index import block rather than putting it in a separate import statement; kept it grouped with the other function imports (generateCustomerArtifacts, healthCheck) for consistency"

patterns-established:
  - "Per-artifact sweep pattern: four hardcoded updateMany calls instead of a dynamic loop because Prisma TypeScript column keys are literals, not runtime-composable strings — a loop would need an unsafe cast whereas four explicit calls type-check cleanly"
  - "Best-effort remote cleanup pattern: bounded findMany (take: N) + per-row nested try/catch + outer try/catch around the whole cleanup block — all failures log but never throw, so the hot-path return value is always the primary operation's result"
  - "Null-aware terminal status predicate: `{ notIn: ['pending', 'processing'] }` is the correct way to include nulls via Prisma's filter semantics (nulls are NOT excluded by notIn)"

requirements-completed: [NLMA-06]

# Metrics
duration: ~2min
completed: 2026-04-10
---

# Phase 08 Plan 06: Per-Artifact recoverStuckDecks Sweep Summary

**Generalized `recoverStuckDecks` in `src/lib/services/deck-processing.ts` from a single top-level `status='processing'` updateMany into four per-artifact updateMany sweeps (deck, infographic, audio, report) plus a best-effort orphaned-notebook cleanup pass — preserving already-completed artifacts in multi-artifact jobs and preventing NotebookLM-side orphan leakage, without touching the status-route call site.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-10T02:11:54Z
- **Completed:** 2026-04-10T02:13:18Z
- **Tasks:** 1
- **Files modified:** 1 (`deck-processing.ts`)
- **Files created:** 1 (this SUMMARY)
- **Net line delta on deck-processing.ts:** +101 lines (+109 insertions, -8 deletions)

## Accomplishments

- `recoverStuckDecks` body rewritten to execute four per-artifact `updateMany` sweeps — one each for `deck`, `infographic`, `audio`, `report` — each scoped to `{type}Status = "processing" AND updatedAt < cutoff`. Only the stalled artifact's three columns (`{type}Status`, `{type}Error`, `{type}CompletedAt`) flip; siblings in the same row are untouched. D-20 satisfied.
- The stale-threshold semantics are preserved (15 minutes comparing against row `updatedAt` per D-21); no change to `DEFAULT_STALE_MINUTES`.
- D-22 best-effort orphaned-notebook cleanup added after the four sweeps: `findMany` for rows where `notebookId` is set AND all four per-artifact statuses are terminal (via `notIn: ['pending', 'processing']`, which also matches nulls), bounded by `take: 20`, then iterate and call `deleteNotebook(candidate.notebookId)` inside a nested try/catch. On successful cleanup, `notebookId` is nulled on the row. On failure, the error is logged but the loop continues.
- Outer try/catch wraps the entire orphan-cleanup block so a query or query-builder failure cannot throw out of `recoverStuckDecks` — the function always returns the artifact-sweep count regardless of orphan-cleanup outcome.
- The return value is now the summed count across all four sweeps (`totalRecovered`). The function signature `(staleMinutes?) -> Promise<number>` is byte-for-byte unchanged, so the status-route call site at `/api/decks/status/[customerId]/route.ts:59-63` keeps working without any modification.
- `deleteNotebook` re-added to the `notebooklm/index` import block. Plan 05's delegation refactor removed it as a dead import; this plan's D-22 cleanup path needs it again, so it was added back in the same import statement alongside `generateCustomerArtifacts` and `healthCheck`.
- Top-level `status: "processing"` sweep GONE from `recoverStuckDecks` body — the orchestrator still writes top-level status on job completion, but the recovery sweep no longer targets it. The function now operates purely on per-artifact columns.
- `npx tsc --noEmit` exits 0 — zero type errors across the project.

## Task Commits

Each task was committed atomically with `--no-verify` per the parallel execution protocol:

1. **Task 1: Rewrite recoverStuckDecks as per-artifact sweep + best-effort notebook cleanup** — `7cda80d` (refactor)
   - 1 file changed, 109 insertions(+), 8 deletions(-)

_Note: The orchestrator owns the final metadata commit (STATE.md / ROADMAP.md phase/plan checkboxes) after the wave completes. This executor only committed its own source change._

## Files Created/Modified

- **`src/lib/services/deck-processing.ts`** (modified, net +101 lines):
  - Line 15-19 — `notebooklm/index` import block re-adds `deleteNotebook` alongside the existing `generateCustomerArtifacts` + `healthCheck` imports.
  - Lines 78-202 — `recoverStuckDecks` body entirely replaced. Old single updateMany over top-level `status: "processing"` + top-level `errorMessage`/`completedAt` write is gone. New body declares `cutoff`/`now`/`stallError`/`totalRecovered` locals, runs four per-artifact updateMany sweeps with local result bindings, accumulates the count into `totalRecovered`, emits a single aggregated warn log with per-type breakdown, then runs the D-22 orphan cleanup block (outer try/catch, bounded findMany, inner try/catch per candidate, deleteNotebook + nullify notebookId on success, log-only on failure).
  - `DEFAULT_STALE_MINUTES` constant at line 66 — UNCHANGED.
  - Function JSDoc block at lines 68-77 — UNCHANGED (still documents the 15-minute default; accurate without rewrite).
  - Everything else in the file — UNCHANGED.
- **`.planning/phases/08-multi-artifact-backend/08-06-SUMMARY.md`** — this summary (created).

## Decisions Made

- **Hardcoded four sweeps instead of a runtime loop over `ArtifactType`.** Prisma's TypeScript column keys (`deckStatus`, `infographicStatus`, etc.) are statically known literals; a runtime loop building computed keys would need an unsafe cast to tell the type system it's producing valid Prisma update inputs. Four explicit `updateMany` calls type-check cleanly without any cast and are equally readable. The plan's Step 1 code block also uses four explicit calls, so this matches the plan verbatim.
- **Null-aware terminal detection via `notIn: ['pending', 'processing']`.** Prisma's `notIn` filter includes null values (unlike the SQL `NOT IN` default). An artifact that was never requested (and thus has null in its `{type}Status` column) correctly counts as terminal — it can't be in-flight. This matches the plan's intent: "A null value counts as terminal (artifact was never requested or was skipped)."
- **`take: 20` on the orphan query.** The plan's Step 1 code block specifies this bound explicitly. Capping at 20 rows per status poll means even a catastrophic orphan accumulation cannot slow the hot path — in the worst case the status route sees 20 sequential `deleteNotebook` calls, each of which is itself wrapped in try/catch with the NLM CLI's own timeout semantics as an outer bound.
- **Nulling `notebookId` only on successful cleanup.** If `deleteNotebook` throws, the row still has `notebookId` set, so the next status-poll sweep will try again. This is the debug-trail-preserving side of D-04 ("enables the stuck-job sweep to attempt NotebookLM-side cleanup, and preserves debug trail on failure").
- **Outer try/catch around the orphan query block.** Per the plan's STEP 1 code, if the `findMany` itself fails (e.g., Prisma is momentarily unavailable), the sweep must still return the artifact-sweep count rather than throw. The outer try/catch catches that case. Placed at the plan's specified location.
- **Grouped `deleteNotebook` with existing imports.** The plan says "confirm `deleteNotebook` is imported at the top of the file ... if somehow it's missing after Plan 05's cleanup, add it to the imports." Plan 05 removed it, so I added it back in the same import block that already brings in `generateCustomerArtifacts` + `healthCheck` from `notebooklm/index`, keeping related imports grouped.
- **No logging-format change.** The warn log string format matches the plan's code block verbatim: one aggregated line with total + per-type breakdown. A single log line per sweep keeps the status poll's log footprint low even when multiple sweeps recover rows simultaneously.
- **Per-candidate success log uses `console.log` not `console.warn`.** Successful cleanup is an informational event, not a warning. Failed cleanup uses `console.warn`. Matches the plan's code block verbatim.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Worktree branch HEAD at wrong commit on entry**

- **Found during:** Pre-flight worktree_branch_check (before Task 1)
- **Issue:** The worktree's HEAD was `5341458c` (an older commit on main) instead of the expected base `ace4b71b` (chore: merge executor worktree (08-05 delegation refactor)). Plan 08-06 requires Plan 05's refactored structure of `deck-processing.ts` to be present in the worktree (the delegation + import cleanup), and `ace4b71b` is the merge commit that brings Plan 05 onto main. `5341458c` predates it, so `recoverStuckDecks` would have been in its pre-Plan-05 form and the edit targets would not have matched.
- **Fix:** Ran `git reset --soft ace4b71b93abb21872e80895c50c482e82845a47` then `git checkout HEAD -- .` to unstage any changes and restore the working tree to match the expected base. Verified via `git rev-parse HEAD` that HEAD was now `ace4b71b`. All subsequent edits + commits landed on top of the correct base.
- **Files modified:** None tracked — this was a working-tree state correction.
- **Verification:** `git log --oneline -3` after the reset shows `ace4b71b` as HEAD with `a17e2f8` and `4ba9279` in the ancestry. `recoverStuckDecks` was verified as the original Plan 01 single-sweep version at lines 77-101 before the refactor, and `src/lib/services/deck-processing.ts` lines 15-19 show the Plan 05 delegation-era imports (no `deleteNotebook`).
- **Committed in:** N/A — working-tree-state fix, not a code change.

### Plan-as-written observations

- **`deleteNotebook` was NOT already imported** when this plan began executing. The plan's STEP 3 says: "Confirm `deleteNotebook` is imported at the top of the file. It should already be there from before this plan ... If somehow it's missing after Plan 05's cleanup, add it to the imports." Plan 05's SUMMARY explicitly notes it was removed as a dead import during the delegation refactor, and reading the worktree's current `deck-processing.ts` confirms: the import block at lines 15-19 contained only `generateCustomerArtifacts` and `healthCheck`. So I took the STEP 3 fallback path and added `deleteNotebook` to the same import statement. This was anticipated by the plan's wording and is not a scope change.

### Out-of-scope discoveries logged (NONE — nothing to log)

- No pre-existing warnings, linting errors, or unrelated issues surfaced. `npx tsc --noEmit` exits 0 across the entire project.

---

**Total deviations:** 1 auto-fixed (Rule 3 blocking worktree bootstrap issue) + 1 plan-as-written observation (deleteNotebook re-import, explicitly anticipated by the plan).
**Impact on plan:** Zero scope change. All acceptance criteria met. The single auto-fix was infrastructure (worktree state), not code-level divergence from the plan.

## Issues Encountered

- **Worktree branch base mismatch** (documented above as deviation 1): Pre-flight check caught and fixed. Consistent with findings from prior waves (Plan 03, Plan 05 executors both reported similar starting-state bootstrap corrections). This appears to be a recurring worktree initialization gap on Windows.
- **No production code issues.** The per-artifact sweep type-checks cleanly, preserves the original function signature, keeps the DEFAULT_STALE_MINUTES constant + JSDoc intact, and leaves the status-route call site untouched.

## User Setup Required

None — this plan is a pure library refactor with no new environment variables, no new services, no schema changes, no migrations. `recoverStuckDecks` maintains the same exported signature `(staleMinutes?) -> Promise<number>` so the status-route call site at `src/app/api/decks/status/[customerId]/route.ts:59-63` continues to work unchanged.

## Threat Model Compliance

The plan's threat register (T-08-23 through T-08-26) is fully satisfied:

- **T-08-23 (Tampering / Race condition — per-artifact sweep clobbering in-flight work)** — Mitigated: each `updateMany` is scoped by `{type}Status = 'processing' AND updatedAt < cutoff`. Because Prisma bumps `updatedAt` on every row write, an in-flight orchestrator that just transitioned any artifact state (even a sibling artifact on the same row) refreshes `updatedAt` and escapes the sweep. The 15-minute threshold (D-21) is far larger than any single generator's wall time (~8 minutes max), so the sweep only fires on true stalls. Sibling completed artifacts are provably untouched because each `updateMany.data` object writes only the target artifact's three columns.
- **T-08-24 (DoS / runaway sweep — orphan cleanup loop)** — Mitigated: the orphan `findMany` is capped with `take: 20` so the hot path cost is bounded. Each `deleteNotebook` call is wrapped in try/catch so one slow NLM CLI call cannot cascade. The outer try/catch around the entire orphan block swallows any query failure so the sweep always returns `totalRecovered` regardless. The primary sweep path (four `updateMany` calls) completes before the orphan block runs, so even in the worst case of a slow orphan cleanup, the artifact recovery has already committed.
- **T-08-25 (Info Disclosure — stall error message)** — Accepted: error message is a static string — "Artifact stalled — recovered by stuck-job sweep" — with no sensitive data. No customer names, no IDs, no paths.
- **T-08-26 (Elevation of Privilege — no auth on recoverStuckDecks)** — Mitigated: `recoverStuckDecks` is a library function, not a route handler. All auth enforcement happens at the caller level (the status route runs `assertCustomerAccess` before the sweep). This function's writes are scoped to already-created `ScheduledDeck` rows — it cannot create new rows, cannot write to other models, and cannot escalate privileges. The orphan cleanup path calls `deleteNotebook` and writes only a `notebookId: null` update to already-existing rows, which is a narrower trust boundary than creation.

No new threat surface introduced. The refactor reuses the same Prisma model and the same NLM CLI cleanup primitive as pre-existing code paths.

## Threat Flags

None — no new security-relevant surface introduced. The refactor touches only internal service code (`deck-processing.ts`). No new network endpoints, no new auth paths, no new file access patterns, no new schema changes at trust boundaries. The `deleteNotebook` CLI call path was already present in `notebooklm/index.ts` and previously invoked from `deck-processing.ts` before Plan 05's cleanup — this plan re-establishes a pre-existing trust boundary, not a new one.

## Known Stubs

None. Every code path writes real values sourced from the Prisma query results. The orphan cleanup branch uses the real `notebookId` string from the query result; the `deleteNotebook` call passes a type-narrowed non-null value (guarded by the `if (!candidate.notebookId) continue` check even though `notebookId: { not: null }` in the filter already guarantees non-null — belt-and-suspenders for TypeScript's nullability inference).

## Scope Boundary Confirmation

- Only files modified in this worktree: `src/lib/services/deck-processing.ts` plus this SUMMARY.
- `git status --short` after commit shows a clean working tree (except this SUMMARY, written post-commit).
- **`recoverStuckDecks` is the ONLY function touched in `deck-processing.ts`.** `processDeckWithNotebookLM`, `uploadToSupabase`, `sendArtifactJobCompletionNotification`, `GUARDIAN_PERSONA`, `DEFAULT_STALE_MINUTES`, the JSDoc block on `recoverStuckDecks`, and every other export are byte-for-byte unchanged. Verified via git diff stat: `1 file changed, 109 insertions(+), 8 deletions(-)` and the diff region is contained entirely within the function body + one import line.
- **No changes to the status route.** `git diff src/app/api/decks/status/[customerId]/route.ts` returns empty — the call site at lines 59-63 is untouched.
- **No changes to `prisma/schema.prisma`** — Plan 01 owns the schema extension and this plan consumes the columns it defined.
- **No changes to `src/lib/services/notebooklm/index.ts`** — Plan 03 owns the orchestrator and `deleteNotebook` definition; this plan only imports the existing export.
- **No changes to `src/lib/services/notebooklm/types.ts`** — Plan 01 owns the ArtifactStatus/ArtifactType exports and this plan doesn't import them (the hardcoded literal strings match the union members without needing the type import).
- No changes to any API route, any React component, any hook, any test file, or any other planning doc.

## Next Phase Readiness

- **Phase 8 is code-complete after this plan.** All six Phase 8 plans land across Waves 1-4:
  - Wave 1: Plan 01 (schema + types)
  - Wave 2: Plans 02 (upload helper), 03 (orchestrator)
  - Wave 3: Plans 04 (routes), 05 (delegation + doc propagation)
  - Wave 4: Plan 06 (this plan — per-artifact sweep)
  - All six plans' source changes are now on main (or about to be merged).
- **Phase 9 (Multi-Artifact UI) is fully unblocked.** The `useCustomerArtifacts` hook (NLMA-07) will read per-artifact columns from the status route's extended response (Plan 04's work), and per-artifact recovery is now handled correctly so stuck jobs no longer block the UI's state-transition expectations.
- **Phase 10 (Push) is scope-reduced per Plan 05's doc propagation** — backend firing is already in place via `sendArtifactJobCompletionNotification`, and recoverStuckDecks' new per-artifact sweep ensures the single-notification contract is not accidentally fired multiple times for multi-artifact jobs (because the sweep only flips stalled artifacts, not completed ones).
- **Phase 11 (Testing) is unblocked.** The testing phase can now write end-to-end tests against the fully wired multi-artifact backend + recovery sweep + single-notification path.
- **No blockers introduced** for any downstream phase.

## Self-Check: PASSED

Verification run after SUMMARY.md write:

Files exist:
- FOUND: `src/lib/services/deck-processing.ts` (modified, 774 lines; up from 673 — +101 net)
- FOUND: `.planning/phases/08-multi-artifact-backend/08-06-SUMMARY.md` (this file, created)

Commits exist in git log:
- FOUND: `7cda80d` — refactor(08-06): generalize recoverStuckDecks to per-artifact sweep (D-20, D-22)

Runtime correctness:
- `npx tsc --noEmit` exits 0 (zero errors across entire project)
- `git status --short` shows only this SUMMARY as new (code commit already landed)
- `git log --oneline -3` shows `7cda80d` on top of `ace4b71` (expected base)

Acceptance criteria counts (all pass):
- `grep -c "updateMany" src/lib/services/deck-processing.ts` = 6 (4 sweep calls + 2 pre-existing non-recovery updateMany calls elsewhere in file — plan requires >= 4, passes)
- `grep -c 'deckStatus: "processing"' src/lib/services/deck-processing.ts` = 1
- `grep -c 'infographicStatus: "processing"' src/lib/services/deck-processing.ts` = 1
- `grep -c 'audioStatus: "processing"' src/lib/services/deck-processing.ts` = 1
- `grep -c 'reportStatus: "processing"' src/lib/services/deck-processing.ts` = 1
- `grep -c "export async function recoverStuckDecks" src/lib/services/deck-processing.ts` = 1
- `grep -c "notebookId: { not: null }" src/lib/services/deck-processing.ts` = 1
- `grep -c "deleteNotebook(candidate.notebookId)" src/lib/services/deck-processing.ts` = 1
- `grep -c "take: 20" src/lib/services/deck-processing.ts` = 1
- `grep -c "totalRecovered" src/lib/services/deck-processing.ts` = 8 (declaration + 4 accumulator adds + condition + log + return — exceeds plan's "≥ 4")
- `grep -c "DEFAULT_STALE_MINUTES" src/lib/services/deck-processing.ts` = 2 (declaration + default parameter)
- Function body scan for old top-level sweep: `awk '/export async function recoverStuckDecks/,/^}$/' src/lib/services/deck-processing.ts | grep -c 'status: "processing"'` = 0 (old sweep is GONE)
- `git diff src/app/api/decks/status/[customerId]/route.ts` = empty (status route call site UNCHANGED)

All success criteria from the plan (#1 through #9) are satisfied.

---
*Phase: 08-multi-artifact-backend*
*Completed: 2026-04-10*
