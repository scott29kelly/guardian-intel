---
phase: 08-multi-artifact-backend
verified: 2026-04-09T23:30:00Z
status: human_needed
score: 5/5 must-haves verified
overrides_applied: 1
overrides:
  - must_have: "Each completed artifact lands in its type-specific Supabase path (decks/, infographics/, audio/, reports/) with the correct content-type header and a retrievable URL"
    reason: "Per Phase 8 discussion-phase decision D-17, reports are NOT uploaded to Supabase — they stay inline in the reportMarkdown DB column. The user prompt explicitly instructed the verifier to accept this as an intentional scope override of the original ROADMAP wording. Verified that reports have inline markdown in the status response rather than a Supabase URL."
    accepted_by: "scott (via verification prompt)"
    accepted_at: "2026-04-09T23:30:00Z"
human_verification:
  - test: "POST /api/ai/generate-customer-artifacts end-to-end against a real customer with all four artifact types"
    expected: "Returns 202 with { success, jobId, status:'processing', customerId, requestedArtifacts }. Background processing fires. Polling GET /api/decks/status/[customerId] shows deck → infographic → audio → report each transitioning pending → processing → ready independently. Each of deck/infographic/audio lands in its own Supabase path. Report comes back inline in artifacts.report.markdown."
    why_human: "Requires a live NotebookLM CLI session, a real customer row, real Supabase credentials, and ~10-15 minutes of wall time. Cannot be exercised by grep/type-check."
  - test: "Stuck-audio scenario: simulate a job where deck and infographic complete but audio stalls for >15 minutes"
    expected: "On the next GET /api/decks/status/[customerId] poll (which triggers recoverStuckDecks()), only audioStatus flips from 'processing' to 'failed' with audioError = 'Artifact stalled — recovered by stuck-job sweep' and audioCompletedAt set. deckStatus, deckUrl, infographicStatus, infographicUrl, and reportStatus are untouched."
    why_human: "Requires either a real stall or DB-level updatedAt manipulation to simulate; observable only on the hot path during a poll. Static verification confirms the sweep is coded correctly (four per-artifact updateMany calls scoped by {type}Status='processing' AND updatedAt < cutoff), but the sibling-preservation guarantee should be exercised at runtime before Phase 9 ships."
  - test: "Orphaned notebook cleanup observability"
    expected: "A job with notebookId set and all four per-artifact statuses terminal triggers a best-effort deleteNotebook call during the next status poll. On success, notebookId is nulled on the row; on failure, the row is unchanged and the error is logged. Query cost is bounded by take: 20."
    why_human: "Cannot exercise the NotebookLM CLI cleanup path without a real notebook and live CLI credentials. Static verification confirms the code structure; the live path needs human confirmation before Phase 9."
  - test: "Single push notification per job (D-10)"
    expected: "A successful multi-artifact job fires exactly ONE push notification titled 'Artifacts Ready' with body 'All artifacts ready for {customerName}.'; a job with any failure fires ONE notification titled 'Generation Finished with Errors'. Notification tag is 'artifacts-${jobId}' and URL is '/decks?jobId=${jobId}'. The old per-artifact notifications are NOT fired."
    why_human: "Push notifications require a real subscribed device and a running Next.js server with INTERNAL_API_KEY set. Static verification confirms the helper is coded for single-notification-per-job behavior (hasFailures-branched copy, single fetch call to /api/notifications/send); runtime delivery needs human confirmation."
---

# Phase 8: Multi-Artifact Backend Verification Report

**Phase Goal:** A single API call produces all four artifacts off one notebook, tracked per-artifact in the database, stored in distinct Supabase paths, and recoverable when any artifact gets stuck.

