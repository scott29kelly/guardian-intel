# Phase 7: Cleanup — Data Integrity, Security Hardening, NotebookLM Operational Hardening — Context

**Gathered:** 2026-04-07
**Status:** Ready for planning
**Source:** Codex adversarial review (`task-mnp6gcn3-ihhwdf`, 2026-04-07) + verification pass against actual codebase

<domain>
## Phase Boundary

Three categories of cleanup work, all targeted at the deck-generator and infographic-generator pipelines:

1. **Data integrity bugs** — fix silent data loss caused by Prisma field-name drift and a fake-sequential batch loop
2. **Security hardening** — add rep-ownership authorization to infographic and deck status routes; verify Supabase bucket ACL
3. **NotebookLM operational hardening** — add stuck-job recovery, allow cancelling processing jobs, fix the orphaned scheduled-decks cron

This phase does **NOT** include:
- Replacing NotebookLM (deliberate constraint per CLAUDE.md and saved feedback memory)
- Splitting `ScheduledDeck` into multiple tables (working, large refactor, low payoff)
- Re-enabling strict TypeScript / ESLint (accepted debt per CLAUDE.md)
- Refactoring `infographicDataAssembler` to use Prisma directly (works, future work)
- Wiring or deleting the offline cache feature (Tier 3, deferred to a separate decision phase)

</domain>

<decisions>
## Implementation Decisions

### Tier 1 — Data integrity bugs (must fix)

#### D-01: Claim field drift in infographic routes
- **Locked decision:** In both `src/app/api/ai/generate-infographic/route.ts` (line 140) and `src/app/api/ai/generate-infographic/batch/route.ts` (line 93), change the claim mapping fields to match the Prisma schema:
  - `c.type` → `c.claimType`
  - `c.amount` → `c.approvedValue`
  - `c.filedDate` → `c.dateOfLoss`
- **Why:** The Prisma `InsuranceClaim` model defines `claimType: String`, `approvedValue: Float?`, `dateOfLoss: DateTime` (`prisma/schema.prisma:303-310`). The current routes silently produce `undefined` values for every claim field, so customer briefings sent to NotebookLM contain no real claim data.
- **Verification:** grep confirms no instances of `c.type`, `c.amount`, or `c.filedDate` remain in either route file. The route's request payload contains real claim values when called against a customer with claims.

#### D-02: Batch route fake-sequential loop
- **Locked decision:** In `src/app/api/ai/generate-infographic/batch/route.ts:131-146`, make the processing loop **truly sequential** by `await`-ing each `processDeckWithNotebookLM(deckId)` call inside the for-loop. The current code says `// Fire processing sequentially (NotebookLM has rate limits)` but launches all jobs in parallel via fire-and-forget `.then()`.
- **Implementation:** Remove the fire-and-forget `.then()/.catch()` pattern. `await processDeckWithNotebookLM(deckId)` directly inside the loop. Wrap each iteration in try/catch so a single failure does not abort the batch.
- **Acceptance:** A batch of 3 customers spawns 3 sequential NotebookLM calls (verified via log timing or test).
- **Why:** NotebookLM CLI has shared global state (cookies, headless browser session). Parallel calls cause rate limits and state contention. The "fire-and-forget inside a loop" pattern is the worst of both worlds: it claims sequential semantics but delivers parallel reality.

#### D-03: Remove silent "first user" fallback
- **Locked decision:** In `src/app/api/ai/generate-infographic/route.ts:103-108` and `src/app/api/ai/generate-infographic/batch/route.ts:46-50`, remove the `prisma.user.findFirst()` fallback. If `session.user.id` does not resolve to a real DB user, return `401 Unauthorized` immediately.
- **Why:** The fallback was a defensive shim from earlier dev-bypass days. The current `auth.ts` uses PrismaAdapter, so `session.user.id` always points to a real user — meaning this fallback is dead code that, if ever triggered, silently misattributes work to a random user.
- **Acceptance:** Both routes return `401` if `session.user.id` does not exist in the `User` table. No `findFirst` fallback remains.

### Tier 2 — Security hardening

