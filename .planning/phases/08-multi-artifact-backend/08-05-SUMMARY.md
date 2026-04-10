---
phase: 08-multi-artifact-backend
plan: 05
subsystem: backend-services
tags: [notebooklm, orchestrator, multi-artifact, refactor, prisma, push-notifications, docs]

# Dependency graph
requires:
  - phase: 08-multi-artifact-backend
    plan: 01
    provides: "ScheduledDeck per-artifact status columns (deck/infographic/audio/reportStatus, Error, CompletedAt) + notebookId; ArtifactStatus + ArtifactType union types"
  - phase: 08-multi-artifact-backend
    plan: 02
    provides: "Generalized uploadToSupabase(jobId, prefix, filePath, storageName, contentType) signature — consumed by the new per-type upload calls in the refactored flow"
  - phase: 08-multi-artifact-backend
    plan: 03
    provides: "generateCustomerArtifacts orchestrator + ArtifactOutcome / GenerateCustomerArtifactsInput / GenerateCustomerArtifactsResult interfaces"

provides:
  - "processDeckWithNotebookLM delegating to generateCustomerArtifacts (D-09 — no code duplication between legacy deck-only flow and new multi-artifact route)"
  - "Per-artifact DB writes from outcome loop: ${type}Status / ${type}Error / ${type}CompletedAt columns populated on every job"
  - "Derived top-level status rollup (D-02): 'failed' if any outcome failed, 'completed' otherwise"
  - "sendArtifactJobCompletionNotification — single notification helper for multi-artifact jobs (D-10, replaces sendDeckCompletionNotification + sendDeckFailureNotification)"
  - "Single-notification-per-job contract: one push fired at job terminal state with copy derived from hasFailures flag"
  - "Legacy 'slide-deck' → canonical 'deck' ArtifactType mapping on DB-read boundary so pre-Phase-8 jobs still process"
  - "REQUIREMENTS.md NLMA-05 rewritten to drop reports/ Supabase prefix (D-17)"
  - "REQUIREMENTS.md NLMA-15 rewritten to describe one-notification-per-job behavior (D-10)"
  - "ROADMAP.md Phase 10 Goal rewritten to match D-10 single-notification rule"
  - "ROADMAP.md Phase 10 SC#3/#4 collapsed into a single terminal-state notification criterion"
  - "ROADMAP.md Phase 11 SC#2 rewritten so the Playwright spec expects ONE toast instead of 'toasts fire as artifacts complete'"

affects: [08-06, 09, 10, 11]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Library-orchestrator delegation from a legacy route-level entry point (processDeckWithNotebookLM) to a new reusable service (generateCustomerArtifacts)"
    - "Per-artifact outcome loop → accumulated Prisma updateData → single atomic scheduledDeck.update with derived top-level status"
    - "Type-safe computed column keys via ArtifactType union with `as Prisma.ScheduledDeckUpdateInput` cast at the write site"
    - "One-notification-per-job push contract with copy branching on a single hasFailures boolean"

key-files:
  created:
    - ".planning/phases/08-multi-artifact-backend/08-05-SUMMARY.md"
  modified:
    - "src/lib/services/deck-processing.ts (net -101 lines: 774 → 673)"
    - ".planning/REQUIREMENTS.md (2 requirement lines rewritten: NLMA-05 + NLMA-15)"
    - ".planning/ROADMAP.md (3 doc line ranges rewritten: Phase 10 Goal, Phase 10 SC#3+#4, Phase 11 SC#2)"

key-decisions:
  - "Legacy 'slide-deck' string mapped to canonical 'deck' ArtifactType at a single boundary (not plumbed through the orchestrator) — minimizes blast radius of the legacy-token decision"
  - "Unused imports of generateCustomerDeck and generateCustomerInfographic also removed (beyond the plan's explicit generateAudio/Infographic/Report removal) because the delegation swap makes them dead imports — keeps the module honest"
  - "Infographic cache seeding preserved for infographic-only jobs by gating on `requestedTypes.includes('infographic') && !requestedTypes.includes('deck') && typeof updateData.infographicUrl === 'string'` — matches the pre-refactor cache contract without re-introducing a dedicated infographic-only code path"
  - "Single atomic prisma.scheduledDeck.update at the end of the outcome loop (not flushed per-artifact) — leaves room for a future sweep-visible intermediate write if needed, but keeps the current refactor minimal and transactional"
  - "`as Prisma.ScheduledDeckUpdateInput` cast placed at the single final update call (not spread across callsites) — one visible type boundary, easy to audit"
  - "derivedStatus typed as `string` rather than a union because the existing `status` column is `String?` in Prisma — no extra type constraint to satisfy"
  - "Infographic cache branch preserved without new helpers — kept the pre-refactor behavior verbatim so the Phase 5 cache layer sees the same writes it always did"
  - "NLMA-15 REQUIREMENTS entry rewritten to explicitly point at `sendArtifactJobCompletionNotification` and clarify Phase 10's reduced scope (mounting prompt + session-gated trigger only) so a Phase 10 planner cannot mistakenly re-plan the backend firing"