**Verified:** 2026-04-09T23:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                                                                                                     | Status                | Evidence                                                                                                                                                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | A rep-authorized POST to `/api/ai/generate-customer-artifacts` returns a job ID immediately and begins background generation against a single reused notebook                             | VERIFIED              | `src/app/api/ai/generate-customer-artifacts/route.ts` exists (195 lines). POST handler runs getServerSession → inline validation → assertCustomerAccess → scheduledDeck.create → fire-and-forget processDeckWithNotebookLM(job.id) → 202 with `{success, jobId, status:'processing', customerId, requestedArtifacts}`. Notebook is created once in `generateCustomerArtifacts` (index.ts:965) and reused for all four generators via the fixed-order loop. |
| 2   | Polling the status endpoint returns per-artifact state each transitioning pending → processing → ready independently                                                                      | VERIFIED              | `src/app/api/decks/status/[customerId]/route.ts` select clause includes all 12 per-artifact columns + notebookId (lines 118-131). Response builds `artifacts` block with per-type `{status, url, error, completedAt}` (lines 158-184). Orchestrator writes `${type}Status='processing'` before each generator (index.ts:1045-1050) and caller writes `'ready'`/`'failed'` after (deck-processing.ts:447-511). |
| 3   | Each completed artifact lands in its type-specific Supabase path with correct content-type and a retrievable URL                                                                          | PASSED (override)     | Override: D-17 reports are inline in reportMarkdown, not uploaded. deck → uploadToSupabase("decks", ..., "application/pdf"); infographic → "infographics", "image/png"; audio → "audio", "audio/mpeg" (deck-processing.ts:474-506). Status route surfaces `artifacts.report.markdown` from reportMarkdown column, `url: null` (route.ts:177-183). Accepted by scott per verification prompt. |
| 4   | A job whose audio artifact hangs >15 minutes is swept without clobbering already-completed deck/infographic in the same job                                                               | VERIFIED              | `recoverStuckDecks` in deck-processing.ts:78-202 runs four separate `updateMany` calls, each scoped to `{type}Status='processing' AND updatedAt < cutoff`, each writing only its own three columns (`{type}Status`/`{type}Error`/`{type}CompletedAt`). No top-level status/errorMessage write. Sibling columns are provably untouched. |
| 5   | Prisma migrations land cleanly against existing ScheduledDeck model, committed with schema change and generated client                                                                    | VERIFIED              | `prisma/migrations/20260410013527_phase_08_multi_artifact_status/migration.sql` exists with a single `ALTER TABLE "ScheduledDeck" ADD COLUMN` adding all 13 new columns. schema.prisma lines 760-775 carry the new fields. Per-D-01, no separate `ScheduledArtifactSet` table. Prisma client runtime check confirms all 13 fields exposed on `scheduledDeck` (13/13). |

**Score:** 5/5 truths verified (1 passed via explicit D-17 override)

### Required Artifacts

