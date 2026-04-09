# Phase 8: Multi-Artifact Backend - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

A single rep-authorized POST to `/api/ai/generate-customer-artifacts` with `{ customerId, artifacts: ['deck','infographic','audio','report'] }` returns a job ID immediately and begins background generation against ONE reused NotebookLM notebook. Per-artifact state is tracked in the existing `ScheduledDeck` row. Each artifact lands in a type-specific Supabase path with correct content-type headers. A stalled artifact is swept by per-artifact stuck-job recovery without clobbering already-completed artifacts in the same job. Prisma migrations commit cleanly against the extended `ScheduledDeck` model.

**In scope:** Prisma schema changes, `generateCustomerArtifacts` orchestrator, new POST route, extended status route response, new per-type storage paths, generalized `recoverStuckDecks`, one notification at job completion.

**Out of scope (Phase 9):** Any UI component, any customer-facing surface mount, `CustomerArtifactsPanel`, `AudioBriefingPlayer`, `ReportViewer`, Decks-page chip/modal retrofit (captured in Deferred Ideas).

**Out of scope (Phase 10):** Mounting `push-notification-prompt.tsx`, per-artifact push events (overridden — see decision D-10).

</domain>

<decisions>
## Implementation Decisions

### Prisma Schema (NLMA-01)

- **D-01:** Extend `ScheduledDeck` in place with per-artifact status columns. Add four sets of three: `deckStatus`/`deckError`/`deckCompletedAt`, `infographicStatus`/`infographicError`/`infographicCompletedAt`, `audioStatus`/`audioError`/`audioCompletedAt`, `reportStatus`/`reportError`/`reportCompletedAt`. All `String?` / `String?` / `DateTime?`. Existing URL columns (`pdfUrl`, `infographicUrl`, `audioUrl`, `reportMarkdown`) stay unchanged — they're already in place. Migration: additive only, zero data backfill needed.
- **D-02:** The existing top-level `status` field is derived from the per-artifact rollup, not written independently. Orchestrator computes it on every state transition: `pending` if all requested artifacts are pending, `processing` if any is processing, `completed` if all requested ones are terminal and none failed, `failed` if all terminal and any failed. One source of truth per artifact.
- **D-03:** Per-artifact status values are a TypeScript union type: `type ArtifactStatus = 'pending' | 'processing' | 'ready' | 'failed' | 'skipped'`. Exported from `src/features/multi-artifact/types.ts` (new file) or `src/lib/services/notebooklm/types.ts`. Prisma column type stays `String?` — no native Prisma enum. Consistent with the existing `status` column which is also a String.
- **D-04:** Add a `notebookId: String?` column to `ScheduledDeck`. Written when the orchestrator creates a notebook; nulled after successful cleanup. Purpose: enables the stuck-job sweep to attempt NotebookLM-side cleanup, and preserves debug trail on failure.
- **D-05:** No per-artifact progress column. UI renders an indeterminate spinner + contextual status message (e.g., "Generating audio briefing…") based on the status string. NLM CLI doesn't expose real progress — anything we'd write would be fake, and this matches the Phase 5 INFOG-021 rule ("no time estimates, no model names").

### Orchestrator (NLMA-02)

