---
phase: 08-multi-artifact-backend
reviewed: 2026-04-09T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - prisma/schema.prisma
  - prisma/migrations/20260410013527_phase_08_multi_artifact_status/migration.sql
  - src/lib/services/notebooklm/types.ts
  - src/lib/services/notebooklm/index.ts
  - src/lib/services/deck-processing.ts
  - src/app/api/ai/generate-customer-artifacts/route.ts
  - src/app/api/decks/status/[customerId]/route.ts
findings:
  critical: 0
  warning: 6
  info: 7
  total: 13
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-04-09
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Phase 8 extends `ScheduledDeck` with per-artifact status columns (deck/infographic/audio/report), introduces a `generateCustomerArtifacts` orchestrator, refactors `processDeckWithNotebookLM` to delegate to it, and adds a new `POST /api/ai/generate-customer-artifacts` route plus a generalized status GET. Auth and input validation are handled correctly on the new route via `assertCustomerAccess` and inline manual validation per D-13.

The overall architecture is sound: sequential orchestration with per-artifact isolation, fail-tolerant with self-healing stuck-job sweep, and type-safe Prisma updates. However, the recovery paths leave a few state-consistency gaps that can strand artifacts in `pending` and leak NotebookLM notebooks. Six warnings and seven info items follow — no critical issues.

Auth posture is solid: both `POST /api/ai/generate-customer-artifacts` and `GET/DELETE /api/decks/status/[customerId]` call `assertCustomerAccess` after fetching a minimal `{id, assignedRepId}` projection. Input validation on the new route is thorough (customerId non-empty string, artifacts is a non-empty deduped array of allowed types).

## Warnings

### WR-01: Pending artifacts are never recovered if orchestrator aborts before transitioning them to 'processing'

**File:** `src/lib/services/deck-processing.ts:78-202` and `src/lib/services/notebooklm/index.ts:1009-1018`
**Issue:** The stuck-job sweep in `recoverStuckDecks` only targets rows where `{artifact}Status === "processing"`. If `generateCustomerArtifacts` aborts during notebook setup (createNotebook succeeded, or addSources/configureNotebook threw), it returns `{ aborted: true }` and `processDeckWithNotebookLM` throws into its top-level catch, which sets only `status: "failed"` — it never touches `deckStatus`, `infographicStatus`, `audioStatus`, or `reportStatus`. Those columns remain at `"pending"` (for the requested artifacts) forever. The GET status response will report the top-level status as `"failed"` but the per-artifact `artifacts` block will still show `pending`, creating a permanent inconsistency that the UI will surface.
**Fix:** In the outer catch of `processDeckWithNotebookLM`, transition any still-`pending` or still-`processing` per-artifact columns to `failed` with a matching error. For example, build a fail-all update block from `deck.requestedArtifacts` before the `prisma.scheduledDeck.update({ data: { status: "failed", ... } })` call:

```ts
const now = new Date();
const failAll: Record<string, unknown> = {};
const typeMap: Record<string, ArtifactType> = { "slide-deck": "deck", deck: "deck", infographic: "infographic", audio: "audio", report: "report" };
const requestedTypes = Array.from(new Set((deck.requestedArtifacts || ["slide-deck"]).map(t => typeMap[t]).filter((t): t is ArtifactType => !!t)));
for (const t of requestedTypes) {
  failAll[`${t}Status`] = "failed";
  failAll[`${t}Error`] = errorMessage;
  failAll[`${t}CompletedAt`] = now;
}
await prisma.scheduledDeck.update({
  where: { id: deckId },
  data: {
    ...failAll,
    status: "failed",
    errorMessage,
    retryCount: { increment: 1 },
    processingTimeMs: Date.now() - startTime,
  } as Prisma.ScheduledDeckUpdateInput,
});
```

### WR-02: NotebookLM notebook leaks when orchestrator setup fails after createNotebook succeeds

**File:** `src/lib/services/notebooklm/index.ts:961-1018`
**Issue:** In `generateCustomerArtifacts`, `createNotebook` runs first, then `prisma.scheduledDeck.update({ data: { notebookId } })`, then `addSources`, then `configureNotebook`. If the persist-notebookId update or `addSources` throws, the catch block at line 1009 returns `{ aborted: true, notebookId }` without calling `deleteNotebook`. The orphan sweep in `recoverStuckDecks` won't pick this row up either, because it requires ALL per-artifact columns to be in `notIn: ["pending", "processing"]` — but the requested artifacts are still `pending` (see WR-01). The notebook leaks indefinitely on the NotebookLM side and consumes a source-limit slot.
**Fix:** Wrap the setup failure path in explicit cleanup:

```ts
} catch (setupErr) {
  const errorMessage = setupErr instanceof Error ? setupErr.message : String(setupErr);
  console.error(`[MultiArtifact] Notebook setup failed for job ${jobId}:`, errorMessage);
  // Best-effort cleanup of the notebook we just created
  if (notebookId) {
    try { await deleteNotebook(notebookId); } catch (cleanupErr) {
      console.warn(`[MultiArtifact] Cleanup after setup failure failed:`, cleanupErr);
    }
  }
  return { notebookId: null, aborted: true, abortReason: `Notebook setup failed: ${errorMessage}`, outcomes: [] };
}
```

Combined with WR-01's fix, the row will also be marked failed end-to-end.

### WR-03: `setTimeout` for temp-file cleanup in `addSources` orphans files on process exit

**File:** `src/lib/services/notebooklm/index.ts:133-138`
**Issue:** For text sources, `addSources` writes a temp file and schedules `setTimeout(() => fs.unlink(tempFile).catch(() => {}), 30000)`. In a Vercel serverless or process-restart scenario, if the function completes and the instance is reclaimed before 30s elapse, the timer never fires and the temp file is orphaned in `/tmp`. This gradually fills the ephemeral disk over many invocations. Also, `setTimeout` holds a reference that can prolong process lifetime. For multi-artifact jobs that take 10+ minutes, the file is still needed throughout — so the 30s delay may be too short for a large addSources batch.
**Fix:** Delete immediately after the `execCLI(args)` call returns (the CLI has read the file by then). Use `try/finally`:

```ts
case "text": {
  const tempFile = path.join(os.tmpdir(), `nlm-source-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
  await fs.writeFile(tempFile, source.content, "utf-8");
  try {
    const result = await execCLI(["source", "add", tempFile]);
    // ...log as usual
  } finally {
    fs.unlink(tempFile).catch(() => {});
  }
  continue; // skip the shared execCLI below
}
```

Also note: `Date.now()` in the filename can collide under rapid iteration — add a random suffix as shown.

### WR-04: `recoverStuckDecks` runs expensive work on every status poll

**File:** `src/app/api/decks/status/[customerId]/route.ts:59-63` and `src/lib/services/deck-processing.ts:78-202`
**Issue:** Every single GET to `/api/decks/status/[customerId]` triggers `recoverStuckDecks()`, which performs 4 `updateMany` calls plus a `findMany(take: 20)` plus up to 20 `deleteNotebook` CLI invocations (each of which shells out to Python). During normal polling (every 5-10s per customer from the UI) this amplifies into dozens of CLI spawns per minute across users, plus 4 table-scanning updateManys. The orphan cleanup alone can block the status response for several seconds if the CLI is slow. The sweep is gated inside its own try/catch so it won't crash the route, but it is still awaited — a slow sweep slows every poll.
**Fix:** Gate the sweep behind a module-level `lastSweep` timestamp so it runs at most once per 60 seconds regardless of caller:

```ts
// deck-processing.ts
let lastSweepAt = 0;
const SWEEP_INTERVAL_MS = 60_000;