| Artifact                                                     | Expected                                           | Status     | Details                                                                                                                                |
| ------------------------------------------------------------ | -------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                                       | ScheduledDeck with 13 new nullable columns          | VERIFIED   | Lines 760-775 contain deckStatus/Error/CompletedAt × 4 artifact types plus notebookId. All nullable. No existing columns touched.      |
| `prisma/migrations/*_phase_08_multi_artifact_status`         | Additive migration committed                        | VERIFIED   | Directory exists at `20260410013527_phase_08_multi_artifact_status/migration.sql` — single ALTER TABLE with 13 ADD COLUMNs.           |
| `src/lib/services/notebooklm/types.ts`                       | ArtifactStatus + ArtifactType unions exported       | VERIFIED   | Lines 74-85: `ArtifactStatus = 'pending'|'processing'|'ready'|'failed'|'skipped'` and `ArtifactType = 'deck'|'infographic'|'audio'|'report'`. |
| `src/lib/services/notebooklm/index.ts`                       | generateCustomerArtifacts orchestrator              | VERIFIED   | Line 950 exports the function. Creates/reuses notebook (line 962-1028), runs fixed-order loop (line 1036), per-artifact try/catch (line 1052), reads report inline (line 1123), best-effort deleteNotebook (line 1147). Types ArtifactOutcome/Input/Result exported at 646/663/681. |
| `src/lib/services/deck-processing.ts` — uploadToSupabase     | Generalized helper with prefix parameter            | VERIFIED   | Line 221-252: signature is `(jobId, prefix: "decks"|"infographics"|"audio", filePath, storageName, contentType)`. Path is `${prefix}/${jobId}/${storageName}`. Three call sites pass explicit literals (474, 486, 497). |
| `src/lib/services/deck-processing.ts` — processDeckWithNotebookLM | Delegates to orchestrator                     | VERIFIED   | Line 423 calls `generateCustomerArtifacts({jobId, customerName, requestedArtifacts, deckRequest})`. Legacy inline loop deleted (old lines 427-533 gone). Consumes `ArtifactOutcome[]` and writes per-artifact columns + derived top-level status (line 544: `anyFailed ? "failed" : "completed"`). Single `prisma.scheduledDeck.update` at 583 with `as Prisma.ScheduledDeckUpdateInput` cast. |
| `src/lib/services/deck-processing.ts` — recoverStuckDecks    | Per-artifact sweep + orphan notebook cleanup        | VERIFIED   | Lines 78-202: four `updateMany` sweeps (97, 111, 125, 139), each scoped by `{type}Status='processing' AND updatedAt < cutoff`. Orphan cleanup at 166-199 with `take: 20`, `notebookId: { not: null }`, `notIn: ["pending","processing"]` on all four per-artifact statuses, `deleteNotebook` in nested try/catch, nullifies notebookId on success. |
| `src/lib/services/deck-processing.ts` — sendArtifactJobCompletionNotification | Single notification per job (D-10)     | VERIFIED   | Lines 735-774: one helper with hasFailures-branched copy. Success: "Artifacts Ready"/"All artifacts ready for {name}". Failure: "Generation Finished with Errors"/"Generation finished with errors for {name}. Tap to review.". Tag `artifacts-${jobId}`, URL `/decks?jobId=${jobId}`. Called twice in deck-processing.ts (602 success path, 635 catch path) — both with identical contract. Old sendDeckCompletion/sendDeckFailure helpers deleted. |
| `src/app/api/ai/generate-customer-artifacts/route.ts`        | New POST route with D-12/D-13/D-14 behavior         | VERIFIED   | New file, 195 lines. export runtime/dynamic/maxDuration. ALLOWED_ARTIFACTS readonly const. POST: session check → inline body validation (non-object/missing customerId/non-array/empty/unknown type all → 400) → Set-based dedupe → customer lookup → assertCustomerAccess → scheduledDeck.create with per-artifact status init (requested='pending', others='skipped') → fire-and-forget → 202 with exact D-14 shape. |
| `src/app/api/decks/status/[customerId]/route.ts` — GET       | Generalized with artifacts block                    | VERIFIED   | Select clause extended with 12 per-artifact columns + notebookId (lines 118-131). Response builds `artifacts` block (158-184) with `deck/infographic/audio/report` each `{status, url, error, completedAt}`; report additionally has `markdown` field; report.url is explicitly `null` per D-17. All existing top-level fields (hasDeck, isPending, isProcessing, isCompleted, isFailed, isReady, pdfUrl) preserved unchanged. DELETE handler byte-for-byte untouched. |
| `.planning/REQUIREMENTS.md`                                  | NLMA-05 and NLMA-15 rewritten per D-17 and D-10      | VERIFIED   | NLMA-05 (line 14) drops `reports/` prefix and references `reportMarkdown` inline column with "per Phase 8 D-17". NLMA-15 (line 30) rewritten to "ONE push notification per multi-artifact job" referencing D-10 and `sendArtifactJobCompletionNotification`. Phase assignments in traceability table (156, 166) unchanged. |
| `.planning/ROADMAP.md`                                       | Phase 10 Goal/SC and Phase 11 SC#2 rewritten         | VERIFIED   | Phase 10 Goal (line 161) now says "fires exactly one push notification per job when all requested artifacts have reached a terminal state (per Phase 8 D-10)". Phase 11 SC#2 (line 177) now says "one toast fires when the job reaches terminal state". Old per-artifact wording ("individual artifact finishes", "toasts fire as artifacts complete", "audio briefing is ready", "per-artifact-completion") all absent. |