#### D-04: Rep-ownership authorization on infographic generate routes
- **Locked decision:** In both `src/app/api/ai/generate-infographic/route.ts` and `src/app/api/ai/generate-infographic/batch/route.ts`, after fetching the customer, verify the requesting user is allowed to access this customer. Authorization rule:
  - If `customer.assignedRepId === session.user.id` → allowed
  - Else if `session.user.role` is `"admin"` or `"manager"` → allowed
  - Else → return `403 Forbidden`
- **Why:** Currently any authenticated user can request infographics for any customer's data. Even though this is an internal sales tool, principle of least privilege says reps should only generate briefings for their own assigned customers (managers/admins can override).
- **Acceptance:** Calling `generate-infographic` with a customerId belonging to another rep returns `403`. Manager/admin role bypasses the check.

#### D-05: Rep-ownership authorization on deck status route
- **Locked decision:** In `src/app/api/decks/status/[customerId]/route.ts:41`, before returning the deck, verify the same authorization rule as D-04. Check the customer's `assignedRepId` matches `session.user.id` OR session role is admin/manager.
- **Acceptance:** GET on another rep's customer returns `403`.

#### D-06: Verify Supabase bucket ACL (investigation + conditional fix)
- **Locked decision:** Investigate whether the `deck-pdfs` (or `SUPABASE_STORAGE_BUCKET`) bucket is public or private. Check via Supabase MCP `list_buckets` or dashboard inspection.
  - **If private:** No fix needed. `getPublicUrl()` returns a URL that 401s without auth — current code is fine. Document the finding in the plan SUMMARY and CLAUDE.md.
  - **If public:** Switch `src/lib/services/deck-processing.ts:86` from `getPublicUrl()` to `createSignedUrl(path, ttlSeconds)` with a TTL of 7 days (matches the leave-behind cache TTL). Persist the signed URL to `pdfUrl`/`infographicUrl` and add a comment noting the URL expires in 7 days.
- **Acceptance:** Either (a) bucket is verified private and finding is documented, or (b) `createSignedUrl` replaces `getPublicUrl` in `deck-processing.ts`.

### Tier 4 — NotebookLM operational hardening

#### D-07: Stuck-job recovery sweep
- **Locked decision:** Add a sweep mechanism that transitions `ScheduledDeck` records from `processing` → `failed` after a stale threshold, so the UI and cancel flows unblock.
- **Implementation:** Add a helper function `recoverStuckDecks(staleMinutes: number = 15): Promise<number>` to `src/lib/services/deck-processing.ts` that:
  - Finds all `ScheduledDeck` rows with `status: "processing"` AND `updatedAt < now - staleMinutes minutes`
  - Updates them to `status: "failed"`, `errorMessage: "Job stalled — recovered by stuck-job sweep"`, `completedAt: now`
  - Returns the count of recovered jobs
- **Where to call it:** Invoke at the top of every `GET /api/decks/status/[customerId]` request (cheap query, idempotent). This means any UI poll triggers a sweep — no separate cron required.
- **Threshold rationale:** 15 minutes covers the longest legitimate NotebookLM run (12 min per `notebooklm/index.ts:334`) plus a buffer.
- **Acceptance:** A `ScheduledDeck` row with `status: "processing"` and `updatedAt` set to 16 minutes ago is recovered to `failed` on the next status poll.

#### D-08: Allow cancelling processing jobs
- **Locked decision:** In `src/app/api/decks/status/[customerId]/route.ts:156-160`, remove the hardcoded refusal to cancel `processing` jobs. Replace with: allow cancellation, but mark the deck as `failed` with `errorMessage: "Cancelled by user"` instead of deleting it (preserving audit trail). Only delete the row if `status` is already `pending` or `failed`.
- **Why:** Combined with D-07, this gives users an escape hatch for genuinely stuck jobs. Today the only escape is waiting 10+ minutes for the UI to mark it stale, and even then there's no cancel button.
- **Acceptance:** DELETE on a `processing` deck returns `200`, and the row's status is now `failed` with `errorMessage: "Cancelled by user"`. DELETE on a `pending` or `failed` deck still deletes the row.