- **D-06:** Create `generateCustomerArtifacts({ customer, artifacts, notebookId? })` in `src/lib/services/notebooklm/index.ts` as a reusable orchestrator. Signature matches NLMA-02. If `notebookId` is null, create a new notebook, add sources, configure persona. If provided, reuse directly. Caller owns cleanup semantics.
- **D-07:** Generation is **sequential, fail-tolerant**: deck → infographic → audio → report, each wrapped in try/catch. On per-artifact failure, mark just that artifact's status as `failed` with its error, then continue the loop. Rationale: NLM CLI's `selectNotebook` is stateful — parallel `execCLI` calls against one notebook interleave unsafely. Sequential also makes the stuck-job sweep unambiguous (at most one artifact is `processing` per job at any moment).
- **D-08:** Each artifact is independent. Deck generation failure does NOT abort the rest — infographic, audio, and report all read from the notebook's sources directly, not from the deck. Only notebook-creation failure aborts the whole job before the loop starts.
- **D-09:** Refactor the existing multi-artifact loop inside `processDeckWithNotebookLM` (deck-processing.ts lines 427-533) to delegate to the new `generateCustomerArtifacts`. `processDeckWithNotebookLM` keeps payload parsing, formatting, and DB-write concerns; the orchestrator owns the notebook + generators. No code duplication between the legacy deck-only flow and the new multi-artifact route — both call the new orchestrator.
- **D-10:** **ONE push notification per job, not per artifact.** When the entire job reaches terminal state, fire exactly one push: "All artifacts ready for {customerName}" on success or "Some artifacts failed for {customerName}" if any failed. **This overrides NLMA-15 and Phase 10 Success Criterion #4.** Rationale: user explicitly rejected per-artifact notifications as "wearisome and annoying" — a 15-minute max wall time doesn't justify four separate pushes. REQUIREMENTS.md and ROADMAP.md must be updated when Phase 8 lands.

### API + Routes (NLMA-03, NLMA-04)

- **D-11:** New dedicated route: `POST /api/ai/generate-customer-artifacts` exactly as NLMA-03 specifies. Does NOT extend or replace the legacy `/api/decks/process-now` — that route stays untouched so existing deck-only UI flows keep working during Phase 9 cutover. Both routes call through `processDeckWithNotebookLM` which delegates to `generateCustomerArtifacts`.
- **D-12:** The new route wraps `assertCustomerAccess` (Phase 7 D-04) exactly like `/api/decks/status/[customerId]` does — fetch the `customer` row first with `select: { id, assignedRepId }`, run the ownership check, return 403 on failure. No new auth plumbing.
- **D-13:** Use inline manual validation for the request body, matching the existing pattern in `/api/decks/process-now`. Reject: non-array `artifacts`, empty array, unknown types, duplicates. Dedupe. No Zod schema — consistent with prior Phase 4 decision ("manual validation over Zod for API routes — keeps routes lightweight").
- **D-14:** POST returns minimal shape: `{ success: true, jobId, status: 'processing', customerId, requestedArtifacts }` with HTTP 202. UI polls the status endpoint for per-artifact state. No pre-populated artifacts block in the create response.
- **D-15:** Generalize `/api/decks/status/[customerId]` in place (do NOT create a new `/api/artifacts/status/[customerId]`). Add a new `artifacts` block to the response alongside all existing top-level fields. Old UI callers still read `pdfUrl`/`status` unchanged; new callers read `response.artifacts.{deck|infographic|audio|report}`. Zero URL churn, zero UI breakage. `assertCustomerAccess` + `recoverStuckDecks` integration already wired.
- **D-16:** Per-artifact block shape: `{ status, url, error, completedAt }`. Everything else derived client-side. `url` is the Supabase public URL for deck/infographic/audio. Report gets an extra `markdown: String` field (inline content from the `reportMarkdown` column) — no Supabase upload for reports.
- **D-17:** Reports stay inline in the `reportMarkdown` DB column. No `reports/` Supabase path. Matches existing code at `deck-processing.ts:507` where `reportMarkdown = await fs.readFile(reportResult.outputPath, "utf-8")`.

### Storage + Stuck-Recovery (NLMA-05, NLMA-06)