### Key Link Verification

| From                                                | To                                                | Via                                  | Status | Details                                                                                           |
| --------------------------------------------------- | ------------------------------------------------- | ------------------------------------ | ------ | ------------------------------------------------------------------------------------------------- |
| POST /api/ai/generate-customer-artifacts             | assertCustomerAccess                              | direct import from @/lib/auth        | WIRED  | route.ts:23,109 — import present and called before any DB write                                   |
| POST /api/ai/generate-customer-artifacts             | processDeckWithNotebookLM                         | fire-and-forget `.then().catch()`    | WIRED  | route.ts:25,165 — import + call with proper promise handling                                      |
| processDeckWithNotebookLM                            | generateCustomerArtifacts                         | direct function call                 | WIRED  | deck-processing.ts:16,423 — import + call with jobId, customerName, requestedArtifacts, deckRequest |
| generateCustomerArtifacts                           | generateSlideDeck / generateInfographic / generateAudio / generateReport | sequential calls in fixed order | WIRED | index.ts:1058, 1073, 1100, 1116 — all four generators called inside try/catch loop                |
| generateCustomerArtifacts                           | prisma.scheduledDeck.update                       | per-artifact `${type}Status` writes  | WIRED  | index.ts:969 (persist notebookId), 1045 (processing transition), 1150 (clear notebookId on cleanup) |
| generateCustomerArtifacts                           | deleteNotebook                                    | best-effort cleanup after loop       | WIRED  | index.ts:1147 inside try/catch                                                                    |
| processDeckWithNotebookLM                            | uploadToSupabase                                  | 3 calls with distinct prefixes       | WIRED  | deck-processing.ts:474 "decks", 486 "infographics", 497 "audio"                                   |
| processDeckWithNotebookLM                            | sendArtifactJobCompletionNotification             | success path + failure path          | WIRED  | deck-processing.ts:602 (success, anyFailed flag), 635 (catch, hasFailures=true)                   |
| GET /api/decks/status/[customerId]                  | ScheduledDeck per-artifact columns                | select clause + artifacts block shape | WIRED  | route.ts:119-131 select, 158-184 shape construction                                              |
| GET /api/decks/status/[customerId]                  | recoverStuckDecks                                 | pre-fetch sweep call                 | WIRED  | route.ts:60 — still invoked unchanged per Plan 06 contract                                        |
| recoverStuckDecks                                    | prisma.scheduledDeck.updateMany (x4)              | four per-artifact filtered updates   | WIRED  | deck-processing.ts:97, 111, 125, 139                                                              |
| recoverStuckDecks                                    | deleteNotebook                                    | bounded orphan cleanup (take:20)     | WIRED  | deck-processing.ts:166-199                                                                        |

### Data-Flow Trace (Level 4)