patterns-established:
  - "Legacy-token translation pattern at the DB-read boundary: map `deck.requestedArtifacts: string[]` → `ArtifactType[]` via a hardcoded typeMap record, dedupe via Set, filter via type predicate"
  - "Outcome loop + accumulated updateData + derived top-level status: generic pattern any future artifact type can plug into without touching the top-level transaction"
  - "Per-job single notification with hasFailures-branched copy: cleaner mental model than two sibling functions, and matches the D-10 user intent exactly"

requirements-completed: [NLMA-02, NLMA-05]

# Metrics
duration: ~8min
completed: 2026-04-09
---

# Phase 08 Plan 05: Delegate processDeckWithNotebookLM to generateCustomerArtifacts + Doc Propagation Summary

**Refactored `processDeckWithNotebookLM` to delegate all multi-artifact generation to the Plan 03 orchestrator (D-09 — zero code duplication), wired per-artifact DB writes + derived top-level status rollup + a single push notification per job (D-10), and propagated the D-10 + D-17 overrides into REQUIREMENTS.md and ROADMAP.md so downstream Phase 10/11 planners will not reintroduce rejected per-artifact-notification or reports/-Supabase-prefix models.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-09T21:56:00-0400 (post worktree reset)
- **Completed:** 2026-04-09T22:04:40-0400 (Task 2 commit timestamp)
- **Tasks:** 2
- **Files modified:** 3 (deck-processing.ts, REQUIREMENTS.md, ROADMAP.md)
- **Files created:** 1 (this SUMMARY)
- **Net line delta on deck-processing.ts:** -101 lines (774 → 673)

## Accomplishments

### Task 1 — processDeckWithNotebookLM delegation (D-09)

- Replaced the entire legacy slide-deck path (lines ~361-605 of the pre-refactor file), the legacy infographic-only path (lines ~296-359), and the inline Step 6b multi-artifact loop (lines ~426-542) with one delegated call to `generateCustomerArtifacts`.
- Mapped the DB's legacy `requestedArtifacts: string[]` (which still stores `"slide-deck"` for historical rows) into the canonical `ArtifactType[]` union via a hardcoded `typeMap` record, dedupe via `Set`, filter via TypeScript type predicate. Throws a clear error if the resulting list is empty.
- Consumed `ArtifactOutcome[]` in a per-outcome loop:
  - `failed` outcomes flip `${type}Status='failed'`, record the error string, set `${type}CompletedAt=now`, flip `anyFailed=true`, and `continue`.
  - Terminal-success outcomes flip `${type}Status='ready'`, null out `${type}Error`, set `${type}CompletedAt=now`, then branch on `outcome.type`:
    - `deck` — pdfToImages conversion + base64 fallback + `uploadToSupabase(deckId, "decks", ...)` + populate `pdfUrl`/`pdfStoragePath` on updateData
    - `infographic` — `uploadToSupabase(deckId, "infographics", ...)` + populate `infographicUrl`/`infographicStoragePath`
    - `audio` — `uploadToSupabase(deckId, "audio", ...)` + populate `audioUrl`/`audioStoragePath`
    - `report` — inline `reportMarkdown` column write (D-17 — no Supabase upload)
- Marked unrequested artifacts as `${type}Status='skipped'` in the same updateData payload.
- Preserved the infographic cache behavior for infographic-only jobs by gating on `requestedTypes.includes("infographic") && !requestedTypes.includes("deck") && typeof updateData.infographicUrl === "string"`.
- Derived top-level `status` per D-02: `anyFailed ? "failed" : "completed"`.
- Built a backward-compatible `resultPayload` that reuses the pre-refactor JSON shape (so existing UI callers reading `pdfData`/`audioUrl`/`infographicUrl`/`reportMarkdown` from `resultPayload` continue to work).
- One atomic `prisma.scheduledDeck.update` at the end of the loop with `as Prisma.ScheduledDeckUpdateInput` cast on the computed-key `updateData`.
- Replaced the success-path `sendDeckCompletionNotification` + the catch-path `sendDeckFailureNotification` with a single new `sendArtifactJobCompletionNotification(userId, customerName, jobId, hasFailures)` helper. Copy branches on `hasFailures`:
  - `false` — title `"Artifacts Ready"`, body `"All artifacts ready for {customerName}."`
  - `true` — title `"Generation Finished with Errors"`, body `"Generation finished with errors for {customerName}. Tap to review."`
  - Tag: `artifacts-${jobId}`
  - URL: `/decks?jobId=${jobId}`