- **D-18:** Top-level per-type Supabase path prefixes: `decks/{jobId}/{name}.pdf`, `infographics/{jobId}/{name}.png`, `audio/{jobId}/{name}.mp3`. Matches NLMA-05 verbatim. Enables future per-type lifecycle policies (e.g., delete audio >30d without touching decks). Generalize the existing `uploadToSupabase` helper in `deck-processing.ts` to accept the top-level prefix as a parameter.
- **D-19:** Content types — deck: `application/pdf`, infographic: `image/png`, audio: `audio/mpeg`. Hardcoded, matching existing calls at `deck-processing.ts:316/453/483`. Report: no upload, no content-type.
- **D-20:** `recoverStuckDecks` generalizes to a per-artifact sweep. Four `updateMany` queries (one per artifact type) each scoped to `{type}Status = 'processing' AND updatedAt < cutoff`. Only the stalled artifact's fields flip to `failed` — sibling completed artifacts in the same row stay untouched. Because the orchestrator is sequential, at any given moment at most one artifact is `processing` per job, so the sweep is unambiguous.
- **D-21:** Stale threshold stays at 15 minutes, comparing against row `updatedAt` (not `createdAt`). Rationale: `updatedAt` bumps on every artifact transition, so a job where each artifact takes ~8 minutes in sequence still shows recent activity and stays out of the sweep. Only true stalls (nothing progressing) get recovered.
- **D-22:** Stuck-job sweep attempts best-effort NotebookLM-side cleanup: if the row has a `notebookId` and all per-artifact statuses are now terminal, call `deleteNotebook(notebookId)` inside a try/catch. Failure is logged but never blocks the sweep. Prevents orphaned notebooks on the NLM side.

### Claude's Discretion

- Migration file naming and sequencing in `prisma/migrations/`.
- Exact location of the new `ArtifactStatus` union type file (new `src/features/multi-artifact/types.ts` vs existing `src/lib/services/notebooklm/types.ts` vs `src/features/deck-generator/types.ts`).
- Whether `generateCustomerArtifacts` signature accepts `customerId` + fetches the row, or accepts a pre-fetched `customer` object (both are plausible; plan-phase picks one).
- Exact wording of error messages on per-artifact failure.
- Log prefix convention for the new orchestrator: `[MultiArtifact]` vs `[Orchestrator]` vs continuing the `[DeckProcessing]` prefix.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Code — Read These First

- `prisma/schema.prisma` §`ScheduledDeck` (lines 722-777) — the model being extended. `requestedArtifacts`, `pdfUrl`, `infographicUrl`, `audioUrl`, `reportMarkdown` fields are already present.
- `src/lib/services/deck-processing.ts` §`processDeckWithNotebookLM` (lines 164-620) — the main processing function. Multi-artifact loop at lines 427-533 is what gets refactored into `generateCustomerArtifacts`. `uploadToSupabase` helper at lines 117-147. `recoverStuckDecks` at lines 74-98 is the sweep to generalize.
- `src/lib/services/notebooklm/index.ts` — generator entry points: `generateSlideDeck` (line 186), `generateInfographic` (line 301), `generateAudio` (line 438), `generateReport` (line 537). `generateCustomerDeck` pipeline (line 658) is the existing high-level pattern. Each generator returns `notebookId` in its result so the caller can reuse across generators.
- `src/app/api/decks/process-now/route.ts` — fire-and-forget background route pattern to copy for the new `/api/ai/generate-customer-artifacts`. `maxDuration = 600`, `runtime = "nodejs"`, auth check, mark-processing-then-return.
- `src/app/api/decks/status/[customerId]/route.ts` — status polling route to generalize. Already wires `assertCustomerAccess` (D-05 Phase 7) and `recoverStuckDecks` (D-07 Phase 7). The response shape is what gets extended with the new `artifacts` block.

### Phase 7 Dependencies

- `src/lib/auth.ts` §`assertCustomerAccess` — Phase 7 D-04 rep-ownership helper. MUST wrap the new POST route.
- Phase 7 commit history for `recoverStuckDecks` introduction: `5f90de7`.

### Spec / Requirements