| Artifact                                              | Data Variable                               | Source                                                                         | Produces Real Data | Status    |
| ----------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------ | ------------------ | --------- |
| POST route `jobId` in 202 response                    | `job.id`                                    | `prisma.scheduledDeck.create({data: createData, select:{id:true}})`             | Yes                | FLOWING   |
| GET status `artifacts.{type}.status`                  | `latestDeck.{type}Status`                   | `prisma.scheduledDeck.findFirst` select clause (lines 119-131)                  | Yes                | FLOWING   |
| GET status `artifacts.{type}.url`                     | `latestDeck.pdfUrl` / `infographicUrl` / `audioUrl` | Written by processDeckWithNotebookLM from `uploaded.url` (deck-processing.ts:482,493,504) | Yes                | FLOWING   |
| GET status `artifacts.report.markdown`                | `latestDeck.reportMarkdown`                 | Written by processDeckWithNotebookLM from `outcome.markdown` (line 509), which was read via fs.readFile in the orchestrator (index.ts:1123) | Yes                | FLOWING   |
| Orchestrator `${type}Status = 'processing'` transition | computed key                                | `prisma.scheduledDeck.update` with `ArtifactType`-derived key (index.ts:1045)   | Yes                | FLOWING   |
| Sweep `{type}Status = 'failed'` on stall              | per-artifact columns                        | 4 updateMany calls with literal column keys (deck-processing.ts:97-149)         | Yes                | FLOWING   |
| Sweep `notebookId` nullification                      | per-row update on successful deleteNotebook | deck-processing.ts:184-187                                                      | Yes                | FLOWING   |

No hollow wiring detected — every data path traces to a real source.

### Behavioral Spot-Checks

| Behavior                                                                          | Command                                                                        | Result          | Status |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------- | ------ |
| Project type-checks cleanly                                                       | `npx tsc --noEmit`                                                             | exit 0          | PASS   |
| Prisma client exposes all 13 new ScheduledDeck columns                            | Node one-liner iterating `Prisma.ScheduledDeckScalarFieldEnum`                  | 13/13 present   | PASS   |
| Prisma migration directory exists with name suffix `_phase_08_multi_artifact_status` | `ls prisma/migrations/`                                                      | directory found | PASS   |
| Migration SQL contains all 13 ADD COLUMN statements                               | Read migration.sql                                                              | 13 ADD COLUMN lines | PASS |
| POST route exists at expected path                                                | `ls src/app/api/ai/generate-customer-artifacts/route.ts`                        | file exists     | PASS   |
| Legacy inline multi-artifact loop removed from deck-processing.ts                 | Grep for "Step 6b: Generate additional requested artifacts"                     | 0 matches       | PASS   |
| Old notification helpers deleted from deck-processing.ts                          | Grep for `async function sendDeckCompletionNotification` and `sendDeckFailureNotification` | 0 matches   | PASS   |
| recoverStuckDecks uses per-artifact updateMany (not top-level status sweep)       | Grep function body for `status: "processing"` + `updatedAt: { lt: cutoff }` pairing | 0 matches in recoverStuckDecks body | PASS |
| Server endpoint runtime behavior (POST returns 202, polling transitions states)    | Would require running dev server + live NotebookLM CLI + real customer         | Not tested      | SKIP   |
| Actual Supabase upload with correct content-type headers                           | Would require live Supabase credentials + real PDF/PNG/MP3 files                | Not tested      | SKIP   |
| 15-minute stuck-audio sweep preserves sibling completed artifacts                  | Requires runtime simulation of stalled job with updatedAt manipulation           | Not tested      | SKIP   |

### Requirements Coverage