#### D-09: Resolve orphaned scheduled-decks cron route
- **Locked decision:** **Delete** the `/api/cron/process-scheduled-decks` route entirely. With D-07 in place (stuck-job recovery on every status poll), there is no need for a separate cron-based recovery mechanism. The current route is deployed code that is never invoked (`vercel.json` only schedules `/api/analytics/aggregate`), and keeping it adds confusion and an unmonitored failure surface.
- **Files to delete:** `src/app/api/cron/process-scheduled-decks/route.ts` and any imports/references.
- **Acceptance:** The route file no longer exists. `grep -r process-scheduled-decks src/` returns zero matches outside `.planning/`.

### Claude's Discretion

- Test strategy: Add at least one unit/integration test per data-integrity bug fix (D-01, D-02). Use existing test patterns from `src/features/infographic-generator/utils/__tests__/` or `src/lib/services/__tests__/`. Skip tests for security checks if existing routes have no test coverage — match the surrounding codebase's coverage level.
- Plan structure: Break the work into 3-4 plans grouped by tier (Tier 1 / Tier 2 / Tier 4). Each plan should be independently committable.
- Wave assignment: Tier 1 plans should be Wave 1 (data correctness blocks everything else). Tier 2 + Tier 4 plans can run in Wave 2 in parallel.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Codex review source
- Codex adversarial review session: `019d6a03-6215-7150-a19b-6c1806b65ab2` (resume via `codex resume`)
- Job ID: `task-mnp6gcn3-ihhwdf`

### Project guidelines
- `CLAUDE.md` — Project constraints, naming conventions, error handling patterns, GSD workflow enforcement
- `.planning/STATE.md` — Accumulated decisions (note "NotebookLM only" feedback is locked)
- `.planning/PROJECT.md` — Core value and constraints
- `.planning/ROADMAP.md` — Phase 7 entry

### Files to be modified (for read_first blocks)
- `src/app/api/ai/generate-infographic/route.ts` — D-01, D-03, D-04
- `src/app/api/ai/generate-infographic/batch/route.ts` — D-01, D-02, D-03, D-04
- `src/app/api/decks/status/[customerId]/route.ts` — D-05, D-07, D-08
- `src/lib/services/deck-processing.ts` — D-06, D-07
- `src/app/api/cron/process-scheduled-decks/route.ts` — D-09 (delete)
- `prisma/schema.prisma` — reference for `InsuranceClaim` field names (lines 293-335) and `User.role` field

### Existing tests for pattern reference
- `src/features/infographic-generator/utils/__tests__/infographicDataAssembler.test.ts`

</canonical_refs>

<specifics>
## Specific Ideas

- Keep all changes surgical. This phase is bug fixes + minimal additions, not refactoring.
- D-07's sweep should be cheap — a single `updateMany` with a `WHERE` clause. No N+1 queries.
- D-08 should use `update` (not `delete`) for `processing` jobs to preserve the audit trail. The status route already accepts `failed` rows for the cancellation endpoint.
- D-04 / D-05 authorization helper: factor the rep-ownership check into a shared helper function (e.g., `assertCustomerAccess(session, customer)`) in `src/lib/auth.ts` to avoid duplicating the role-check logic across multiple routes.

</specifics>

<deferred>
## Deferred Ideas (NOT for this phase)

- Tier 3 from the original cleanup proposal (offline cache wire-up vs. delete; cron route decision) — handled in a separate "finish vs. delete" decision phase
- Replacing NotebookLM with a different generation backbone — explicitly out of scope (deliberate constraint)
- Splitting `ScheduledDeck` into `GenerationJob` + `GeneratedArtifact` tables — large refactor, defer
- Re-enabling strict TypeScript or ESLint rules — accepted debt per CLAUDE.md
- Refactoring `infographicDataAssembler.ts` to use Prisma directly instead of internal HTTP — known issue, defer

</deferred>

---

*Phase: 07-cleanup-data-integrity-bugs-security-hardening-and-notebookl*
*Context gathered: 2026-04-07 in conversation (no /gsd-discuss-phase needed — decisions locked from Codex review assessment)*