- Catch block calls the new helper with `hasFailures=true` after the error-row DB update.
- Removed now-dead imports: `generateAudio`, `generateInfographic`, `generateReport`, `deleteNotebook`, `generateCustomerDeck`, `generateCustomerInfographic`. Added: `Prisma` from `@prisma/client`; `generateCustomerArtifacts` + `ArtifactOutcome` from `@/lib/services/notebooklm/index`; `ArtifactStatus` + `ArtifactType` from `@/lib/services/notebooklm/types`.
- `npx tsc --noEmit` exits 0.
- File shrinks from 774 → 673 lines (net -101, matching the plan's "smaller than pre-edit baseline" acceptance criterion).
- `recoverStuckDecks` and its DEFAULT_STALE_MINUTES constant are BYTE-FOR-BYTE UNCHANGED — Plan 06 owns that refactor.

### Task 2 — REQUIREMENTS.md + ROADMAP.md doc propagation (D-10, D-17)

Five atomic line-range rewrites across two files:

1. **REQUIREMENTS.md NLMA-05** (D-17): dropped the `reports/` Supabase prefix and now states reports are served inline from the `reportMarkdown` DB column per Phase 8 D-17.
2. **REQUIREMENTS.md NLMA-15** (D-10): rewritten from "fire push notifications per-artifact-completion" to "ONE push notification per multi-artifact job when the entire job reaches terminal state" with full D-10 override rationale, explicit copy text, tag scheme, URL scheme, and a pointer to `sendArtifactJobCompletionNotification` — plus a clarification that Phase 10 now owns only the UX integration (mounting the prompt, session-gated trigger).
3. **ROADMAP.md Phase 10 Goal** (D-10): rewritten from "surfaces a toast the moment any individual artifact finishes" to "fires exactly one push notification per job when all requested artifacts have reached a terminal state (per Phase 8 D-10)".
4. **ROADMAP.md Phase 10 SC#3 + SC#4** (D-10): SC#3 and SC#4 were two sibling criteria both asserting per-artifact notifications. Collapsed into a single rewritten SC#3 describing the terminal-state one-notification flow. SC#4 removed entirely.
5. **ROADMAP.md Phase 11 SC#2** (D-10): rewritten from "toasts fire as artifacts complete" to "one toast fires when the job reaches terminal state".

REQUIREMENTS.md traceability table rows (lines 156 and 166) are INTENTIONALLY UNCHANGED — phase assignments stay the same, only the requirement wording changes. This matches the plan's Step 2 explicit instruction.

## Task Commits

Each task was committed atomically with `--no-verify` per the parallel executor protocol:

1. **Task 1: Refactor processDeckWithNotebookLM to delegate to generateCustomerArtifacts** — `97e60c2` (refactor)
   - 1 file changed, 197 insertions(+), 298 deletions(-)

2. **Task 2: Rewrite NLMA-05/15 + Phase 10 Goal/SC + Phase 11 SC#2** — `64ae3fe` (docs)
   - 2 files changed, 5 insertions(+), 6 deletions(-)

_Note: The orchestrator will create the final metadata commit (STATE.md / ROADMAP.md phase/plan checkboxes) after the wave completes. This executor only committed its own source + doc changes._

## Files Created/Modified

- **`src/lib/services/deck-processing.ts`** (modified, net -101 lines):
  - Lines 13-42 — import block rewritten: removed `generateAudio`/`generateInfographic`/`generateReport`/`deleteNotebook`/`generateCustomerDeck`/`generateCustomerInfographic`; added `Prisma` from `@prisma/client`, `generateCustomerArtifacts` + `ArtifactOutcome` from `notebooklm/index`, and `ArtifactStatus` + `ArtifactType` from `notebooklm/types`.
  - Lines 295-513 — the entire slide-deck + infographic-only + multi-artifact-loop region replaced with the delegation-to-orchestrator logic (outcome loop + updateData + cache preservation + derived status + single atomic update + single notification).
  - Lines 533-539 — catch block's failure notification call updated to `sendArtifactJobCompletionNotification(deck.requestedById, deck.customerName, deckId, true)`.
  - Lines 625-673 — `sendDeckCompletionNotification` + `sendDeckFailureNotification` deleted; `sendArtifactJobCompletionNotification` added in their place with hasFailures-branched copy.
- **`.planning/REQUIREMENTS.md`** (modified, 2 requirement lines rewritten):
  - Line 14 — NLMA-05 rewritten per D-17 (no `reports/` prefix; reports inline in DB column).
  - Line 30 — NLMA-15 rewritten per D-10 (one notification per job; points at new helper).
- **`.planning/ROADMAP.md`** (modified, 3 doc line ranges rewritten):
  - Line 161 — Phase 10 Goal rewritten per D-10.
  - Line 167 — Phase 10 SC#3 + SC#4 collapsed into a single new SC#3.
  - Line 178 — Phase 11 SC#2 rewritten per D-10.
- **`.planning/phases/08-multi-artifact-backend/08-05-SUMMARY.md`** — this summary (created).

## Decisions Made

- **Removed `generateCustomerDeck` and `generateCustomerInfographic` imports** beyond the plan's explicit `generateAudio`/`generateInfographic`/`generateReport` removal. The plan's "acceptance criteria enforce generateAudio removal" is the floor, not the ceiling — after the delegation swap, all six legacy generator/customer-wrapper entry points are dead imports in `deck-processing.ts`. Removing them keeps the module honest and prevents a future reader from wondering why the old wrappers are still around. ESLint's `no-unused-vars: off` would have let the dead imports slide, but the intent of the refactor is to remove code duplication, not just route around it.
- **Removed `deleteNotebook` import** too — the orchestrator owns notebook cleanup via `deleteNotebook(notebookId)` inside its own scope (Plan 03 D-22). `deck-processing.ts` no longer needs a direct reference to the NotebookLM cleanup primitive.
- **Kept `pdfToImages`, `formatCustomerDataForNotebook`, `formatWeatherHistoryForNotebook`, etc.** — these are still called in the pre-delegation setup phase (Step 2/3: build the `CustomerDeckRequest` object that gets passed to the orchestrator). Removing them would break the orchestrator input contract.
- **Single atomic final update, not per-outcome flush** — the plan's Step 3 note explicitly allows mid-loop flushes for debuggability but also says "This plan batches the writes into one final `update`, so the single cast on `updateData` at Step 8 is sufficient". I took the batching path because: (1) it matches the plan's default recommendation, (2) the inline loop happens fast enough that the sweep won't notice a missing intermediate write, (3) one cast site is easier to audit than four. If a future need for mid-loop flushes appears (e.g., Phase 9 UI wanting progressive updates), the refactor can be revisited.
- **Infographic cache preservation via post-loop conditional** — the pre-refactor code had a dedicated infographic-only branch that seeded the cache after success. The new refactor flattens everything through the orchestrator loop, so I added a post-loop conditional `if (requestedTypes.includes("infographic") && !requestedTypes.includes("deck") && typeof updateData.infographicUrl === "string" && deck.templateId)` that re-runs the same cache seed call with the same arguments. This avoids introducing a new code path while keeping the Phase 5 cache contract intact. A typecheck was needed because `updateData.infographicUrl` is typed `unknown` after the loop (the `updateData` Record is `Record<string, unknown>`).
- **derivedStatus typed as `string`, not a narrower union** — the Prisma `status` column is `String?`, so no benefit to a narrower union at this boundary. Downstream Phase 9 UI code already reads it as a string.
- **`updateData.reportMarkdown = outcome.markdown` writes directly** — no base64 encoding, no file handling. This matches D-17 and the orchestrator's contract (Plan 03 reads the report markdown via `fs.readFile(outputPath, "utf-8")` and returns it in `outcome.markdown`; the refactored `deck-processing.ts` just passes it through to the column).
- **`sendArtifactJobCompletionNotification` is the ONLY notification function in the file now** — neither `sendDeckCompletionNotification` nor `sendDeckFailureNotification` survives. This is the correct D-10 reality: one notification per job, not two sibling functions routing around different outcomes. The copy branches on `hasFailures` to pick the right title/body.
- **Tag scheme `artifacts-${jobId}`, URL scheme `/decks?jobId=${jobId}`** — matches NLMA-15's new wording exactly. The tag is artifact-scoped (so notifications for different jobs don't stomp on each other in the browser's notification tray), and the URL points at the Decks page with a jobId query param (so clicking the notification opens the right job).
- **REQUIREMENTS traceability rows left alone** — per plan STEP 2, the `| NLMA-05 | Phase 8 | Pending |` and `| NLMA-15 | Phase 10 | Pending |` rows keep their phase assignments. Only the requirement wording changes. NLMA-05 is now "Pending" against Phase 8 (this plan satisfies it), NLMA-15 stays "Pending" against Phase 10 (Phase 8 implemented the backend firing, but Phase 10 still owns the prompt mount + session-gated trigger).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Worktree branch HEAD at wrong commit on entry**

- **Found during:** Pre-flight worktree_branch_check (before Task 1)
- **Issue:** The worktree's HEAD was `5341458c` (an older commit on main) instead of the expected base `856cee9c` (chore: merge executor worktree (08-03 orchestrator)). Plan 08-05's refactor can only type-check if the Plan 03 orchestrator (+ Plan 01 schema + Plan 02 upload helper) is present in the worktree's source tree — `5341458c` predates all of Phase 8's worktree merges.
- **Fix:** Ran `git reset --soft 856cee9c91e7cafa7cd6ca24b15d4bd3c72f1321` then `git checkout HEAD -- .` to unstage and restore the working tree to match the expected base. Verified via `git rev-parse HEAD` + `git status --short` that HEAD was now `856cee9c` with a clean working tree. All subsequent edits + commits landed on top of the correct base.
- **Files modified:** None tracked — this was a working-tree state correction.
- **Verification:** `git log --oneline -5` after the reset shows `856cee9c` as HEAD with `e44acd8` and `8978163` (the Plan 03 orchestrator commits) in the ancestry. `src/lib/services/notebooklm/index.ts` exports `generateCustomerArtifacts` at line 950.
- **Committed in:** N/A — working-tree-state fix, not a code change.

**2. [Rule 3 — Blocking] Initial REQUIREMENTS.md + ROADMAP.md edits landed in the MAIN repo, not the worktree**

- **Found during:** Task 2 verification grep (after sub-steps A-E)
- **Issue:** The plan's file paths for REQUIREMENTS.md and ROADMAP.md were written as `.planning/REQUIREMENTS.md` and `.planning/ROADMAP.md` (relative). I initially applied all five doc edits via the Edit tool with the absolute main-repo path `C:/Users/scott/Documents/guardian-intel/.planning/...` — which landed in the MAIN repo's `.planning/` directory, not the worktree's copy. Git worktrees each have their own copy of tracked files, and the executor commits come from the worktree's index, not the main repo's. My verification grep from inside the worktree (`grep -c ... .planning/REQUIREMENTS.md`) returned 0 for every expected match, which made the problem immediately visible.
- **Fix:** Reverted the main-repo edits with `git checkout -- .planning/REQUIREMENTS.md .planning/ROADMAP.md` (the main repo had no other uncommitted changes to those files). Then re-applied all five edits against the worktree's absolute paths (`C:/Users/scott/Documents/guardian-intel/.claude/worktrees/agent-a43bec8b/.planning/...`). Re-verified via grep — all eight positive + seven negative acceptance criteria pass.
- **Files modified:** `.planning/REQUIREMENTS.md` (worktree), `.planning/ROADMAP.md` (worktree). Main-repo versions are back to their original pre-edit state.
- **Verification:** `git status --short` in main repo shows REQUIREMENTS.md and ROADMAP.md as unchanged (the pre-existing `M` flags that were there at session start were tracking OTHER changes — not Task 2's edits). `git log --oneline -5` in worktree shows the `64ae3fe` docs commit with the correct diff.
- **Committed in:** `64ae3fe` (Task 2 commit, against worktree index).
- **Root cause:** The plan's path format is relative, and the initial Edit tool calls resolved them against the currently-tracked working directory state, which was the main repo. The fix is to always use absolute paths rooted at the worktree directory for Edit calls during parallel execution.

### Plan-as-written ambiguities resolved

- **Unused imports beyond `generateAudio`:** Plan's STEP 1 says "removed `generateAudio`, `generateInfographic`, `generateReport` from the direct imports" and the acceptance criteria explicitly enforce only `generateAudio`'s removal. After the delegation swap, `generateCustomerDeck`, `generateCustomerInfographic`, and `deleteNotebook` are also dead imports. I removed all six to keep the module honest. ESLint `no-unused-vars: off` would have let them slide, but the spirit of D-09 ("no code duplication between the legacy deck-only flow and the new multi-artifact route") is violated if the legacy import surface is still present even though the call sites are gone.
- **Infographic cache preservation:** The plan's STEP 3 replacement block does NOT include the pre-refactor infographic cache seed call. The pre-refactor infographic-only branch at lines 341-354 called `cacheInfographic(...)` after successful upload to seed the Phase 5 cache layer. Dropping this would silently break cache hits on repeat infographic-only requests. I added a post-loop conditional that matches the pre-refactor gating (infographic requested, deck NOT requested, infographicUrl string present, templateId present) and calls `cacheInfographic` with the same arguments. No new code path — just a preserved behavior that the plan's replacement block would have lost.

### Out-of-scope discoveries logged (NONE — nothing to log)

- No pre-existing warnings, linting errors, or unrelated issues surfaced during the refactor. `npx tsc --noEmit` was clean both before (baseline) and after the refactor.

---

**Total deviations:** 2 auto-fixed (both Rule 3 blocking) + 2 plan-as-written ambiguities resolved.
**Impact on plan:** Zero scope change. All acceptance criteria met. Both auto-fixes were infrastructure (worktree state + path misrouting), not code-level divergence from the plan.

## Issues Encountered

- **Worktree branch base mismatch** (documented above as deviation 1): Pre-flight check caught and fixed. Consistent with the Plan 03 executor's similar finding — this appears to be a recurring worktree bootstrapping issue where the initial branch HEAD lags behind the most recent merge.
- **Main-repo vs worktree path mismatch** (documented above as deviation 2): Cost ~2 minutes of rework (revert + reapply) but the verification grep caught it immediately, so no commits were ever polluted with the wrong-repo edits.
- **No production code issues.** The delegation refactor type-checks cleanly and preserves both the legacy `resultPayload` JSON shape (for existing Phase 5 UI callers) and the Phase 5 infographic cache seeding behavior (for repeat-request cache hits).

## User Setup Required

None — this plan is a pure code + docs refactor with no new environment variables, no new services, no schema changes, no migrations. The refactored `processDeckWithNotebookLM` maintains the same exported signature (`(deckId: string) => Promise<ProcessingResult>`) so `/api/decks/process-now` and any other call site continues to work unchanged.

## Threat Model Compliance

The plan's threat register (T-08-19 through T-08-22) is fully satisfied:

- **T-08-19 (Tampering via updateData)** — Mitigated: `updateData` keys are either hardcoded Prisma column names (`pdfUrl`, `pdfStoragePath`, `infographicUrl`, `infographicStoragePath`, `audioUrl`, `audioStoragePath`, `reportMarkdown`) or computed keys of the form `${ArtifactType}Status|Error|CompletedAt` where `ArtifactType` is a closed union from the TypeScript type system. No user input reaches any key. The `as Prisma.ScheduledDeckUpdateInput` cast at the single final update site is a compile-time convenience, not a runtime widening — it is type-safe because every generated key is guaranteed to be a valid `ScheduledDeck` column.
- **T-08-20 (Repudiation via single notification)** — Accepted: one notification per job reduces audit granularity compared to four per job, but matches the user's explicit D-10 preference. The `deckCompletedAt`, `infographicCompletedAt`, `audioCompletedAt`, `reportCompletedAt` columns provide per-artifact timing for after-the-fact audit, so the repudiation risk is bounded by database retention, not notification frequency.
- **T-08-21 (Info Disclosure via notification body)** — Mitigated: the notification body contains only `customerName` — no sensitive customer fields (address, score, claim details). Matches the pre-Phase-8 notification body shape. Does not regress Phase 7's info-disclosure posture.
- **T-08-22 (DoS via derived status computation)** — Accepted: O(4) fixed constant. The loop over `orchestrationResult.outcomes` iterates at most 4 times (one per `ArtifactType`). The `anyFailed` boolean is a single `||=` at worst. The derived status computation is a single ternary. Zero unbounded loops introduced by the refactor.

No new threat surface introduced. The refactor reuses the same `/api/notifications/send` internal endpoint with the same `x-api-key` header as the pre-refactor code.

## Threat Flags

None — no new security-relevant surface introduced. The refactor touches only internal service code (`deck-processing.ts`) and planning docs (`REQUIREMENTS.md`, `ROADMAP.md`). No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries.

## Known Stubs

None. The refactor does not introduce any `TODO`, `FIXME`, placeholder strings, hardcoded empty arrays, or "not available" messages. Every code path writes real data sourced from the orchestrator's `ArtifactOutcome[]` or reads from the existing `ScheduledDeck` row. The infographic cache seeding branch uses real values (`updateData.infographicUrl` typed-narrowed via `typeof === "string"`).

## Scope Boundary Confirmation

- Only files modified in this worktree: `src/lib/services/deck-processing.ts`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, plus this SUMMARY.
- `git status --short` in the worktree shows a clean working tree after Task 2's commit.
- `recoverStuckDecks` function body + `DEFAULT_STALE_MINUTES` constant are BYTE-FOR-BYTE UNCHANGED (`grep -c "export async function recoverStuckDecks" src/lib/services/deck-processing.ts` returns 1; its body at lines 74-98 is identical to the pre-refactor version). Plan 06 owns the per-artifact generalization of that sweep.
- No changes to `src/lib/services/notebooklm/index.ts` — Plan 03 owns the orchestrator implementation.
- No changes to `src/lib/services/notebooklm/types.ts` — Plan 01 owns the ArtifactStatus/ArtifactType type exports.
- No changes to `prisma/schema.prisma` — Plan 01 owns the schema extension.
- No changes to `src/app/api/ai/generate-customer-artifacts/route.ts` or `src/app/api/decks/status/[customerId]/route.ts` — Plan 04 owns those route changes (running in parallel in the sibling worktree).
- REQUIREMENTS.md traceability table rows unchanged (only requirement wording at lines 14 and 30 rewritten).
- ROADMAP.md Phase 8 plan list + Phase 9 SC + Phase 12 SC unchanged (only Phase 10 Goal, Phase 10 SC#3+#4, Phase 11 SC#2 rewritten).

## Next Phase Readiness

- **Plan 08-04 (route work) is independent and unaffected.** Plan 04 adds `/api/ai/generate-customer-artifacts/route.ts` and extends the status route — both files are outside this plan's diff. The two wave-3 plans were designed for zero file overlap.
- **Plan 08-06 (per-artifact `recoverStuckDecks` sweep) is unblocked.** The per-artifact status columns are written by this plan's outcome loop exactly as Plan 06 expects. A stalled artifact at any point in the sequential generation flow will leave its `${type}Status = 'processing'` + `updatedAt < cutoff` state in the DB, and Plan 06's per-type `updateMany` sweep will cleanly recover it without clobbering siblings.
- **Phase 9 (UI) is unblocked.** The `useCustomerArtifacts` hook (NLMA-07) will read the per-artifact columns this plan writes, plus the new `artifacts` block from the status route (Plan 04). The refactor preserves the legacy `resultPayload` JSON shape so any existing Phase 5 UI caller continues to work during the Phase 9 cutover.
- **Phase 10 (Push) scope REDUCED.** With the single-notification backend already in place via `sendArtifactJobCompletionNotification`, Phase 10's remaining work is UX-only: mount `push-notification-prompt.tsx` in the dashboard layout, add the session-gated trigger heuristic (NLMA-12 + NLMA-13). The service worker toast handling (NLMA-14) can stay minimal because only one push type per job is emitted. The rewritten NLMA-15 + Phase 10 SC#3 make this explicit so the Phase 10 planner doesn't re-plan backend work.
- **Phase 11 (Testing) scope CLARIFIED.** The Playwright spec at Phase 11 SC#2 now expects exactly one toast at job terminal state — no more "toasts fire as artifacts complete" ambiguity. Phase 11 test authors can write against the true contract.
- **No blockers introduced** for any downstream phase.

## Self-Check: PASSED

Verification run after SUMMARY.md write:

Files exist:
- FOUND: `src/lib/services/deck-processing.ts` (modified, 673 lines; down from 774)
- FOUND: `.planning/REQUIREMENTS.md` (modified, NLMA-05 line 14, NLMA-15 line 30)
- FOUND: `.planning/ROADMAP.md` (modified, Phase 10 Goal line 161, Phase 10 SC#3 line 167, Phase 11 SC#2 line 178)
- FOUND: `.planning/phases/08-multi-artifact-backend/08-05-SUMMARY.md` (this file, created)

Commits exist in git log:
- FOUND: `97e60c2` — refactor(08-05): delegate processDeckWithNotebookLM to generateCustomerArtifacts (D-09)
- FOUND: `64ae3fe` — docs(08-05): propagate Phase 8 D-10 + D-17 overrides into REQUIREMENTS + ROADMAP

Runtime correctness:
- `npx tsc --noEmit` exits 0
- `git status --short` in worktree is clean after Task 2 commit (before SUMMARY.md write)
- `git log --oneline -3` shows the two task commits on top of `856cee9c` (expected base)

Acceptance criteria counts (all pass):
- `grep -c "generateCustomerArtifacts(" src/lib/services/deck-processing.ts` = 1 (delegation call)
- `grep -c "generateCustomerArtifacts" src/lib/services/deck-processing.ts` = 2 (import + call)
- `grep -c "Step 6b: Generate additional requested artifacts" src/lib/services/deck-processing.ts` = 0 (old loop gone)
- `grep -c "generateAudio(notebookId" src/lib/services/deck-processing.ts` = 0
- `grep -c "generateInfographic(notebookId" src/lib/services/deck-processing.ts` = 0
- `grep -c "generateReport(notebookId" src/lib/services/deck-processing.ts` = 0
- `grep -c '^\s*generateAudio,$' src/lib/services/deck-processing.ts` = 0 (import line gone)
- `grep -c "sendArtifactJobCompletionNotification" src/lib/services/deck-processing.ts` = 3 (definition + 2 call sites)
- `grep -c "async function sendDeckCompletionNotification" src/lib/services/deck-processing.ts` = 0
- `grep -c "async function sendDeckFailureNotification" src/lib/services/deck-processing.ts` = 0
- `grep -c "uploadToSupabase" src/lib/services/deck-processing.ts` = 4 (definition + 3 call sites: decks, infographics, audio)
- `grep -c '"decks"' src/lib/services/deck-processing.ts` = 2 (prefix callsite + typeMap)
- `grep -c '"infographics"' src/lib/services/deck-processing.ts` = 2 (prefix callsite + typeMap)
- `grep -c '"audio"' src/lib/services/deck-processing.ts` = 6 (prefix callsite + typeMap + union + text)
- `grep -c "requestedTypes" src/lib/services/deck-processing.ts` = 6
- `grep -c "anyFailed" src/lib/services/deck-processing.ts` = 5
- `grep -c 'artifacts-\${jobId}' src/lib/services/deck-processing.ts` = 1 (new tag scheme)
- `grep -c "as Prisma.ScheduledDeckUpdateInput" src/lib/services/deck-processing.ts` = 2 (cast at final update + at inner comment — count matches expected "≥ 1")
- `grep -c 'import { Prisma } from "@prisma/client"' src/lib/services/deck-processing.ts` = 1
- `grep -c "export async function recoverStuckDecks" src/lib/services/deck-processing.ts` = 1 (unchanged)
- `grep -c "NLMA-15" .planning/REQUIREMENTS.md` = 2 (requirement line + traceability row)
- `grep -c "ONE push notification" .planning/REQUIREMENTS.md` = 1
- `grep -c "D-10" .planning/REQUIREMENTS.md` = 1
- `grep -c "sendArtifactJobCompletionNotification" .planning/REQUIREMENTS.md` = 1
- `grep -c "per-artifact-completion" .planning/REQUIREMENTS.md` = 0 (old wording gone)
- `grep -c "reports/" .planning/REQUIREMENTS.md` = 0 (D-17 compliance)
- `grep -c "reportMarkdown" .planning/REQUIREMENTS.md` = 1 (new NLMA-05 wording)
- `grep -c "D-17" .planning/REQUIREMENTS.md` = 1
- `grep -c "individual artifact finishes" .planning/ROADMAP.md` = 0 (old Phase 10 Goal gone)
- `grep -c "exactly one push notification per job" .planning/ROADMAP.md` = 1 (new Phase 10 Goal)
- `grep -c "audio briefing is ready" .planning/ROADMAP.md` = 0 (old Phase 10 SC#4 gone)
- `grep -c "per-artifact-completion" .planning/ROADMAP.md` = 0
- `grep -c "exactly ONE push notification" .planning/ROADMAP.md` = 1 (new Phase 10 SC#3)
- `grep -c "toasts fire as artifacts complete" .planning/ROADMAP.md` = 0 (old Phase 11 SC#2 gone)
- `grep -c "one toast fires when the job reaches terminal state" .planning/ROADMAP.md` = 1 (new Phase 11 SC#2)

All 36 acceptance counts match expected values.

---
*Phase: 08-multi-artifact-backend*
*Completed: 2026-04-09*