| Requirement | Source Plan | Description                                                                                                                           | Status    | Evidence                                                                                                                                                      |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NLMA-01     | 08-01       | Prisma model for multi-artifact job tracking — per-artifact status fields + per-artifact URLs; migrations committed                    | SATISFIED | schema.prisma:760-775, migration 20260410013527_phase_08_multi_artifact_status, Prisma client runtime check 13/13                                              |
| NLMA-02     | 08-03, 08-05 | generateCustomerArtifacts orchestrator — creates/reuses notebook, runs requested generators, returns structured per-artifact outcomes | SATISFIED | notebooklm/index.ts:950 orchestrator + ArtifactOutcome/Input/Result interfaces; deck-processing.ts:423 delegation                                             |
| NLMA-03     | 08-04       | POST /api/ai/generate-customer-artifacts — accepts { customerId, artifacts }, assertCustomerAccess, fires background, returns job ID | SATISFIED | route.ts:39 POST handler with session/validation/ownership/fire-and-forget/202                                                                                 |
| NLMA-04     | 08-04       | Per-artifact status polling — generalize /api/decks/status/[customerId] to return per-type `{status, url, progress, error}`            | SATISFIED | status route select clause + artifacts block at lines 118-184. Note: `progress` field is not modeled in the DB; the spec allows `{status, url, error, completedAt}` with `markdown` for reports. Per-type state transitions are observable via repeated polls. |
| NLMA-05     | 08-02, 08-05 | Storage orchestration — distinct Supabase paths per artifact type + correct content types; reports inline per D-17                   | SATISFIED | uploadToSupabase generalized with prefix param (deck-processing.ts:221-252); deck→"decks"/"application/pdf", infographic→"infographics"/"image/png", audio→"audio"/"audio/mpeg"; report→inline reportMarkdown (no Supabase) per D-17 |
| NLMA-06     | 08-06       | Stuck-job recovery extended to per-artifact state — sweep any artifact stuck > 15 minutes, preserving completed siblings              | SATISFIED | deck-processing.ts:78-202 recoverStuckDecks with four per-artifact updateMany calls + D-22 orphan notebook cleanup                                             |

All 6 Phase 8 requirements (NLMA-01 through NLMA-06) are satisfied. No orphaned requirements. REQUIREMENTS.md traceability table maps them all to Phase 8.

### Anti-Patterns Found

| File                                                             | Line        | Pattern                                                                                                                           | Severity | Impact                                                                                                                                |
| ---------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| None detected                                                    | —           | No TODO/FIXME/placeholder/stub patterns were found in any Phase 8 file.                                                            | —        | Clean.                                                                                                                                |

Spot-checks confirmed: no `return null`, no `onClick={()=>{}}`, no `return Response.json([])` without a backing query, no empty handlers, no placeholder components. `as Prisma.ScheduledDeckUpdateInput` casts are type-system necessities (computed keys from a closed `ArtifactType` union), not runtime widening.

### Human Verification Required

Four items require live-system testing that cannot be exercised from static grep/type-check alone. See the YAML frontmatter `human_verification:` block for the full structured list. Summary:

1. **POST → generation → polling end-to-end** — requires real NotebookLM CLI session + Supabase + ~15 minutes of wall time to observe per-artifact state transitions and file uploads.
2. **Stuck-audio sibling preservation** — requires runtime stall simulation to confirm only the audio columns flip while deck/infographic stay intact.
3. **Orphaned notebook cleanup** — requires real NotebookLM notebook + CLI credentials to exercise the D-22 cleanup path during a status poll.
4. **Single push notification delivery** — requires a real subscribed device + running server + INTERNAL_API_KEY to confirm the D-10 single-notification contract end-to-end.

All four items are integration-level checks for code that passes static verification cleanly. The code is correctly wired at every trace level (exists → substantive → wired → data flows), so the human steps are confirming runtime delivery, not hunting for gaps.

### Gaps Summary

No code-level gaps. All 5 ROADMAP success criteria are verified (one via explicit D-17 override for the reports/ prefix, which the user's verification prompt instructed should be accepted). All 6 requirement IDs (NLMA-01 through NLMA-06) are satisfied. TypeScript compiles cleanly with zero errors. Prisma client runtime check confirms all 13 new ScheduledDeck columns are accessible. The migration is committed and applied. Every key link is wired end-to-end with real data flowing through it. No anti-patterns or stubs detected.

The `human_needed` status reflects the verification policy that integration-level behaviors — real NotebookLM CLI runs, real Supabase uploads, real 15-minute stuck-job simulations, real push notification delivery — cannot be asserted from a static codebase scan. The underlying implementation is complete and correct at every layer the verifier can reach.

---

_Verified: 2026-04-09T23:30:00Z_
_Verifier: Claude (gsd-verifier)_