- `.planning/REQUIREMENTS.md` §"Multi-Artifact Backend" — NLMA-01 through NLMA-06 are this phase's requirements. **NLMA-15 must be rewritten** when this phase lands to reflect the one-notification rule (see D-10).
- `.planning/ROADMAP.md` §"Phase 8: Multi-Artifact Backend" — success criteria 1-5. **Phase 10 Success Criterion #4 must be rewritten** to remove the per-artifact push assertion (see D-10).
- `.planning/STATE.md` §"Phase 8 Context (ready-to-plan)" — current codebase reference points.
- `.planning/PROJECT.md` §"Constraints" — Navy/Gold/Teal palette, zero-config principle (relevant for Phase 9 but informs backend defaults).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`ScheduledDeck` Prisma model** — ~60% of the target schema already exists (`requestedArtifacts String[]`, `audioUrl`, `audioStoragePath`, `infographicUrl`, `infographicStoragePath`, `reportMarkdown`, `pdfUrl`, `pdfStoragePath`). Phase 8 adds per-artifact status columns and `notebookId`. Zero-risk migration.
- **`processDeckWithNotebookLM` multi-artifact loop** (`deck-processing.ts:427-533`) — generates audio + infographic + report from a reused notebook, uploads each to Supabase, handles per-artifact try/catch. This is the logic being extracted into `generateCustomerArtifacts`; ~90% of the work is already written.
- **`uploadToSupabase` helper** (`deck-processing.ts:117-147`) — takes `(deckId, filePath, storageName, contentType)`. Needs minor generalization to accept a top-level prefix parameter instead of hardcoding `decks/{deckId}/`.
- **NotebookLM generator return shape** — every `generate*` function returns `{ success, outputPath?, error?, notebookId? }`. `notebookId` is already plumbed through `generateCustomerDeck` (line 742) so the caller can reuse it.
- **Fire-and-forget route pattern** (`/api/decks/process-now`) — copy the skeleton: auth → validate → mark-processing → spawn IIFE → return 202. `maxDuration = 600` gives 10 minutes which is inside NLM's 12-minute poll window per generator.
- **`assertCustomerAccess` + rep-ownership pattern** — the status route already does the "fetch customer first, check ownership, then fetch deck" dance. Copy it verbatim into the new POST route.
- **`recoverStuckDecks`** — already called from the status route on every poll (`deck-processing.ts:74-98` + status route lines 59-63). Generalizing to per-artifact means updating the function body; the call site stays the same.
- **`GUARDIAN_PERSONA` constant** (`deck-processing.ts:101-111`) — notebook persona string already exists and is applied during notebook configuration. Reuse unchanged.

### Established Patterns

- **Sequential NLM CLI usage** — `selectNotebook` sets active notebook state, then `execCLI` commands run against it. Parallel is unsafe because two concurrent generators could interleave `selectNotebook` calls. Sequential is the only safe pattern.
- **Fire-and-forget IIFE pattern** — `.then().catch()` on a long-running promise after the HTTP response is already sent. Next.js serverless keeps the process alive until `maxDuration` or completion.
- **Inline validation in route handlers** — consistent with Phase 4 D-13 decision.
- **Self-healing stuck-job sweep** — on every status poll, the route calls `recoverStuckDecks` before reading the deck row. No cron needed.
- **Template instruction + persona feeds one notebook, multiple outputs** — `generateCustomerDeck` already constructs the notebook with sources + persona once, then generators pull from it. The orchestrator's job is to route that same notebook through all four generators instead of just slide-deck.
- **Push notification via internal API** — `sendDeckCompletionNotification` POSTs to `/api/notifications/send` with `x-api-key`. Generalize to `sendArtifactJobCompletionNotification(userId, customerName, jobId, hasFailures)`.

### Integration Points

- **New POST route** connects into `processDeckWithNotebookLM` (which itself now delegates to `generateCustomerArtifacts`). No new service boundaries.
- **Extended status route** — additive response shape, zero new URLs.
- **Extended `uploadToSupabase`** — one-parameter change, all existing call sites updated in the same commit.
- **`recoverStuckDecks` call site unchanged** — function signature stays `(staleMinutes?)` and returns a count. Internal body becomes a loop over artifact types.
- **Prisma client regeneration** — `prisma migrate dev` → commit schema + migration + regenerated client in one atomic commit.

</code_context>

<specifics>
## Specific Ideas