export async function recoverStuckDecks(staleMinutes = DEFAULT_STALE_MINUTES): Promise<number> {
  const now = Date.now();
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return 0;
  lastSweepAt = now;
  // ...existing body
}
```

Also consider moving the 20-notebook orphan cleanup to a less hot path (e.g., gate it behind `staleMinutes` or run only 1-in-N polls).

### WR-05: `processDeckWithNotebookLM`'s per-artifact `updateData` uses `Record<string, unknown>` that bypasses Prisma's checked typing

**File:** `src/lib/services/deck-processing.ts:436-592`
**Issue:** The code builds `const updateData: Record<string, unknown> = {}` and assigns computed keys like `updateData[\`${outcome.type}Status\`]`, then casts the final object to `Prisma.ScheduledDeckUpdateInput`. While the comment on line 578 correctly notes that the keys are closed-union-derived and therefore safe at compile-time, the actual TypeScript checker sees `Record<string, unknown>` during key assignment — so a typo like `outcome.type + "Statuss"` would not be caught at compile time. The existing code is correct, but the type system isn't actively protecting it. This is the same concern raised in the new route (where the fix used `Partial<Prisma.ScheduledDeckCreateInput>` — D-13 pattern). Apply the same pattern here for symmetry.
**Fix:** Change the type declaration to `Partial<Prisma.ScheduledDeckUncheckedUpdateInput>` and drop the final cast:

```ts
const updateData: Partial<Prisma.ScheduledDeckUncheckedUpdateInput> = {};
// ... computed key assignments still work under Partial because Prisma field names are known strings
```

For strict symmetry with the route, cast the assignment site instead:

```ts
(updateData as Record<string, unknown>)[`${outcome.type}Status`] = "ready";
```

Either way, the final `as Prisma.ScheduledDeckUpdateInput` becomes unnecessary.

### WR-06: The DELETE soft-cancel path does not transition per-artifact columns

**File:** `src/app/api/decks/status/[customerId]/route.ts:277-292`
**Issue:** When the user cancels a processing job, the handler sets `status: "failed", errorMessage: "Cancelled by user", completedAt: new Date()` — but per-artifact columns (`deckStatus`, `infographicStatus`, etc.) are untouched. The UI `artifacts` block from the subsequent GET will still report `processing` or `pending` for the cancelled artifacts, contradicting the top-level `failed`. The stuck-job sweep will eventually catch the `processing` ones (after the stale threshold) but `pending` ones stay forever.
**Fix:** In the DELETE soft-cancel block, also flip all non-terminal per-artifact columns to `failed` with the cancellation message. Reuse a shared helper or inline:

```ts
if (deck.status === "processing") {
  const now = new Date();
  const cancelledError = "Cancelled by user";
  await prisma.scheduledDeck.update({
    where: { id: deck.id },
    data: {
      status: "failed",
      errorMessage: cancelledError,
      completedAt: now,
      // Cancel any non-terminal per-artifact columns
      ...(deck.deckStatus === "pending" || deck.deckStatus === "processing"
        ? { deckStatus: "failed", deckError: cancelledError, deckCompletedAt: now }
        : {}),
      ...(deck.infographicStatus === "pending" || deck.infographicStatus === "processing"
        ? { infographicStatus: "failed", infographicError: cancelledError, infographicCompletedAt: now }
        : {}),
      ...(deck.audioStatus === "pending" || deck.audioStatus === "processing"
        ? { audioStatus: "failed", audioError: cancelledError, audioCompletedAt: now }
        : {}),
      ...(deck.reportStatus === "pending" || deck.reportStatus === "processing"
        ? { reportStatus: "failed", reportError: cancelledError, reportCompletedAt: now }
        : {}),
    },
  });
  // ...existing response
}
```

Requires including the per-artifact columns in the `findFirst` select (currently the query uses the default select which includes them).

## Info

### IN-01: New generate-customer-artifacts route strips rich customer data from requestPayload

**File:** `src/app/api/ai/generate-customer-artifacts/route.ts:144-148`
**Issue:** The `requestPayload` only stores `{ id, firstName, lastName }` under `customer`, but `processDeckWithNotebookLM` reads `customer.address?.street`, `customer.property?.type`, `customer.roof?.*`, `customer.insurance?.*`, `customer.scores?.*`, `customer.pipeline?.*` at lines 300-328. Every one of those optional chains silently resolves to `undefined`, producing a very thin `customerDataText` for the notebook. Legacy `/api/decks/schedule` presumably stores a fuller payload. The resulting NotebookLM-generated content will be noticeably lower quality when invoked through the new route.
**Fix:** Either (a) fetch the full customer with property/roof/insurance/scores joins before creating the ScheduledDeck row, or (b) document this as intentional for Phase 8 and mark a Phase 9 TODO. Given the "NotebookLM output is the quality standard" memory note, option (a) is strongly recommended.

### IN-02: `assertCustomerAccess` is called with a double-cast that could mask shape drift

**File:** `src/app/api/ai/generate-customer-artifacts/route.ts:108-115` and `src/app/api/decks/status/[customerId]/route.ts:76, 252`
**Issue:** Both routes call `assertCustomerAccess(session as { user: { id: string; role: string } }, customer)`. This bypasses real type inference — if the NextAuth session type evolves (e.g., `role` becomes optional), the cast will silently hide the regression. Consider a typed helper:
**Fix:** Add a `toAuthorizedSession(session: Session | null): AuthorizedSession | null` helper in `@/lib/auth` that validates at runtime, or thread the already-existing `AuthorizedSession` type back through `getServerSession` via a wrapper.

### IN-03: `recoverStuckDecks` orphan-cleanup query does not handle NULL per-artifact columns consistently

**File:** `src/lib/services/deck-processing.ts:165-200`
**Issue:** The docstring says "A null value counts as terminal (artifact was never requested or was skipped)." However, Prisma's `notIn: ["pending", "processing"]` on a nullable column translates to SQL `col NOT IN (...)` which per three-valued-logic does NOT match NULL rows. So the comment is misleading — the query will NOT include rows where any per-artifact column is NULL. In practice Phase 8 jobs are initialized to `"pending"`/`"skipped"` so this doesn't bite the new flow, but the comment will mislead future readers.
**Fix:** Update the comment to reflect actual behavior, or explicitly add `OR: [{ field: null }, { field: { notIn: [...] } }]` for each column if NULL-as-terminal is really the intent.

### IN-04: `deleteNotebook` in orphan cleanup is not rate-limited per-request

**File:** `src/lib/services/deck-processing.ts:180-198`
**Issue:** Up to 20 sequential `deleteNotebook` calls per sweep — each shells out to the Python CLI. Worst-case, that is ~20 × 2s = 40s added to a status-poll response. The `take: 20` bound is a defense, but one hostile or glitchy sweep can still stall the route. Combined with WR-04's "every poll runs this", this is a latency cliff waiting to happen.
**Fix:** Move orphan cleanup out of the hot path entirely — e.g., run it only in `/api/cron/*` or gate it behind a separate `lastOrphanSweepAt` with a 5-minute interval.

### IN-05: Legacy `slide-deck` string scattered across the codebase

**File:** `src/lib/services/deck-processing.ts:400-414` and `prisma/schema.prisma:753`
**Issue:** The type map `{"slide-deck": "deck", "deck": "deck", ...}` is defined inline in `processDeckWithNotebookLM`. Meanwhile the schema default is `["slide-deck"]`. A second copy of the mapping is implicit in the new route (which skips it by writing canonical types directly). Any future addition of a new artifact type requires updating two different mapping strategies.
**Fix:** Centralize the legacy-to-canonical mapping in `notebooklm/types.ts`:

```ts
export const LEGACY_ARTIFACT_TYPE_MAP: Record<string, ArtifactType> = {
  "slide-deck": "deck",
  "deck": "deck",
  "infographic": "infographic",
  "audio": "audio",
  "report": "report",
};
export function toCanonicalArtifactTypes(legacy: string[]): ArtifactType[] {
  return Array.from(new Set(legacy.map(t => LEGACY_ARTIFACT_TYPE_MAP[t]).filter((t): t is ArtifactType => !!t)));
}
```

### IN-06: Migration does not add indexes on per-artifact status columns

**File:** `prisma/migrations/20260410013527_phase_08_multi_artifact_status/migration.sql:1-14`
**Issue:** `recoverStuckDecks` issues four `updateMany` calls of the form `WHERE {type}Status = 'processing' AND updatedAt < cutoff`. Without a supporting index, each becomes a full table scan. As `ScheduledDeck` grows, and given WR-04 (every poll triggers this), scan cost will compound. Performance is out of Phase 8 v1 scope per the prompt, but flagging for Phase 9+ follow-up.
**Fix:** Add a partial index in a follow-up migration:

```sql
CREATE INDEX IF NOT EXISTS "ScheduledDeck_deckStatus_updatedAt_idx"
  ON "ScheduledDeck" ("updatedAt") WHERE "deckStatus" = 'processing';
-- repeat for infographicStatus, audioStatus, reportStatus
```

### IN-07: `cacheInfographic` call fires only when infographic is requested alone

**File:** `src/lib/services/deck-processing.ts:523-541`
**Issue:** The condition `requestedTypes.includes("infographic") && !requestedTypes.includes("deck")` preserves the pre-refactor infographic-only cache behavior, but multi-artifact jobs that include both deck AND infographic skip the cache. This means a repeat infographic request from the same customer will re-hit NotebookLM after a multi-artifact job, even though the URL is already stored in Supabase. Comment on line 522 acknowledges this is intentional ("preserves the pre-refactor infographic-only cache behavior"), but it's worth noting as a quality regression.
**Fix:** Drop the `!requestedTypes.includes("deck")` condition — cache the infographic URL whenever it was generated, regardless of whether a deck was also produced. The cache key is already scoped to `(customerId, presetId)` so there's no collision risk.

---

_Reviewed: 2026-04-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