- **`ArtifactStatus` union type** — `'pending' | 'processing' | 'ready' | 'failed' | 'skipped'`. The `skipped` state covers artifacts not in the `requestedArtifacts` array for the job (e.g., a job that only asked for deck + audio has `infographicStatus: 'skipped'` and `reportStatus: 'skipped'`).
- **Derived overall `status`** — pseudocode: `const requested = requestedArtifacts; const states = requested.map(t => row[${t}Status]); status = states.every(s => s === 'pending') ? 'pending' : states.some(s => s === 'processing') ? 'processing' : states.some(s => s === 'failed') ? 'failed' : 'completed'`. Writes happen inside the orchestrator transition helpers, not as a separate computed column.
- **One-notification wording** — "All artifacts ready for {customerName}" on success; "Generation finished with errors for {customerName}" on any failure. Single push, single tag (`artifacts-${jobId}`), single URL (`/decks?jobId=${jobId}`).
- **Supabase path examples** — `decks/ckxy.../Anthony-Lewis.pdf`, `infographics/ckxy.../Anthony-Lewis-infographic.png`, `audio/ckxy.../Anthony-Lewis-audio.mp3`. Customer-name derivation reuses the existing `customerName.replace(/\s+/g, "-")` pattern from `deck-processing.ts`.
- **Stuck-job sweep per-type loop** — the `recoverStuckDecks` body becomes four `updateMany` calls plus one optional notebook cleanup pass. Each `updateMany` uses a dynamic column name via Prisma's `where` builder.

</specifics>

<deferred>
## Deferred Ideas

### Phase 9 (Multi-Artifact UI) — Locked Decisions to Carry Forward

User gave direct feedback on the existing Decks page during Phase 8 discussion. These are locked requirements for Phase 9 — the Phase 9 discuss-phase should NOT re-derive them:

- **D-DECKS-01 (Phase 9):** The Decks page (`src/app/(dashboard)/decks/`) must display a chip/thumbnail for every generated artifact type on each job card — not just infographics as it does today. Deck PDF, infographic PNG, audio MP3, and report markdown all need their own visual affordance on the card. Today only two cards (circled in user's screenshot 2026-04-09 17:11) show "Infographic" chips because they were infographic-only jobs — once Phase 8 backend supports multi-artifact jobs, every card should show chips for everything the job produced.
- **D-DECKS-02 (Phase 9):** Clicking an artifact chip must open a **large in-page modal** on the Decks page, NOT open the file in a new browser tab via `window.open`. The modal should render type-appropriately: PDF viewer for deck, image viewer (with pinch-to-zoom from Phase 5 INFOG-022) for infographic, `AudioBriefingPlayer` for audio, `ReportViewer` for report markdown. User's explicit words: "I would like for the preview to open in a large modal here on the same screen instead."
- **D-DECKS-03 (Phase 9):** NLMA-11 scope should **expand** beyond "customer profile modal + InfographicGeneratorModal success state + customer card." The Decks page is now a first-class mount surface for `CustomerArtifactsPanel` (or its card-level equivalent). Phase 9 planning must treat the Decks page as a required surface alongside the other three.

### NLMA-15 / Phase 10 Rewrite

- **D-PUSH-01:** Phase 10 (Push Notification Flow) must be rescoped. NLMA-15 as written ("fire push notifications per-artifact-completion") is **explicitly rejected** by D-10. Phase 10 Success Criterion #4 ("A rep mid-generation sees 'Your audio briefing is ready'…") is also rejected. Phase 10 still covers: mounting `push-notification-prompt.tsx`, session-gated trigger heuristic, one-notification-per-job firing (which Phase 8 already implements — so Phase 10 might shrink). When Phase 8 lands, update REQUIREMENTS.md and ROADMAP.md accordingly.

### Out-of-Scope for v1.1

- Video artifacts — mentioned by user in Decks-page feedback ("audio output or video output") but video is explicitly in the v1.0 "Out of Scope" list in PROJECT.md. If the user wants video in v1.2, note it as a v1.2 backlog item.
- Cross-customer artifact reuse (e.g., cache a neighborhood briefing and reuse it across all customers in that ZIP) — architecturally interesting but not a v1.1 requirement.
- Rate limiting on the new POST route — the existing routes don't rate-limit per-user either, and NLM's own 15-min-per-job wall time is a natural throttle.

</deferred>

---

*Phase: 08-multi-artifact-backend*
*Context gathered: 2026-04-09*
